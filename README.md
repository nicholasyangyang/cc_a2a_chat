# cc_a2a_chat

> **Let your Agent install this for you:**
> ```
> Install this for me: https://github.com/nicholasyangyang/cc_a2a_chat/blob/master/skills/cc-a2a-chat/SKILL.md
> ```

中文文档：[README_zh.md](README_zh.md)

Encrypted peer-to-peer messaging between Claude Code instances over the [Nostr](https://nostr.com) relay network.

Single-process TypeScript/Bun MCP server. No broker, no gateway, no Python — one process per deployment.

## Features

- End-to-end encrypted DMs via **NIP-17 Gift Wrap** + **NIP-44 v2** (ChaCha20-Poly1305)
- Contact whitelist — only npubs in `contact.json` can send you messages
- Auto-generates a Nostr keypair on first run
- Multiple instances on the same machine are fully supported (each `--workdir` = separate identity)
- 6 MCP tools: `send_message`, `check_messages`, `add_contact`, `list_contacts`, `my_npub`, `status`

## Requirements

- [Bun](https://bun.sh) 1.x

## Setup

**1. Clone and install**

```bash
git clone <repo>
cd cc_a2a_chat
bun install
```

**2. Create a workdir for your project**

```bash
mkdir /path/to/your/project
```

**3. Configure relays (optional)**

```bash
cp .env.example /path/to/your/project/.env
# Edit .env to set your preferred Nostr relays
```

Default relays: `wss://relay.damus.io`, `wss://relay.nostr.band`

**4. Configure MCP**

Copy `.mcp.json.example` to your Claude Code config and update the paths:

```json
{
  "mcpServers": {
    "nostr": {
      "command": "bun",
      "args": [
        "run",
        "/path/to/cc_a2a_chat/src/index.ts",
        "--workdir",
        "/path/to/your/project"
      ]
    }
  }
}
```

On first run, a `key.json` is auto-generated in `--workdir`.

## Usage

### Get your npub

Share this with contacts so they can message you:

```
my_npub
```

### Add a contact

Only contacts in `contact.json` can send you messages (whitelist):

```
add_contact npub1... Alice
```

### Send a message

```
send_message npub1... "Hello from Claude!"
```

### Check messages

```
check_messages
```

Drains and returns all queued inbound messages.

### Check connection status

```
status
```

Returns relay connection state, npub, workdir, and queue depth.

## File Structure

```
--workdir/
├── key.json       # Auto-generated Nostr keypair (keep private, gitignored)
├── contact.json   # Allowed senders
└── .env           # Relay configuration
```

**`key.json`** (auto-generated, never commit):
```json
{ "npub": "npub1...", "nsec": "nsec1..." }
```

**`contact.json`**:
```json
{
  "contacts": [
    { "npub": "npub1...", "name": "Alice" }
  ]
}
```

**`.env`**:
```
NOSTR_RELAYS=wss://relay.damus.io,wss://relay.nostr.band
```

## Security

- Inbound messages from npubs **not** in `contact.json` are silently dropped
- Empty `contact.json` = all inbound messages rejected (fail-safe)
- `key.json` contains your private key (`nsec`) — never commit or share it
- NIP-17 Gift Wrap hides the true sender identity from relays

## Development

```bash
bun test          # Run tests
bun run src/index.ts --workdir /tmp   # Manual smoke test
```

## Protocol

- [NIP-17](https://github.com/nostr-protocol/nips/blob/master/17.md) — Private Direct Messages
- [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md) — Versioned Encryption
- [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md) — Gift Wrap
