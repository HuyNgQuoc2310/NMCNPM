export function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

export function getCurrentTimeValue() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} VND`;
}
