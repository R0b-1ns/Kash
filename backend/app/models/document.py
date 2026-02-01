from sqlalchemy import Column, Integer, String, DateTime, Date, Time, Numeric, Boolean, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # File info
    file_path = Column(String(500), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_type = Column(String(50))  # image/jpeg, application/pdf, etc.

    # Document type
    doc_type = Column(String(50))  # receipt, invoice, payslip, other

    # Extracted data
    date = Column(Date, index=True)
    time = Column(Time)
    merchant = Column(String(255))
    location = Column(String(255))

    # Financial
    total_amount = Column(Numeric(12, 2))
    currency = Column(String(3), default="EUR")
    is_income = Column(Boolean, default=False)

    # OCR
    ocr_raw_text = Column(Text)
    ocr_confidence = Column(Numeric(5, 2))

    # Processing status (for async upload)
    processing_status = Column(String(20), default="completed")  # pending, processing, completed, error
    processing_error = Column(Text, nullable=True)

    # Recurring documents (subscriptions)
    is_recurring = Column(Boolean, default=False, nullable=False, index=True)
    recurring_frequency = Column(String(20), nullable=True)  # monthly, quarterly, yearly
    recurring_end_date = Column(Date, nullable=True)
    recurring_parent_id = Column(Integer, ForeignKey("documents.id", ondelete="SET NULL"), nullable=True, index=True)

    # Sync status
    synced_to_nas = Column(Boolean, default=False)
    synced_at = Column(DateTime(timezone=True))

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    items = relationship("Item", back_populates="document", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary="document_tags", back_populates="documents")

    # Self-referential relationship for recurring documents
    recurring_parent = relationship("Document", remote_side=[id], foreign_keys=[recurring_parent_id])
    recurring_children = relationship("Document", foreign_keys=[recurring_parent_id])
