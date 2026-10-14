import { Fragment, type ReactNode } from 'react'
import { useLocale } from '.'

/**
 * Remounts everything inside when the language changes, so every `t()` call (including ones in
 * plain helper functions) picks up the new language without each component subscribing.
 */
export function LocaleBoundary({ children }: { children: ReactNode }) {
  return <Fragment key={useLocale()}>{children}</Fragment>
}
