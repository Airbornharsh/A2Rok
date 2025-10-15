'use client'

export default function Home() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">A2Rok CLI</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Tunneling helper to expose your local HTTP/HTTPS and WebSocket
            servers to the internet.
          </p>
        </div>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Installation</h2>
          <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
            <pre className="whitespace-pre-wrap text-sm text-zinc-200">
              {`npm install -g a2rok

a2rok --help`}
            </pre>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Usage</h2>
          <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
            <pre className="whitespace-pre-wrap text-sm text-zinc-200">
              {`a2rok <command> [options]`}
            </pre>
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-semibold">Commands</h3>
          <ul className="list-disc space-y-1 pl-6 text-sm text-zinc-300">
            <li>
              <code className="text-zinc-200">user</code>: Show the current
              authenticated user
            </li>
            <li>
              <code className="text-zinc-200">login</code>: Sign in to A2Rok
            </li>
            <li>
              <code className="text-zinc-200">logout</code>: Sign out of A2Rok
            </li>
            <li>
              <code className="text-zinc-200">http &lt;port&gt;</code>: Expose a
              local HTTP server on{' '}
              <code className="text-zinc-200">&lt;port&gt;</code>
            </li>
            <li>
              <code className="text-zinc-200">https &lt;link&gt;</code>: Expose
              an HTTPS server using{' '}
              <code className="text-zinc-200">&lt;link&gt;</code>
            </li>
            <li>
              <code className="text-zinc-200">ws &lt;link&gt;</code>: Expose a
              WebSocket server using{' '}
              <code className="text-zinc-200">&lt;link&gt;</code>
            </li>
            <li>
              <code className="text-zinc-200">wss &lt;link&gt;</code>: Expose a
              secure WebSocket server using{' '}
              <code className="text-zinc-200">&lt;link&gt;</code>
            </li>
          </ul>
        </section>

        <section>
          <h3 className="mb-2 font-semibold">Options</h3>
          <ul className="list-disc space-y-1 pl-6 text-sm text-zinc-300">
            <li>
              <code className="text-zinc-200">-h, --help</code>: Show the help
              message
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Examples</h2>
          <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4">
            <pre className="whitespace-pre-wrap text-sm text-zinc-200">
              {`a2rok login
a2rok user
a2rok http 3000
a2rok https https://my-domain.com
a2rok ws ws://localhost:8080
a2rok wss wss://your-domain.com/ws`}
            </pre>
          </div>
        </section>
      </div>
    </div>
  )
}
