"""
Authentication API - مع دعم تعدد المستخدمين
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/2fa/enable
POST /api/auth/2fa/verify
GET  /api/auth/me
GET  /api/auth/users  # فقط للمديرين
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional, List
import secrets
import hashlib

from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.core.config import settings
from app.core.security import (
    hash_password, verify_password,
    create_access_token,
    generate_refresh_token, hash_refresh_token,
    get_current_user,
    get_current_admin,  # جديد: للمديرين فقط
)
from app.models.project import User, UserRole, Project, ProjectInvitation

router = APIRouter(prefix="/auth", tags=["Auth"])

# ============================================================
# Schemas
# ============================================================
class RegisterIn(BaseModel):
    email: EmailStr
    full_name: str
    password: str = Field(..., min_length=8)
    language: str = "ar"
    company_name: Optional[str] = None
    phone: Optional[str] = None

class LoginIn(BaseModel):
    username: str
    password: str
    totp_code: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    language: str
    is_active: bool
    totp_enabled: bool = False
    company_name: Optional[str] = None
    phone: Optional[str] = None
    max_projects: int
    
    class Config:
        from_attributes = True

class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut

class RefreshIn(BaseModel):
    refresh_token: str

# ============================================================
# Helper: Refresh Token (Redis)
# ============================================================
async def _store_refresh_token(user_id: int, hashed: str, ip: str):
    try:
        import redis.asyncio as aioredis
        r = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await r.setex(f"rt:{hashed}", 30 * 86400, str(user_id))
        # تخزين IP المرتبط بالتوكن للأمان
        await r.setex(f"rt_ip:{hashed}", 30 * 86400, ip)
    except Exception:
        pass

async def _revoke_refresh_token(hashed: str):
    try:
        import redis.asyncio as aioredis
        r = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await r.delete(f"rt:{hashed}")
        await r.delete(f"rt_ip:{hashed}")
    except Exception:
        pass

async def _validate_refresh_token(hashed: str) -> Optional[int]:
    try:
        import redis.asyncio as aioredis
        r = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        val = await r.get(f"rt:{hashed}")
        return int(val) if val else None
    except Exception:
        return None

# ============================================================
# Endpoints
# ============================================================
@router.post("/register", response_model=UserOut, status_code=201)
async def register(body: RegisterIn, db: AsyncSession = Depends(get_db)):
    # التحقق من وجود البريد
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # إنشاء المستخدم
    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        language=body.language,
        company_name=body.company_name,
        phone=body.phone,
        role=UserRole.engineer,  # افتراضياً مهندس
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/login", response_model=TokenOut)
async def login(body: LoginIn, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    
    # 2FA
    if user.totp_enabled and user.totp_secret:
        if not body.totp_code:
            raise HTTPException(status_code=401, detail="2FA code required")
        import pyotp
        if not pyotp.TOTP(user.totp_secret).verify(body.totp_code, valid_window=1):
            raise HTTPException(status_code=401, detail="Invalid 2FA code")
    
    # إنشاء التوكنات
    access_token = create_access_token(user.id)
    raw_refresh, hashed_refresh = generate_refresh_token()
    ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "")
    await _store_refresh_token(user.id, hashed_refresh, ip)
    
    return TokenOut(
        access_token=access_token,
        refresh_token=raw_refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserOut.model_validate(user),
    )

@router.post("/refresh", response_model=TokenOut)
async def refresh(body: RefreshIn, db: AsyncSession = Depends(get_db)):
    hashed = hash_refresh_token(body.refresh_token)
    user_id = await _validate_refresh_token(hashed)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    
    await _revoke_refresh_token(hashed)
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found")
    
    new_access = create_access_token(user.id)
    raw_new, hashed_new = generate_refresh_token()
    await _store_refresh_token(user.id, hashed_new, "")
    
    return TokenOut(
        access_token=new_access,
        refresh_token=raw_new,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserOut.model_validate(user),
    )

@router.post("/logout")
async def logout(body: RefreshIn, current_user: User = Depends(get_current_user)):
    hashed = hash_refresh_token(body.refresh_token)
    await _revoke_refresh_token(hashed)
    return {"status": "logged out"}

@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user

# ============================================================
# نقاط API للمديرين فقط (Admin Only)
# ============================================================
@router.get("/users", response_model=List[UserOut])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    admin: User = Depends(get_current_admin),  # فقط المديرين
    db: AsyncSession = Depends(get_db),
):
    """عرض جميع المستخدمين - فقط للمديرين"""
    result = await db.execute(
        select(User).offset(skip).limit(limit).order_by(User.created_at.desc())
    )
    return result.scalars().all()

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    role: UserRole,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """تغيير دور المستخدم - فقط للمديرين"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.role = role
    await db.commit()
    return {"status": "updated", "user_id": user_id, "role": role}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """حذف مستخدم - فقط للمديرين"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    await db.delete(user)
    await db.commit()
    return {"status": "deleted", "user_id": user_id}