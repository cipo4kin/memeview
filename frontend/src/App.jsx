import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import TradingChart from './components/TradingChart';
import OrderForm from './components/OrderForm';
import PositionsTable from './components/PositionsTable';
import { fetchTickers, fetchChart, fetchPortfolio, createOrder, resetDemo } from './api';

export default function App() {
  const [tickers, setTickers] = useState([]);
  const [activeTicker, setActiveTicker] = useState('CHEB');
  const [candles, setCandles] = useState([]);
  const [portfolio, setPortfolio] = useState({ balance: 10000.0, positions: [] });
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    loadTickers();
    loadPortfolioData();
  }, []);

  useEffect(() => {
    if (activeTicker) {
      loadChartData(activeTicker);
    }
  }, [activeTicker]);

  const loadTickers = async () => {
    try {
      const data = await fetchTickers();
      setTickers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadPortfolioData = async () => {
    try {
      const data = await fetchPortfolio();
      setPortfolio(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadChartData = async (ticker) => {
    setChartLoading(true);
    try {
      const data = await fetchChart(ticker);
      setCandles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setChartLoading(false);
    }
  };

  const handleOrderSubmit = async (orderData) => {
    await createOrder(orderData);
    await loadPortfolioData();
  };

  const handleReset = async () => {
    if (window.confirm('Сбросить баланс обратно до $10,000.00 и очистить сделки?')) {
      try {
        await resetDemo();
        await loadPortfolioData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const activeTickerData = tickers.find((t) => t.ticker === activeTicker);

  return (
    <div className="min-h-screen bg-[#090a0d] text-zinc-100 flex flex-col font-sans">
      <Header
        tickers={tickers}
        activeTicker={activeTicker}
        onSelectTicker={setActiveTicker}
        balance={portfolio.balance}
        onReset={handleReset}
      />

      <main className="flex-1 p-3 md:p-4 flex flex-col gap-3 max-w-[1700px] w-full mx-auto">
        <div className="flex-1 flex flex-col lg:flex-row gap-3">
          <TradingChart
            ticker={activeTicker}
            tickerData={activeTickerData}
            candles={candles}
            isLoading={chartLoading}
          />

          <OrderForm
            activeTicker={activeTicker}
            tickerData={activeTickerData}
            balance={portfolio.balance}
            onOrderSubmit={handleOrderSubmit}
          />
        </div>

        <PositionsTable
          positions={portfolio.positions}
          tickers={tickers}
        />
      </main>

      <footer className="border-t border-zinc-900 py-2.5 px-4 text-center text-xs font-mono text-zinc-600">
        MemeView Terminal • FastAPI (Async) + PostgreSQL + React + Vite + Tailwind • Demo Trading
      </footer>
    </div>
  );
}

}