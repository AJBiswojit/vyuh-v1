/* Shared form validation. Every form in the application validates through these
   helpers so error copy and rules stay consistent. */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const PHONE_PATTERN = /^[+]?[\d\s-]{8,16}$/

export function isEmail(value) {
  return EMAIL_PATTERN.test(String(value || '').trim())
}

export function isPhone(value) {
  return PHONE_PATTERN.test(String(value || '').trim())
}

export function validatePassword(password, policy = {}) {
  const value = String(password || '')
  const minLength = policy?.passwordMinLength ?? 8
  if (value.length < minLength) return `Password must be at least ${minLength} characters.`
  if (policy?.requireUppercase && !/[A-Z]/.test(value)) return 'Password must include an uppercase letter.'
  if (policy?.requireNumber && !/\d/.test(value)) return 'Password must include a number.'
  if (policy?.requireSymbol && !/[^A-Za-z0-9]/.test(value)) return 'Password must include a symbol.'
  return null
}

export function passwordStrength(password) {
  const value = String(password || '')
  let score = 0
  if (value.length >= 8) score += 1
  if (value.length >= 12) score += 1
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1
  if (/\d/.test(value)) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1
  return Math.min(score, 5)
}

export function requiredMessage(label) {
  return `${label} is required.`
}

/**
 * Tiny schema validator.
 * rules: { field: [{ test: (value, form) => boolean, message: string }] }
 * Returns { valid, errors: { field: message } }
 */
export function validateForm(form, rules) {
  const errors = {}
  Object.entries(rules).forEach(([field, fieldRules]) => {
    for (const rule of fieldRules) {
      if (!rule.test(form[field], form)) {
        errors[field] = rule.message
        break
      }
    }
  })
  return { valid: Object.keys(errors).length === 0, errors }
}

export const rules = {
  required: (label) => ({ test: (value) => String(value ?? '').trim().length > 0, message: requiredMessage(label) }),
  email: (label = 'Email') => ({
    test: (value) => isEmail(value),
    message: `${label} must be a valid email address.`,
  }),
  phone: () => ({ test: (value) => !value || isPhone(value), message: 'Enter a valid phone number.' }),
  minLength: (length, label = 'This field') => ({
    test: (value) => String(value ?? '').trim().length >= length,
    message: `${label} must be at least ${length} characters.`,
  }),
  maxLength: (length, label = 'This field') => ({
    test: (value) => String(value ?? '').length <= length,
    message: `${label} must be ${length} characters or fewer.`,
  }),
  positiveNumber: (label = 'Value') => ({
    test: (value) => Number(value) > 0,
    message: `${label} must be greater than zero.`,
  }),
  nonNegativeNumber: (label = 'Value') => ({
    test: (value) => value !== '' && Number(value) >= 0 && !Number.isNaN(Number(value)),
    message: `${label} must be zero or more.`,
  }),
  atLeast: (min, label = 'Value') => ({
    test: (value) => Number(value) >= min,
    message: `${label} must be at least ${min}.`,
  }),
  atMost: (max, label = 'Value') => ({
    test: (value) => Number(value) <= max,
    message: `${label} must be at most ${max}.`,
  }),
  matches: (otherField, message) => ({
    test: (value, form) => value === form[otherField],
    message,
  }),
  oneOf: (values, label = 'Selection') => ({
    test: (value) => values.includes(value),
    message: `Choose a valid ${label.toLowerCase()}.`,
  }),
  dateAfter: (otherField, message) => ({
    test: (value, form) => {
      if (!value || !form[otherField]) return false
      return new Date(value).getTime() > new Date(form[otherField]).getTime()
    },
    message,
  }),
  minItems: (count, label = 'item') => ({
    test: (value) => Array.isArray(value) && value.length >= count,
    message: `Select at least ${count} ${label}${count > 1 ? 's' : ''}.`,
  }),
}

export function fieldError(errors, field) {
  return errors?.[field] || null
}
