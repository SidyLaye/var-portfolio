from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    amount = Column(Float, nullable=False)
    quantile = Column(Float, nullable=False)
    start_date = Column(String(10), nullable=False)
    end_date = Column(String(10), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    last_var_amount = Column(Float, nullable=True)
    last_var_pct = Column(Float, nullable=True)
    last_volatility = Column(Float, nullable=True)

    stocks = relationship(
        "PortfolioStock", back_populates="portfolio", cascade="all, delete-orphan"
    )


class PortfolioStock(Base):
    __tablename__ = "portfolio_stocks"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    ticker = Column(String(20), nullable=False)
    name = Column(String(200), nullable=True)
    weight = Column(Float, nullable=False)
    index_name = Column(String(50), nullable=True)

    portfolio = relationship("Portfolio", back_populates="stocks")
