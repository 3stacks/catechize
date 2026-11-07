import { type Metadata } from 'next'
import { Inter } from 'next/font/google'
import clsx from 'clsx'

import { SITE_URL } from '@/lib/site'
import '@/styles/tailwind.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Catechize: learn the catechism by heart',
    template: '%s | Catechize',
  },
  description:
    'Memorise the Reformed and Lutheran catechisms, the creeds and Scripture, one clause at a time. Free in your browser. Self-host it to sync your devices.',
  icons: { icon: '/app/icon.svg' },
}

// A visitor who uses the app goes straight to it. "/?home", a link from inside
// the app, and a first visit all show the homepage.
const openApp = `try{var r=document.referrer?new URL(document.referrer):null;if(location.pathname==='/'&&localStorage.getItem('catechize.uses-app')==='1'&&!/[?&]home\\b/.test(location.search)&&!(r&&r.origin===location.origin&&r.pathname.indexOf('/app')===0))location.replace('/app/')}catch(e){}`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={clsx(
        'h-full scroll-smooth bg-white antialiased',
        inter.variable,
      )}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: openApp }} />
        <link
          rel="preconnect"
          href="https://cdn.fontshare.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,500,700&display=swap"
        />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
