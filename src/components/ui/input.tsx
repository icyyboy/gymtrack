'use client'

import { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, hint, error, id, ...props },
  ref
) {
  const autoId = useId()
  const inputId = id ?? autoId

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm text-muted-strong">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        className={cn(
          'w-full rounded-xl border bg-ink-850 px-3.5 py-3 text-[15px] text-white placeholder:text-muted/70',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-accent/60',
          error ? 'border-danger' : 'border-ink-700 focus:border-accent/60',
          className
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
})

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }>(
  function Select({ className, label, id, children, ...props }, ref) {
    const autoId = useId()
    const selectId = id ?? autoId
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="mb-1.5 block text-sm text-muted-strong">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full appearance-none rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-3 text-[15px] text-white',
            'focus:outline-none focus:ring-2 focus:ring-accent/60',
            className
          )}
          {...props}
        >
          {children}
        </select>
      </div>
    )
  }
)

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }>(
  function Textarea({ className, label, id, ...props }, ref) {
    const autoId = useId()
    const areaId = id ?? autoId
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={areaId} className="mb-1.5 block text-sm text-muted-strong">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={areaId}
          rows={3}
          className={cn(
            'w-full rounded-xl border border-ink-700 bg-ink-850 px-3.5 py-3 text-[15px] text-white',
            'placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-accent/60',
            className
          )}
          {...props}
        />
      </div>
    )
  }
)
