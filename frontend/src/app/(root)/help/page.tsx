'use client'

export default function HelpPage() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Help & Getting Started</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Quick guide to install and use A2Rok CLI for HTTP/HTTPS and
            WebSocket tunneling.
          </p>
        </div>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Installation</h2>
          <div className="border-border bg-card rounded-md border p-4">
            <pre className="text-foreground whitespace-pre-wrap text-sm">{`npm install -g a2rok

a2rok --help`}</pre>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Usage</h2>
          <div className="border-border bg-card rounded-md border p-4">
            <pre className="text-foreground whitespace-pre-wrap text-sm">{`a2rok <command> [options]`}</pre>
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-semibold">Commands</h3>
          <ul className="text-muted-foreground list-disc space-y-1 pl-6 text-sm">
            <li>
              <code className="text-foreground">user</code>: Show the current
              authenticated user
            </li>
            <li>
              <code className="text-foreground">login</code>: Sign in to A2Rok
            </li>
            <li>
              <code className="text-foreground">logout</code>: Sign out of A2Rok
            </li>
            <li>
              <code className="text-foreground">http &lt;port&gt;</code>: Expose
              a local HTTP server on{' '}
              <code className="text-foreground">&lt;port&gt;</code>
            </li>
            <li>
              <code className="text-foreground">https &lt;link&gt;</code>:
              Expose an HTTPS server using{' '}
              <code className="text-foreground">&lt;link&gt;</code>
            </li>
            <li>
              <code className="text-foreground">ws &lt;link&gt;</code>: Expose a
              WebSocket server using{' '}
              <code className="text-foreground">&lt;link&gt;</code>
            </li>
            <li>
              <code className="text-foreground">wss &lt;link&gt;</code>: Expose
              a secure WebSocket server using{' '}
              <code className="text-foreground">&lt;link&gt;</code>
            </li>
          </ul>
        </section>

        <section>
          <h3 className="mb-2 font-semibold">Options</h3>
          <ul className="text-muted-foreground list-disc space-y-1 pl-6 text-sm">
            <li>
              <code className="text-foreground">-h, --help</code>: Show the help
              message
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold">Examples</h2>
          <div className="border-border bg-card rounded-md border p-4">
            <pre className="text-foreground whitespace-pre-wrap text-sm">{`a2rok login
a2rok user
a2rok http 3000
a2rok https https://my-domain.com
a2rok ws ws://localhost:8080
a2rok wss wss://your-domain.com/ws`}</pre>
          </div>
        </section>
      </div>
    </div>
  )
}
