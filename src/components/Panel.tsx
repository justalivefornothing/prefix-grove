import type { ReactNode } from 'react'

export function Panel({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-linen-deep bg-parchment p-4 shadow-sm">
      <header className="mb-2 flex items-baseline justify-between">
        <h2 className="font-serif text-lg text-soil">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  )
}
