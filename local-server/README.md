## A2Rok CLI

Tunneling helper to expose your local HTTP/HTTPS and WebSocket servers to the internet.

### Installation

- Global install:

```bash
npm install -g a2rok
```

```bash
a2rok --help
```

### Usage

```bash
a2rok <command> [options]
```

#### Commands

- `user`: Show the current authenticated user
- `login`: Sign in to A2Rok
- `logout`: Sign out of A2Rok
- `http <port>`: Expose a local HTTP server on `<port>`
- `ws <link>`: Expose a WebSocket server using `<link>`
- `wss <link>`: Expose a secure WebSocket server using `<link>`

#### Options

- `-h, --help`: Show the help message

#### Examples

```bash
a2rok login
a2rok user
a2rok http 3000
a2rok ws ws://localhost:8080
a2rok wss wss://your-domain.com/ws
```
