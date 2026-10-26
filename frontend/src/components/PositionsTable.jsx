import React from 'react';

export default function PositionsTable({ positions = [], tickers = {}, onClosePosition }) {
  const priceMap = Array.isArray(tickers)
    ? tickers.reduce((acc, t) => ({ ...acc, [t.ticker]: t.price }), {})
    : {};

  return (
    <div className="bg-[#0d0e12] border border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-zinc-300">
          Открытые позиции ({positions.length})
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-zinc-900/60 text-zinc-400 border-b border-zinc-800">
            <tr>
              <th className="py-2.5 px-4 font-normal">Тикер</th>
              <th className="py-2.5 px-4 font-normal">Тип</th>
              <th className="py-2.5 px-4 font-normal">Плечо</th>
              <th className="py-2.5 px-4 font-normal">Маржа ($)</th>
              <th className="py-2.5 px-4 font-normal">Вход</th>
              <th className="py-2.5 px-4 font-normal">Рынок</th>
              <th className="py-2.5 px-4 font-normal">PnL ($)</th>
              <th className="py-2.5 px-4 font-normal text-right">Действие</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
            {positions.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-8 text-center text-zinc-500">
                  Нет открытых позиций. Самое время зайти в Чебупиццу на всю котлету! 🚀
                </td>
              </tr>
            ) : (
              positions.map((pos) => {
                const currentPrice = priceMap[pos.ticker] || pos.price;
                const priceDiff = currentPrice - pos.price;
                const rawPnl = pos.side === 'BUY' ? priceDiff : -priceDiff;
                const pnl = (rawPnl / pos.price) * pos.amount * pos.leverage;
                const isPositive = pnl >= 0;

                return (
                  <tr key={pos.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-zinc-100">${pos.ticker}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        pos.side === 'BUY' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}>
                        {pos.side}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-zinc-400">x{pos.leverage}</td>
                    <td className="py-2.5 px-4">${pos.amount.toFixed(2)}</td>
                    <td className="py-2.5 px-4">${pos.price.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-zinc-300">${currentPrice.toFixed(2)}</td>
                    <td className={`py-2.5 px-4 font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? '+' : ''}${pnl.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => onClosePosition(pos.id)}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-mono transition-colors border border-zinc-700 shadow-sm"
                      >
                        Закрыть
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
