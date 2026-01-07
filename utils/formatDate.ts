export function formatDate(dateValue: string | number | Date) {
  if (!dateValue) return '-';

  const date = new Date(dateValue);

  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
