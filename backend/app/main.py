import asyncio
import random
from contextlib import asynccontextmanager, suppress
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import engine, Base, get_db, AsyncSessionLocal
from app.models import Account, Order
from app.schemas import OrderCreate, OrderResponse, PortfolioResponse, TickerInfo, Candle

MARKET_TICKERS = {
    "CHEB": {"name": "Чебупицца Горячая Штучка", "price": 120.50, "change_24h": 14.2},
    "SON": {"name": "Здоровый 8-часовой сон", "price": 15.30, "change_24h": -8.7},
    "SHLYAPA": {"name": "Мужская шляпа", "price": 340.00, "change_24h": 3.1},
    "PIVO": {"name": "Холодное светлое", "price": 85.00, "change_24h": 5.4},
    "HYPE": {"name": "Хайп и флекс", "price": 1000.00, "change_24h": -18.9},
}

async def simulate_market_prices():
    """Фоновый воркер: генерирует живые колебания цен активов на бирже."""
    while True:
        try:
            await asyncio.sleep(2)
            for ticker, data in MARKET_TICKERS.items():
                volatility = random.uniform(-0.015, 0.018)
                new_price = round(max(0.5, data["price"] * (1 + volatility)), 2)
                data["price"] = new_price
                data["change_24h"] = round(data["change_24h"] + random.uniform(-0.2, 0.2), 1)
        except asyncio.CancelledError:
            break

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

    ticker_task = asyncio.create_task(simulate_market_prices())
    yield
    ticker_task.cancel()
    with suppress(asyncio.CancelledError):
        await ticker_task

app = FastAPI(title="MemeView API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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
    current_price = MARKET_TICKERS[ticker_upper]["price"]
    candles = []
    current_time = datetime.now(timezone.utc) - timedelta(minutes=60)

    price = current_price * 0.95
    for i in range(59):
        candle_time = current_time + timedelta(minutes=i)
        open_p = price
        delta = random.uniform(-1.5, 1.6)
        close_p = max(0.5, open_p + delta)
        high_p = max(open_p, close_p) + random.uniform(0.1, 1.0)
        low_p = max(0.2, min(open_p, close_p) - random.uniform(0.1, 1.0))

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

    last_time = current_time + timedelta(minutes=59)
    candles.append(
        Candle(
            time=last_time.strftime("%Y-%m-%d %H:%M"),
            open=round(price, 2),
            high=round(max(price, current_price) + 0.5, 2),
            low=round(min(price, current_price) - 0.5, 2),
            close=round(current_price, 2)
        )
    )
    return candles

@app.post("/api/orders", response_model=OrderResponse)
async def create_order(order_in: OrderCreate, db: AsyncSession = Depends(get_db)):
    ticker_upper = order_in.ticker.upper()
    if ticker_upper not in MARKET_TICKERS:
        raise HTTPException(status_code=404, detail="Такого актива нет в бирже.")

    result = await db.execute(select(Account).where(Account.id == 1).with_for_update())
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Аккаунт не найден")
    if account.balance < order_in.amount:
        raise HTTPException(
            status_code=400,
            detail=f"Недостаточно средств! Баланс: ${account.balance:.2f}, нужно ${order_in.amount:.2f}"
        )

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

@app.get("/api/portfolio", response_model=PortfolioResponse)
async def get_portfolio(db: AsyncSession = Depends(get_db)):
    result_acc = await db.execute(select(Account).where(Account.id == 1))
    account = result_acc.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Аккаунт не найден")

    result_orders = await db.execute(select(Order).order_by(Order.created_at.desc()))
    orders = result_orders.scalars().all()
    return PortfolioResponse(balance=round(account.balance, 2), positions=list(orders))

@app.post("/api/orders/{order_id}/close")
async def close_order(order_id: int, db: AsyncSession = Depends(get_db)):
    """Закрытие позиции: расчет итогового PnL по актуальной цене рынка, возврат маржи с профитом на баланс"""
    result_order = await db.execute(select(Order).where(Order.id == order_id))
    order = result_order.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Сделка не найдена")

    result_acc = await db.execute(select(Account).where(Account.id == 1).with_for_update())
    account = result_acc.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Аккаунт не найден")

    current_price = MARKET_TICKERS.get(order.ticker, {}).get("price", order.price)
    price_diff = current_price - order.price if order.side == "BUY" else order.price - current_price
    pnl = (price_diff / order.price) * order.amount * order.leverage
    payout = max(0.0, order.amount + pnl)

    account.balance += payout
    await db.delete(order)
    await db.commit()

    return {
        "message": f"Позиция по ${order.ticker} закрыта",
        "close_price": round(current_price, 2),
        "pnl": round(pnl, 2),
        "payout": round(payout, 2),
        "balance": round(account.balance, 2),
    }

@app.post("/api/reset")
async def reset_demo(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Account).where(Account.id == 1).with_for_update())
    account = result.scalar_one_or_none()
    if account:
        account.balance = 10000.0
    await db.execute(delete(Order))
    await db.commit()

    return {"message": "Баланс успешно сброшен!", "balance": 10000.0}
