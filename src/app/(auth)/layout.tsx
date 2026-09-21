import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-10 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent font-num text-lg font-bold text-ink-950">
          G
        </span>
        <span className="text-lg font-semibold tracking-tight">GymTrack</span>
      </Link>
      {children}
    </main>
  )
}
