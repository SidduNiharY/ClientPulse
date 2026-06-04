import type { DateRange } from "@/server/connectors/types";

function parseUtcDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtcDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getWeeklyRange(selectedDate: string): DateRange {
  const date = parseUtcDate(selectedDate);
  const dayOfWeek = date.getUTCDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(date);

  monday.setUTCDate(date.getUTCDate() - daysFromMonday);

  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);

  return {
    from: formatUtcDate(monday),
    to: formatUtcDate(sunday)
  };
}

export function getMonthlyRange(selectedDate: string): DateRange {
  const date = parseUtcDate(selectedDate);
  const firstDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
  );
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
  );

  return {
    from: formatUtcDate(firstDay),
    to: formatUtcDate(lastDay)
  };
}
