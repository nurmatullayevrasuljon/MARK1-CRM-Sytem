const TASHKENT_TIMEZONE = "Asia/Tashkent";

function getTashkentDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TASHKENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const result = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      result[part.type] = Number(part.value);
    }
  }

  return result;
}

function tashkentMidnight(year, month, day) {
  // month: 1-12
  return new Date(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+05:00`,
  );
}

module.exports = { getTashkentDateParts, tashkentMidnight };
