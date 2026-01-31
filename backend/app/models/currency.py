from sqlalchemy import Column, Integer, String, Numeric, DateTime, func
from app.core.database import Base


class Currency(Base):
    __tablename__ = "currencies"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(3), unique=True, nullable=False, index=True)  # EUR, USD, GBP
    name = Column(String(100), nullable=False)
    symbol = Column(String(5), nullable=False)  # €, $, £
    rate_to_eur = Column(Numeric(12, 6), default=1.0)  # Exchange rate to EUR

    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
