import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app, MARKET_TICKERS
from app.database import Base, get_db
from app.models import Account

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

async def override_get_db():
    async with TestSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
async def setup_link_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with TestSessionLocal() as session:
        session.add(Account(id=1, balance=10000.0))
        await session.commit()

    yield

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.mark.asyncio
async def test_get_tickers():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/tickers")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 5
        assert any(t["ticker"] == "CHEB" for t in data)

@pytest.mark.asyncio
async def test_get_chart_and_not_found():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res_ok = await client.get("/api/chart/cheb")
        assert res_ok.status_code == 200
        assert len(res_ok.json()) == 60

        res_fail = await client.get("/api/chart/UNKNOWN")
        assert res_fail.status_code == 404

@pytest.mark.asyncio
async def test_order_creation_and_balance_deduction():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        order_payload = {"ticker": "CHEB", "side": "BUY", "amount": 1000.0, "leverage": 10}
        response = await client.post("/api/orders", json=order_payload)
        assert response.status_code == 200
        order_data = response.json()
        assert order_data["ticker"] == "CHEB"
        assert order_data["amount"] == 1000.0

        port_res = await client.get("/api/portfolio")
        assert port_res.status_code == 200
        port_data = port_res.json()
        assert port_data["balance"] == 9000.0
        assert len(port_data["positions"]) == 1

@pytest.mark.asyncio
async def test_insufficient_funds_rejected():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        order_payload = {"ticker": "PIVO", "side": "BUY", "amount": 50000.0, "leverage": 1}
        response = await client.post("/api/orders", json=order_payload)
        assert response.status_code == 400
        assert "Недостаточно средств" in response.json()["detail"]

@pytest.mark.asyncio
async def test_reset_demo():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post("/api/orders", json={"ticker": "SON", "side": "SELL", "amount": 2000.0})
        reset_res = await client.post("/api/reset")
        assert reset_res.status_code == 200

        port_res = await client.get("/api/portfolio")
        assert port_res.json()["balance"] == 10000.0
        assert len(port_res.json()["positions"]) == 0

@pytest.mark.asyncio
async def test_close_order_and_payout():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        MARKET_TICKERS["CHEB"]["price"] = 100.0
        res = await client.post("/api/orders", json={"ticker": "CHEB", "side": "BUY", "amount": 1000.0, "leverage": 2})
        order_id = res.json()["id"]

        MARKET_TICKERS["CHEB"]["price"] = 110.0

        close_res = await client.post(f"/api/orders/{order_id}/close")
        assert close_res.status_code == 200
        close_data = close_res.json()
        assert close_data["pnl"] == 200.0
        assert close_data["payout"] == 1200.0
        assert close_data["balance"] == 10200.0

        port_res = await client.get("/api/portfolio")
        assert port_res.json()["balance"] == 10200.0
        assert len(port_res.json()["positions"]) == 0

        not_found_res = await client.post(f"/api/orders/{order_id}/close")
        assert not_found_res.status_code == 404
