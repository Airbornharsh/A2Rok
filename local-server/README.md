## A2Rok CLI

Tunneling helper to expose your local HTTP server to the internet.

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

#### Options

- `-h, --help`: Show the help message

#### Examples

```bash
a2rok login
a2rok user
a2rok http 3000
```
