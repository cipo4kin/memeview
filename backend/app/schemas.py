from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict

class OrderCreate(BaseModel):
    ticker: str = Field(..., examples=["CHEB"])
    side: Literal["BUY", "SELL"] = Field(..., description="BUY (Long) или SELL (Short)")
    amount: float = Field(..., gt=0, description="Сумма сделки в долларах должна быть больше 0")
    leverage: int = Field(default=1, ge=1, le=100, description="Плечо от 1 до 100")

class OrderResponce(BaseModel):
    id: int
    ticker: str
    side: str
    amount: float
    price: float
    leverage: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PortfolioResponce(BaseModel):
    balance: float
    positions: list[OrderResponce]

class TickerInfo(BaseModel):
    ticker: str
    name: str
    price: float
    change_24h: float

class Candle(BaseModel):
    time: str
    open: float
    high: float
    low: float
    close: float
