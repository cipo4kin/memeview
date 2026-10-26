import random
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import engine, Base, get_db, AsyncSessionLocal
from app.models import Account, Order
from app.schemas import OrderCreate, OrderResponce, PortfolioResponce, TickerInfo, Candle

MARKET_TICKERS = {
    "CHEB": {"name": "Чебупицца Горячая Штучка", "price": 120.50, "change_24h": 14.2},
    "SON": {"name": "Здоровый 8-часовой сон", "price": 15.30, "change_24h": -8.7},
    "SHLYAPA": {"name": "Мужская шляпа", "price": 340.00, "change_24h": 3.1},
    "PIVO": {"name": "Холодное светлое", "price": 85.00, "change_24h": 5.4},
    "HYPE": {"name": "Хайп и флекс", "price": 1000.00, "change_24h": -18.9},
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Account).where(Account.id == 1))
        account = result.scalar_one_or_none()
        if not account:
            session.add(Account(id=1, balance=10000.0))
            await session.commit()
    yield
app = FastAPI(title="MemeView API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/api/tickers", response_model=list[TickerInfo])
async def get_tickers():
    return [
        TickerInfo(
            ticker=ticker,
            name=data["name"],
            price=data["price"],
            change_24h=data["change_24h"]
        )
        for ticker, data in MARKET_TICKERS.items()
    ]
@app.get("/api/chart/{ticker}", response_model=list[Candle])
async def get_chart(ticker: str):
    ticker_upper = ticker.upper()
    if ticker_upper not in MARKET_TICKERS:
        raise HTTPException(status_code=404, detail="Тикер не найден")
    base_price = MARKET_TICKERS[ticker_upper]["price"]
    candles = []
    current_time = datetime.now(timezone.utc) - timedelta(minutes=60)

    price = base_price * 0.95
    for i in range(60):
        candle_time = current_time + timedelta(minutes=i)
        open_p = price
        delta = random.uniform(-2.0, 2.2)
        close_p = max(1.0, open_p + delta)
        high_p = max(open_p, close_p) + random.uniform(0.1, 1.5)
        low_p = max(0.5, min(open_p, close_p) - random.uniform(0.1, 1.5))

        candles.append(
            Candle(
                time=candle_time.strftime("%Y-%m-%d %H:%M"),
                open=round(open_p, 2),
                high=round(high_p, 2),
                low=round(low_p, 2),
                close=round(close_p, 2)
            )
        )
        price = close_p
    return candles
@app.post("/api/orders", response_model=OrderResponce)
async def create_order(order_in: OrderCreate, db: AsyncSession = Depends(get_db)):
    ticker_upper = order_in.ticker.upper()
    if ticker_upper not in MARKET_TICKERS:
        raise HTTPException(status_code=404, detail="Такого актива нет в бирже.")

    result = await db.execute(select(Account).where(Account.id == 1))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Аккаунт не найден")
    if account.balance < order_in.amount:
        raise HTTPException(status_code=400, detail=f"Недостаточно средств! Баланс: ${account.balance:.2f}, нужно ${order_in.amount:.2f}")

    account.balance -= order_in.amount

    current_price = MARKET_TICKERS[ticker_upper]["price"]
    new_order = Order(
        ticker=ticker_upper,
        side=order_in.side,
        amount=order_in.amount,
        price=current_price,
        leverage=order_in.leverage
    )
    db.add(new_order)
    await db.commit()
    await db.refresh(new_order)

    return new_order

@app.get("/api/portfolio", response_model=PortfolioResponce)
async def get_portfolio(db: AsyncSession = Depends(get_db)):
    result_acc = await db.execute(select(Account).where(Account.id == 1))
    account = result_acc.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Аккаунт не найден")

    result_orders = await db.execute(select(Order).order_by(Order.created_at.desc()))
    orders = result_orders.scalars().all()
    return PortfolioResponce(balance=round(account.balance, 2), positions=list(orders))
@app.post("/api/reset")
async def reset_demo(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Account).where(Account.id == 1))
    account = result.scalar_one_or_none()
    if account:
        account.balance = 10000.0
    await db.execute(delete(Order))
    await db.commit()

    return {"message": "Баланс успешно сброшен!", "balance": 10000.0}

