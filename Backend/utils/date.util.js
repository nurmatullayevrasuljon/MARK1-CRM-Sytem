const parseDate = (dateString, endOfDay = false) => {
  const parts = dateString.split("-");

  if (parts.length !== 3) {
    return null;
  }

  const [day, month, year] = parts.map(Number);

  if (
    !day ||
    !month ||
    !year ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }

  return date;
};

module.exports = parseDate;
