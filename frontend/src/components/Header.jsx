import React from 'react';
import { TrendingUp, TrendingDown, RotateCcw, Wallet } from 'lucide-react';

export default function Header({ tickers, activeTicker, onSelectTicker, balance, onReset }) {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur px-4 py-2.5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📈</span>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              MemeView
            </span>
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              DEMO
            </span>
          </div>

          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-zinc-800">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <div className="text-sm">
              <span className="text-zinc-400 text-xs mr-1.5 font-mono">Баланс:</span>
              <span className="font-mono font-bold text-emerald-400">
                ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            
            <button
              onClick={onReset}
              title="Сбросить демо-счет до $10,000"
              className="ml-2 p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {tickers.map((t) => {
            const isSelected = t.ticker === activeTicker;
            const isPositive = t.change_24h >= 0;

            return (
              <button
                key={t.ticker}
                onClick={() => onSelectTicker(t.ticker)}
                className={`flex items-center gap-2 px-2.5 py-1 rounded text-xs font-mono transition-all border ${
                  isSelected
                    ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <span className="font-bold">${t.ticker}</span>
                <span className="text-zinc-300">${t.price.toFixed(2)}</span>
                <span className={`flex items-center text-[11px] ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                  {isPositive ? '+' : ''}{t.change_24h}%
                </span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}

