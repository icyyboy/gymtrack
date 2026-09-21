import { cn } from '@/lib/utils/cn'
import { initials } from '@/lib/utils/format'

export function Avatar({
  url,
  name,
  size = 40,
  className
}: {
  url?: string | null
  name: string
  size?: number
  className?: string
}) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-ink-700 bg-ink-800 text-xs font-semibold text-muted-strong',
        className
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </div>
  )
}
