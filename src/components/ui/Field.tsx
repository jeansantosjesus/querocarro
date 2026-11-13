import { useId, type ReactNode } from 'react'

export interface FieldControlProps {
  id: string
  'aria-describedby': string | undefined
  'aria-invalid': boolean
  'aria-required': boolean | undefined
}

interface FieldProps {
  label: string
  hint?: ReactNode
  error?: string | undefined
  required?: boolean
  children: (props: FieldControlProps) => ReactNode
}

/** Rótulo + controle + dica + erro, com associações ARIA corretas. */
export function Field({ label, hint, error, required, children }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div>
      <label htmlFor={id} className="qc-label">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': Boolean(error),
        'aria-required': required ? true : undefined,
      })}
      {hint ? (
        <p id={hintId} className="qc-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="qc-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
