import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { errorMessage, fieldErrors } from '../api/client'

/**
 * Put the API's field errors on the matching form fields.
 * Returns a message for the form banner when an error doesn't belong to a visible field.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly string[],
): string | null {
  const byField = fieldErrors(error)
  let unmatched = Object.keys(byField).length === 0
  for (const [field, message] of Object.entries(byField)) {
    if (fields.includes(field)) setError(field as Path<T>, { message })
    else unmatched = true
  }
  return unmatched ? errorMessage(error) : null
}
