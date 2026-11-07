import { type Metadata } from 'next'
import Link from 'next/link'

import { Container } from '@/components/Container'
import { Footer } from '@/components/Footer'
import { APP_URL, REPO_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Self-host Hearers',
  description:
    'Run Hearers on your own server with Docker. Progress is kept in SQLite, and every device syncs with it.',
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-14 scroll-mt-8 font-display text-3xl font-bold tracking-tight text-slate-900">
      {children}
    </h2>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-lg tracking-tight text-slate-700">{children}</p>
}

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-900 px-6 py-5 text-sm/6 text-slate-100">
      <code>{children}</code>
    </pre>
  )
}

const C = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[0.9em] text-slate-900">{children}</code>
)

export default function SelfHosting() {
  return (
    <>
      <header className="bg-slate-100 py-16 sm:py-20">
        <Container>
          <p className="text-base font-medium text-slate-500">
            <Link href="/?home" className="hover:text-slate-900">
              Hearers
            </Link>{' '}
            / Docs
          </p>
          <h1 className="mt-4 font-display text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            Self-hosting
          </h1>
          <p className="mt-4 text-xl tracking-tight text-slate-600">
            Run Hearers on your own server. The server keeps your progress in
            one SQLite file, and each of your devices syncs with it.
          </p>
        </Container>
      </header>

      <main className="py-16">
        <Container>
          <div className="rounded-2xl bg-brand-50 px-6 py-5 text-base tracking-tight text-brand-900 ring-1 ring-brand-200">
            <strong className="font-semibold">Source code.</strong> The
            source code and the Docker image are at{' '}
            <Link href={REPO_URL} className="font-medium underline">
              github.com/3stacks/hearers
            </Link>
            . To try Hearers first, use the{' '}
            <a href={APP_URL} className="font-medium underline">
              free app in your browser
            </a>
            .
          </div>

          <H2 id="why">Why self-host</H2>
          <P>
            The free app keeps your progress in your browser. That is enough
            for one device. If you learn on a phone and on a computer, the two
            copies do not know about each other.
          </P>
          <P>
            The server keeps a copy of all progress in SQLite. Each device
            pushes its changes and pulls the changes of the other devices. The
            app still works offline. When the device is online again, the
            changes sync.
          </P>

          <H2 id="docker">Run it with Docker</H2>
          <P>You need Docker. The container needs no other services.</P>
          <Code>{`docker run -d --name catechize \\
  -p 3000:3000 \\
  -v ./catechize-data:/data \\
  --restart unless-stopped \\
  ghcr.io/3stacks/hearers:latest`}</Code>
          <P>
            Open <C>http://your-server:3000</C>. On the server, the app opens at
            the root, without this homepage.
          </P>

          <H2 id="compose">Docker Compose</H2>
          <Code>{`services:
  catechize:
    image: ghcr.io/3stacks/hearers:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - HEARERS_TOKEN=\${HEARERS_TOKEN:-}
    volumes:
      - ./catechize-data:/data`}</Code>

          <H2 id="token">Access token</H2>
          <P>
            To keep other people out of your progress, set{' '}
            <C>HEARERS_TOKEN</C>. Make a token with this command:
          </P>
          <Code>{`openssl rand -hex 24`}</Code>
          <P>
            Each device asks for the token once, in Settings. If the server is
            only on your home network or on Tailscale, you can leave the token
            empty.
          </P>

          <H2 id="settings">Settings</H2>
          <div className="mt-6 overflow-x-auto rounded-2xl bg-slate-50 px-6 py-3">
            <table className="w-full text-left text-base tracking-tight">
              <thead className="text-slate-900">
                <tr>
                  <th className="py-3 pr-6 font-semibold">Variable</th>
                  <th className="py-3 pr-6 font-semibold">Default</th>
                  <th className="py-3 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300/30 text-slate-700">
                <tr>
                  <td className="py-3 pr-6"><C>PORT</C></td>
                  <td className="py-3 pr-6"><C>3000</C></td>
                  <td className="py-3">The HTTP port in the container.</td>
                </tr>
                <tr>
                  <td className="py-3 pr-6"><C>DATA_DIR</C></td>
                  <td className="py-3 pr-6"><C>/data</C></td>
                  <td className="py-3">The directory for <C>catechize.db</C>.</td>
                </tr>
                <tr>
                  <td className="py-3 pr-6"><C>HEARERS_TOKEN</C></td>
                  <td className="py-3 pr-6">none</td>
                  <td className="py-3">When set, sync needs this token.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <H2 id="backups">Backups</H2>
          <P>
            Do not copy <C>catechize.db</C> while the container runs. The copy
            can include a write that is not complete. Tell the container to
            write a snapshot, and then copy the snapshot:
          </P>
          <Code>{`docker exec catechize node server/backup.ts /data/backup/catechize.db
cp ./catechize-data/backup/catechize.db ~/backups/catechize-$(date +%F).db`}</Code>
          <P>
            To restore, stop the container. Delete <C>catechize.db-wal</C> and{' '}
            <C>catechize.db-shm</C>, and then put the snapshot in place as{' '}
            <C>catechize.db</C>. Each device notices the restore and sends its
            newer records to the server again.
          </P>
          <P>
            You can also export a backup from Settings in the app. That file
            holds the progress of one device, in JSON.
          </P>

          <H2 id="https">HTTPS</H2>
          <P>
            The app works offline only over HTTPS, or on <C>localhost</C>. Put
            the container behind a reverse proxy such as Caddy:
          </P>
          <Code>{`catechize.example.com {
    encode zstd gzip
    reverse_proxy localhost:3000
}`}</Code>

          <H2 id="update">Update</H2>
          <Code>{`docker compose pull catechize
docker compose up -d catechize`}</Code>
          <P>
            Open the app on each device after an update. The new version
            installs in the background, and it starts the next time you open
            the app.
          </P>
        </Container>
      </main>
      <Footer />
    </>
  )
}
