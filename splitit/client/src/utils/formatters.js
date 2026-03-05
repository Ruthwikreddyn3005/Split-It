import { format, formatDistanceToNow } from 'date-fns';

export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date) {
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatRelative(date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function initials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function extractError(err) {
  return err?.response?.data?.message || err?.message || 'Something went wrong';
}
