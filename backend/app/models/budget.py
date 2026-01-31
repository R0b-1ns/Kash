from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, func, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    tag_id = Column(Integer, ForeignKey("tags.id"), nullable=False, index=True)

    # Month format: "2026-01"
    month = Column(String(7), nullable=False, index=True)
    limit_amount = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="EUR")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    tag = relationship("Tag")
