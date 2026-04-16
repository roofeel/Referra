export function startOfDay(dateInput: string) {
  const value = dateInput.trim();
  if (!value) return null;
  const parsed = Date.parse(`${value}T00:00:00`);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}

export function endOfDay(dateInput: string) {
  const value = dateInput.trim();
  if (!value) return null;
  const parsed = Date.parse(`${value}T23:59:59.999`);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}
