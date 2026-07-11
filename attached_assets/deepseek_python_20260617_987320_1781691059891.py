import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base

# ============================================================
# أدوار المستخدمين
# ============================================================
class UserRole(str, enum.Enum):
    admin = "admin"       # مدير كامل الصلاحيات
    engineer = "engineer" # مهندس - يرى مشاريعه فقط
    viewer = "viewer"     # مشاهد - يرى فقط ولا يعدل

# ============================================================
# نموذج المستخدم
# ============================================================
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.engineer)
    language = Column(String, default="ar")
    is_active = Column(Boolean, default=True)
    totp_secret = Column(String, nullable=True)
    totp_enabled = Column(Boolean, default=False)
    
    # إضافات لتعدد المستخدمين
    company_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    max_projects = Column(Integer, default=10)  # الحد الأقصى للمشاريع
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")

# ============================================================
# حالة المشروع
# ============================================================
class ProjectStatus(str, enum.Enum):
    active = "active"
    warning = "warning"
    critical = "critical"
    inactive = "inactive"
    archived = "archived"  # مشروع مؤرشف

# ============================================================
# نموذج المشروع
# ============================================================
class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, default="")
    location_name = Column(String, default="")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.active)
    
    # ربط المشروع بالمستخدم
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # إضافات لتعدد المستخدمين
    is_public = Column(Boolean, default=False)  # مشروع عام (للجميع) أم خاص
    shared_with = Column(String, default="[]")  # قائمة المستخدمين المشاركين (JSON)
    project_code = Column(String, unique=True, nullable=True)  # كود فريد للمشروع
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # العلاقات
    owner = relationship("User", back_populates="projects")
    sensors = relationship("Sensor", back_populates="project", cascade="all, delete-orphan")
    alert_config = relationship("AlertConfig", back_populates="project", uselist=False, cascade="all, delete-orphan")
    alerts = relationship("AlertHistory", back_populates="project", cascade="all, delete-orphan")
    
    # قيد فريد: مشروع واحد لكل مستخدم بنفس الاسم
    __table_args__ = (
        UniqueConstraint('owner_id', 'name', name='uq_project_owner_name'),
    )

# ============================================================
# نموذج المشاركة (دعوة مستخدمين إلى مشروع)
# ============================================================
class ProjectInvitation(Base):
    __tablename__ = "project_invitations"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    invited_email = Column(String, nullable=False)
    invited_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, default="viewer")  # engineer, viewer
    status = Column(String, default="pending")  # pending, accepted, rejected
    token = Column(String, unique=True, nullable=False)  # رمز الدعوة الفريد
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    project = relationship("Project")
    inviter = relationship("User", foreign_keys=[invited_by])