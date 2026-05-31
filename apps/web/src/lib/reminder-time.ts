function hasReminderIntent(text: string) {
  return /\b(remind|reminder|remember to|deadline|due|follow up|follow-up)\b/i.test(text);
}

function applyClockWords(lower: string, result: Date) {
  if (/\b(day ends|end of day|eod)\b/.test(lower)) {
    result.setHours(23, 59, 0, 0);
    return true;
  }
  if (/\btonight\b/.test(lower)) {
    result.setHours(21, 0, 0, 0);
    return true;
  }
  if (/\bmorning\b/.test(lower)) {
    result.setHours(9, 0, 0, 0);
    return true;
  }
  if (/\bafternoon\b/.test(lower)) {
    result.setHours(13, 0, 0, 0);
    return true;
  }
  if (/\bevening\b/.test(lower)) {
    result.setHours(18, 0, 0, 0);
    return true;
  }
  return false;
}

function normalizeMeridiem(value?: string) {
  if (!value) return undefined;
  return value.replace(/\./g, "").toLowerCase() as "am" | "pm";
}

function applyTime(text: string, result: Date) {
  const lower = text.toLowerCase();
  const explicitWithMeridiem = lower.match(
    /\b(?:at|by|before|around)?\s*(?:the\s+)?(\d{1,2})(?:(?::|\.)(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b/i,
  );
  const explicitWithSeparator =
    explicitWithMeridiem ??
    lower.match(/\b(?:at|by|before|around)\s+(?:the\s+)?(\d{1,2})(?::|\.)(\d{2})\b/i);
  const explicitHour =
    explicitWithSeparator ??
    lower.match(/\b(?:at|by|before|around)\s+(?:the\s+)?(\d{1,2})\b/i);

  const match = explicitWithMeridiem ?? explicitWithSeparator ?? explicitHour;
  if (match) {
    let hour = Number(match[1]);
    const minute = Number(match[2] ?? 0);
    const meridiem = normalizeMeridiem(match[3]);
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      result.setHours(hour, minute, 0, 0);
      return true;
    }
  }

  return applyClockWords(lower, result);
}

export function extractReminderDueDate(text: string, baseIso?: string): string | undefined {
  const lower = text.toLowerCase();
  if (!hasReminderIntent(text)) return undefined;

  const base = baseIso ? new Date(baseIso) : new Date();
  if (Number.isNaN(base.getTime())) return undefined;

  const result = new Date(base);
  const explicitToday = /\btoday\b/.test(lower);
  const explicitTomorrow = /\btomorrow\b/.test(lower);
  if (explicitTomorrow) result.setDate(result.getDate() + 1);

  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const weekday = weekdays.findIndex((day) => lower.includes(day));
  if (weekday >= 0) {
    const diff = (weekday + 7 - result.getDay()) % 7 || 7;
    result.setDate(result.getDate() + diff);
  }

  const isoDate = lower.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];
  if (isoDate) {
    const [year, month, day] = isoDate.split("-").map(Number);
    result.setFullYear(year!, month! - 1, day);
  }

  const hasExplicitTime = applyTime(text, result);
  if (!hasExplicitTime) {
    result.setHours(explicitToday ? 23 : 9, explicitToday ? 59 : 0, 0, 0);
  }

  const hasExplicitDate = explicitToday || explicitTomorrow || Boolean(isoDate) || weekday >= 0;
  if (result.getTime() <= base.getTime() && !hasExplicitDate) {
    result.setDate(result.getDate() + 1);
  }

  return result.toISOString();
}
