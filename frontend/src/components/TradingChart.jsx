import React, { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

export default function TradingChart({ ticker, tickerData, candles, isLoading }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0d0e12' },
        textColor: '#71717a',
      },
      grid: {
        vertLines: { color: '#18181b' },
        horzLines: { color: '#18181b' },
      },
      crosshair: {
        vertLine: { color: '#3f3f46', labelBackgroundColor: '#27272a' },
        horzLine: { color: '#3f3f46', labelBackgroundColor: '#27272a' },
      },
      timeScale: {
        borderColor: '#27272a',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#27272a',
      },
      autoSize: true,
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (seriesRef.current && candles && candles.length > 0) {
      const formatted = candles.map(c => ({
        time: Math.floor(new Date(c.time).getTime() / 1000),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })).sort((a, b) => a.time - b.time);

      seriesRef.current.setData(formatted);
      chartRef.current?.timeScale().fitContent();
    }
  }, [candles]);

 
  useEffect(() => {
    if (!seriesRef.current || !candles || candles.length === 0 || !tickerData?.price) return;

    const last = candles[candles.length - 1];
    const newPrice = tickerData.price;
    const candleTime = Math.floor(new Date(last.time).getTime() / 1000);

    seriesRef.current.update({
      time: candleTime,
      open: last.open,
      high: Math.max(last.high, newPrice),
      low: Math.min(last.low, newPrice),
      close: newPrice,
    });
  }, [tickerData?.price, candles]);

  return (
    <div className="flex-1 flex flex-col bg-[#0d0e12] border border-zinc-800 rounded-lg overflow-hidden relative">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/40">
        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-base text-zinc-100">${ticker}</span>
          <span className="text-xs text-zinc-400">{tickerData?.name}</span>
          <span className="font-mono text-sm font-semibold text-emerald-400 ml-2">
            ${tickerData?.price?.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">1M</span>
          <span className="text-zinc-600">|</span>
          <span>Японские свечи (LIVE)</span>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[420px] relative">
        {isLoading && (
          <div className="absolute inset-0 bg-[#0d0e12]/80 flex items-center justify-center z-10">
            <div className="text-xs font-mono text-zinc-400 animate-pulse">Загрузка котировок...</div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full absolute inset-0" />
      </div>
    </div>
  );
}
