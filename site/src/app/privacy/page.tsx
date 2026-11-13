import { type Metadata } from 'next'
import Link from 'next/link'

import { Container } from '@/components/Container'
import { Footer } from '@/components/Footer'
import { REPO_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'Hearers collects no personal data. Your answers and your progress stay on your device.',
  alternates: { canonical: '/privacy/' },
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-14 font-display text-3xl font-bold tracking-tight text-slate-900">{children}</h2>
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-lg tracking-tight text-slate-700">{children}</p>
}

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} className="font-medium text-brand-700 underline">
    {children}
  </a>
)

export default function Privacy() {
  return (
    <>
      <header className="bg-slate-100 py-16 sm:py-20">
        <Container>
          <p className="text-base font-medium text-slate-500">
            <Link href="/?home" className="hover:text-slate-900">
              Hearers
            </Link>
          </p>
          <h1 className="mt-4 font-display text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">Privacy</h1>
          <p className="mt-4 text-xl tracking-tight text-slate-600">
            Hearers collects no personal data. Your answers and your progress stay on your device.
          </p>
          <p className="mt-2 text-sm text-slate-500">Last change: 13 November 2026</p>
        </Container>
      </header>

      <main className="py-16">
        <Container>
          <H2>The iPhone and Android apps</H2>
          <P>
            The apps have no account and no analytics. They send no data to us or to another company. Your verses, your
            answers, your progress and your settings stay in a database on your device. When you delete the app, you
            delete them.
          </P>
          <P>
            Sync is optional. If you enter the address of a Hearers server in Settings, the app sends your progress to
            that server, and only to that server. You choose the server. We do not run a sync server for the apps.
          </P>
          <P>
            Reminders are notifications on your device. The app makes them on the device, so no server sends them.
          </P>
          <P>
            “Listen” reads the text aloud with the speech of your device. A backup is a file that you save or share
            yourself.
          </P>

          <H2>The website and the web app</H2>
          <P>
            The free web app keeps your data in the storage of your browser, on your device. We do not receive it.
          </P>
          <P>
            The website and the web app count visits with Umami. Umami uses no cookies and does not identify you. It
            records the page, the site that sent you, the type of browser and device, and the country. It does not keep
            your IP address. The web app also counts some actions, for example a review. It never sends the text that you
            type or your answers. Analytics counts only the public site, hearers.app.
          </P>
          <P>
            Cloudflare hosts the website. Cloudflare processes each visit, as each web host does, to deliver the page and
            to protect the site. Read the <A href="https://www.cloudflare.com/privacypolicy/">privacy policy of Cloudflare</A>.
          </P>

          <H2>A server that you host</H2>
          <P>
            If you run Hearers on your own server, your data is on your server. You control it. A self-hosted server sends
            no analytics.
          </P>

          <H2>Gifts</H2>
          <P>
            On the web and on Android, you can give a gift on Ko-fi. Ko-fi and its payment provider process the gift. We
            receive your name and your message only if you give them to Ko-fi.
          </P>

          <H2>Children</H2>
          <P>Hearers collects no data from anyone, so it collects no data from children.</P>

          <H2>Changes and contact</H2>
          <P>
            If this policy changes, this page shows the new policy and the date of the change. For a question, open an
            issue on <A href={`${REPO_URL}/issues`}>GitHub</A>.
          </P>
        </Container>
      </main>
      <Footer />
    </>
  )
}
