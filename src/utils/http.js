export function positiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, max);
}

export function normalizeSortDirection(value) {
  return String(value || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
}
