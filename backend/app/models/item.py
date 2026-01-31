from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, func, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)

    name = Column(String(255), nullable=False)
    quantity = Column(Numeric(10, 3), default=1)
    unit = Column(String(50))  # kg, L, piece, etc.
    unit_price = Column(Numeric(12, 2))
    total_price = Column(Numeric(12, 2))

    # Optional categorization at item level
    category = Column(String(100))

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    document = relationship("Document", back_populates="items")
