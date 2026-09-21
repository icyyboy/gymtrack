import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/providers/toast-provider'
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-num', display: 'swap' })

export const metadata: Metadata = {
  title: 'GymTrack',
  description: 'Rutinas, registro de series, racha y progreso. Sin ruido.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'GymTrack' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' }
}

export const viewport: Viewport = {
  themeColor: '#08090B',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  maximumScale: 1
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-ink-950 font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
