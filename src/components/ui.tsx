/** Shared UI primitives. Sized for a 7-year-old's fingers throughout. */

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { sfx } from '../lib/sound'

type Variant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger' | 'gold'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white border-brand-800 hover:bg-brand-500 active:bg-brand-700',
  secondary: 'bg-white text-brand-800 border-brand-300 hover:bg-brand-50',
  ghost: 'bg-transparent text-brand-700 border-transparent hover:bg-brand-100',
  success: 'bg-emerald-500 text-white border-emerald-700 hover:bg-emerald-400',
  danger: 'bg-rose-500 text-white border-rose-700 hover:bg-rose-400',
  gold: 'bg-amber-400 text-amber-950 border-amber-600 hover:bg-amber-300',
}

const SIZES: Record<Size, string> = {
  sm: 'min-h-11 px-4 text-base rounded-xl border-b-4',
  md: 'min-h-14 px-6 text-lg rounded-2xl border-b-4',
  lg: 'min-h-16 px-8 text-xl sm:text-2xl rounded-2xl border-b-[6px]',
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  full?: boolean
  silent?: boolean
}

export function Btn({
  variant = 'primary',
  size = 'md',
  full,
  silent,
  className = '',
  onClick,
  children,
  ...rest
}: BtnProps) {
  return (
    <button
      {...rest}
      onClick={(e) => {
        if (!silent) sfx.tap()
        onClick?.(e)
      }}
      className={`inline-flex items-center justify-center gap-2 font-extrabold border-2 transition
        active:translate-y-[2px] active:border-b-2 disabled:opacity-40 disabled:pointer-events-none
        ${VARIANTS[variant]} ${SIZES[size]} ${full ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  )
}

export function IconBtn({
  label,
  className = '',
  onClick,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      onClick={(e) => {
        sfx.tap()
        onClick?.(e)
      }}
      className={`grid place-items-center size-12 sm:size-14 rounded-2xl bg-white/85 border-2 border-brand-200
        text-2xl text-brand-700 shadow-sm hover:bg-white active:translate-y-[2px] transition ${className}`}
    >
      {children}
    </button>
  )
}

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  const interactive = Boolean(onClick)
  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      className={`rounded-3xl bg-white border-2 border-brand-200 shadow-[0_4px_0_0_rgba(124,58,237,0.15)]
        ${interactive ? 'cursor-pointer hover:border-brand-400 active:translate-y-[2px] transition' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function Pill({
  children,
  className = '',
  title,
}: {
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm sm:text-base font-extrabold ${className}`}
    >
      {children}
    </span>
  )
}

export function ProgressBar({
  pct,
  className = '',
  barClass = 'bg-brand-500',
  label,
}: {
  pct: number
  className?: string
  barClass?: string
  label?: string
}) {
  return (
    <div
      className={`h-4 w-full rounded-full bg-brand-100 overflow-hidden border border-brand-200 ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${barClass}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  )
}

export function Stars({ count, max = 3, size = 'text-2xl' }: { count: number; max?: number; size?: string }) {
  return (
    <span className={`inline-flex gap-0.5 ${size}`} aria-label={`${count} out of ${max} stars`} role="img">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < count ? '' : 'opacity-25 grayscale'}>
          ⭐
        </span>
      ))}
    </span>
  )
}

/** Full-screen page wrapper with a tablet-friendly max width. */
export function Screen({
  children,
  className = '',
  bg = 'bg-gradient-to-b from-brand-50 via-white to-brand-100',
}: {
  children: ReactNode
  className?: string
  bg?: string
}) {
  return (
    <div className={`min-h-full w-full ${bg}`}>
      <div className={`mx-auto w-full max-w-5xl px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] ${className}`}>
        {children}
      </div>
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose?: () => void
  title?: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-brand-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-white border-4 border-brand-300 p-6 shadow-2xl animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="text-2xl font-black text-brand-900 mb-3">{title}</h2>}
        {children}
      </div>
    </div>
  )
}

export function EmptyState({ emoji, title, body }: { emoji: string; title: string; body?: string }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="text-6xl mb-3">{emoji}</div>
      <p className="text-xl font-black text-brand-900">{title}</p>
      {body && <p className="mt-2 text-brand-600 font-semibold">{body}</p>}
    </div>
  )
}
