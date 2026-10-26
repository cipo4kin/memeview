import React, { useState } from 'react';

export default function OrderForm({ activeTicker, tickerData, balance, onOrderSubmit }) {
  const [side, setSide] = useState('BUY');
  const [amount, setAmount] = useState('500');
  const [leverage, setLeverage] = useState(10);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const numAmount = parseFloat(amount) || 0;
  const currentPrice = tickerData?.price || 1;
  const positionSize = numAmount * leverage;
  const tokensCount = (positionSize / currentPrice).toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (numAmount <= 0) {
      setError('Сумма сделки должна быть больше $0');
      return;
    }
    if (numAmount > balance) {
      setError(`Не хватает бабок! Баланс: $${balance.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      await onOrderSubmit({
        ticker: activeTicker,
        side,
        amount: numAmount,
        leverage,
      });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full lg:w-80 bg-[#0d0e12] border border-zinc-800 rounded-lg p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-800">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Торговый ордер</span>
          <span className="font-mono font-bold text-sm text-zinc-200">${activeTicker}</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-900 rounded-lg mb-4 border border-zinc-800">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-1.5 rounded text-xs font-bold font-mono transition-all ${
              side === 'BUY' ? 'bg-emerald-500 text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            BUY (Long)
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-1.5 rounded text-xs font-bold font-mono transition-all ${
              side === 'SELL' ? 'bg-rose-500 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            SELL (Short)
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-mono text-zinc-400 mb-1.5">Плечо (Leverage):</label>
          <div className="grid grid-cols-3 gap-2">
            {[1, 10, 100].map((lev) => (
              <button
                key={lev}
                type="button"
                onClick={() => setLeverage(lev)}
                className={`py-1 rounded text-xs font-mono border transition-all ${
                  leverage === lev
                    ? 'bg-zinc-800 text-white border-zinc-500 font-bold'
                    : 'bg-zinc-900/40 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                x{lev} {lev === 100 && '🚀'}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-mono text-zinc-400">Сумма ($):</label>
            <span className="text-[11px] font-mono text-zinc-500">Доступно: ${balance.toFixed(2)}</span>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-zinc-500 font-mono text-xs">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-7 pr-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-zinc-600"
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-4 gap-1 mt-2">
            {[0.25, 0.5, 0.75, 1].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setAmount((balance * pct).toFixed(0))}
                className="py-0.5 text-[10px] font-mono rounded bg-zinc-900 text-zinc-400 border border-zinc-800/60 hover:text-white"
              >
                {pct === 1 ? 'MAX' : `${pct * 100}%`}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-lg space-y-1.5 text-xs font-mono text-zinc-400 mb-4">
          <div className="flex justify-between">
            <span>Маржа (списание):</span>
            <span className="text-zinc-200 font-semibold">${numAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Объем с плечом:</span>
            <span className="text-zinc-200 font-semibold">${positionSize.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Кол-во акций:</span>
            <span className="text-zinc-200 font-semibold">{tokensCount} шт.</span>
          </div>
        </div>

        {error && (
          <div className="p-2.5 mb-4 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className={`w-full py-3 rounded-lg font-mono font-bold text-sm tracking-wide transition-all shadow-lg ${
          side === 'BUY'
            ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/10'
            : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/10'
        } disabled:opacity-50`}
      >
        {loading ? 'ОТПРАВКА...' : side === 'BUY' ? `BUY / LONG $${activeTicker}` : `SELL / SHORT $${activeTicker}`}
      </button>
    </div>
  );
}

}