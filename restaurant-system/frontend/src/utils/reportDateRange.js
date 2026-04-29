import { getTodayDateValue } from "./formatters";

const vietnameseDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric"
});

export function getMonthStartValue() {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

export function getDefaultReportRange() {
  return {
    start_date: getMonthStartValue(),
    end_date: getTodayDateValue()
  };
}

export function formatDateLabel(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : vietnameseDateFormatter.format(date);
}
