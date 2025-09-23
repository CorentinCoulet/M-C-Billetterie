'use client'

export function Background() {
  return (
    <div className="fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800" />
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
    </div>
  )
}