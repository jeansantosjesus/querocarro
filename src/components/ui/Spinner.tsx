export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-3 text-ink-700">
      <span
        aria-hidden="true"
        className="inline-block size-5 animate-spin rounded-full border-2 border-brand-700 border-t-transparent"
      />
      <span>{label}</span>
    </div>
  )
}
