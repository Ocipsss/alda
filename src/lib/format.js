import { CURRENCY, CURRENCY_LOCALE, DATE_LOCALE } from '../constants/app'

const _currencyFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  maximumFractionDigits: 0
})

const _dateFormatter = new Intl.DateTimeFormat(DATE_LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
})

export function formatCurrency(value) {
  return _currencyFormatter.format(Number(value || 0))
}

export function formatDate(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return _dateFormatter.format(d)
}

export function formatDateISO(date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}