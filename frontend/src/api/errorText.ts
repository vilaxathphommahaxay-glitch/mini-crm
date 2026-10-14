// Turns the API's error codes into text in the user's language. The server's own (English)
// message is only a fallback for codes we don't know.
import { t, type MessageKey } from '../i18n'
import type { ApiError } from './client'

export interface ApiDetail {
  field?: string
  message?: string
  code?: string
  [key: string]: unknown
}

const BY_CODE: Record<string, MessageKey> = {
  unauthorized: 'error.unauthorized',
  invalid_credentials: 'error.invalidCredentials',
  account_disabled: 'error.accountDisabled',
  forbidden: 'error.forbidden',
  not_found: 'error.notFound',
  email_taken: 'error.emailTaken',
  self_change: 'error.selfChange',
  conflict: 'error.conflict',
  network_error: 'error.network',
  validation_error: 'error.invalidInput',
  file_too_large: 'error.fileTooLarge',
  file_not_utf8: 'error.fileNotUtf8',
  file_empty: 'error.fileEmpty',
  file_type_not_allowed: 'error.fileTypeNotAllowed',
  file_missing_column: 'error.fileMissingColumn',
  file_too_many_rows: 'error.fileTooManyRows',
}

export function apiErrorText(error: ApiError): string {
  const detail = error.details[0] as ApiDetail | undefined
  switch (error.code) {
    case 'too_many_attempts': {
      const minutes = Number(detail?.minutes ?? 15)
      return t('error.tooManyAttempts', { minutes, count: minutes })
    }
    case 'has_related_records':
      return detail && 'contacts' in detail
        ? t('error.companyInUse', {
            contacts: Number(detail.contacts),
            deals: Number(detail.deals),
          })
        : t('error.contactInUse', { deals: Number(detail?.deals ?? 0) })
    case 'attachment_too_large':
      return t('error.attachmentTooLarge', { mb: Number(detail?.mb ?? 10) })
    case 'error':
      return t('error.requestFailed', { status: error.status })
  }
  const key = BY_CODE[error.code]
  return key ? t(key) : error.message || t('error.generic')
}

const FIELD_BY_CODE: Record<string, MessageKey> = {
  not_found: 'fielderror.notFound',
  inactive_user: 'fielderror.inactiveUser',
  same_user: 'fielderror.sameUser',
  wrong_password: 'fielderror.wrongPassword',
  company_conflict: 'fielderror.companyConflict',
  bad_position: 'fielderror.badPosition',
  discount_too_large: 'fielderror.discountTooLarge',
  before_issue_date: 'fielderror.beforeIssueDate',
  cannot_be_empty: 'validation.required',
  missing: 'validation.required',
  too_short: 'validation.required',
  string_too_short: 'validation.required',
  too_long: 'validation.tooLong',
  string_too_long: 'validation.tooLong',
}

/** One field's problem as text: by reason code, else a generic "not valid". */
export function fieldErrorText(detail: ApiDetail): string {
  const key =
    FIELD_BY_CODE[detail.code ?? ''] ??
    (detail.field === 'email' ? 'validation.email' : 'validation.invalid')
  return t(key)
}
