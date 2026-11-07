/** Formats an ISO date string like "Sep 25, 2026". */
export function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Shortens text to `length` characters, adding an ellipsis. */
export function excerpt(text, length = 140) {
  if (!text) return ''
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text
}
