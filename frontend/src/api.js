const API_BASE = "http://localhost:8000/api";

export async function fetchTickers() {
  const res = await fetch(`${API_BASE}/tickers`);
  if (!res.ok) throw new Error("Ошибка загрузки котировок");
  return res.json();
}

export async function fetchChart(ticker) {
  const res = await fetch(`${API_BASE}/chart/${ticker}`);
  if (!res.ok) throw new Error("Ошибка загрузки графика");
  return res.json();
}

export async function fetchPortfolio() {
  const res = await fetch(`${API_BASE}/portfolio`);
  if (!res.ok) throw new Error("Ошибка загрузки портфеля");
  return res.json();
}

export async function createOrder(orderData) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData),
  });
  
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Не удалось создать ордер');
  }
  return data;
}

export async function resetDemo() {
  const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Ошибка сброса счета');
  return res.json();
}

