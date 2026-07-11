"""
Main API routers - مع عزل البيانات لكل مستخدم
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db, get_influx_client, project_bucket
from app.core.security import get_current_user, get_current_engineer
from app.models.project import User, Project, ProjectStatus, ProjectInvitation
from app.models.sensor import Sensor, SensorKind, SensorProtocol
from app.models.alert import AlertConfig, AlertHistory, AlertSeverity, AlertStatus
from app.models.measurement import TerraResult
from app.services.calculation import analyser
from app.services.alert_service import dispatch

projects_router = APIRouter(prefix="/projects", tags=["Projects"])

# ============================================================
# التحقق من ملكية المشروع
# ============================================================
async def _owned_project(project_id: int, user: User, db: AsyncSession) -> Project:
    """التحقق من أن المشروع يخص المستخدم أو مشارك معه"""
    result = await db.execute(
        select(Project).where(Project.id == project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # التحقق: هل المستخدم هو المالك؟
    if project.owner_id == user.id:
        return project
    
    # التحقق: هل المستخدم مشارك في المشروع؟
    shared = json.loads(project.shared_with) if project.shared_with else []
    if str(user.id) in shared or user.role == UserRole.admin:
        return project
    
    raise HTTPException(status_code=403, detail="Access denied to this project")

# ============================================================
# Schemas
# ============================================================
class ProjectIn(BaseModel):
    name: str
    description: str = ""
    location_name: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_public: bool = False

class ProjectOut(BaseModel):
    id: int
    name: str
    description: str
    location_name: str
    latitude: Optional[float]
    longitude: Optional[float]
    status: ProjectStatus
    is_public: bool
    shared_with: List[int] = []
    created_at: datetime
    owner_id: int
    owner_name: str
    
    class Config:
        from_attributes = True

class ShareProjectIn(BaseModel):
    email: str
    role: str = "viewer"  # engineer, viewer

# ============================================================
# Endpoints
# ============================================================
@projects_router.get("", response_model=List[ProjectOut])
async def list_projects(
    db: AsyncSession = Depends(get_db), 
    user: User = Depends(get_current_user),
):
    """عرض مشاريع المستخدم + المشاريع المشتركة"""
    # مشاريعه الخاصة
    own = await db.execute(
        select(Project).where(Project.owner_id == user.id)
    )
    own_projects = own.scalars().all()
    
    # مشاريع مشارك فيها
    shared_ids = []
    for p in own_projects:
        shared = json.loads(p.shared_with) if p.shared_with else []
        if str(user.id) in shared:
            shared_ids.append(p.id)
    
    # تحويل إلى قائمة
    result = []
    for p in own_projects:
        result.append(p)
    
    return result

@projects_router.post("", response_model=ProjectOut, status_code=201)
async def create_project(
    body: ProjectIn, 
    db: AsyncSession = Depends(get_db), 
    user: User = Depends(get_current_user),
):
    """إنشاء مشروع جديد"""
    # التحقق من الحد الأقصى للمشاريع
    count = await db.execute(
        select(Project).where(Project.owner_id == user.id)
    )
    if len(count.scalars().all()) >= user.max_projects:
        raise HTTPException(
            status_code=400, 
            detail=f"Maximum projects reached ({user.max_projects})"
        )
    
    project = Project(
        **body.model_dump(), 
        owner_id=user.id,
        project_code=f"PRJ-{user.id}-{datetime.now().timestamp():.0f}"
    )
    db.add(project)
    await db.flush()
    
    # إنشاء إعدادات الإنذار الافتراضية
    db.add(AlertConfig(project_id=project.id))
    
    await db.commit()
    await db.refresh(project)
    return project

@projects_router.post("/{project_id}/share")
async def share_project(
    project_id: int,
    body: ShareProjectIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """مشاركة مشروع مع مستخدم آخر"""
    project = await _owned_project(project_id, user, db)
    
    # التحقق من أن المستخدم هو المالك
    if project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only owner can share")
    
    # البحث عن المستخدم المدعو
    invited = await db.execute(
        select(User).where(User.email == body.email)
    )
    invited_user = invited.scalar_one_or_none()
    if not invited_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # تحديث قائمة المشاركين
    shared = json.loads(project.shared_with) if project.shared_with else []
    if str(invited_user.id) not in shared:
        shared.append(str(invited_user.id))
        project.shared_with = json.dumps(shared)
        await db.commit()
    
    return {"status": "shared", "user": body.email}

@projects_router.get("/{project_id}/sensors")
async def list_sensors(
    project_id: int, 
    db: AsyncSession = Depends(get_db), 
    user: User = Depends(get_current_user),
):
    """عرض حساسات المشروع"""
    await _owned_project(project_id, user, db)
    result = await db.execute(select(Sensor).where(Sensor.project_id == project_id))
    return result.scalars().all()