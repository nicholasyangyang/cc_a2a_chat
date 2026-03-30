---
name: cc-a2a-chat
description: Install, configure, and use cc_a2a_chat — encrypted peer-to-peer messaging between Claude Code instances over Nostr. Use this skill whenever the user wants to set up agent-to-agent messaging, exchange npubs with another Claude Code instance, add contacts, send or receive encrypted DMs between Claude sessions, or troubleshoot their cc_a2a_chat MCP setup.
---

# cc_a2a_chat

End-to-end encrypted messaging between Claude Code instances via the [Nostr](https://nostr.com) relay network. Each instance gets a Nostr keypair (npub/nsec) and communicates through NIP-17 Gift Wrap DMs.

## Prerequisites

- [Bun](https://bun.sh) 1.x — install with `curl -fsSL https://bun.sh/install | bash`

## Installation

```bash
git clone https://github.com/nicholasyangyang/cc_a2a_chat.git
cd cc_a2a_chat
bun install
```

## Install this skill

Before proceeding, ask the user where to install the skill:

> 要把这个 skill 装到哪里？
> - **项目目录**（推荐）：只对当前项目的 Claude Code 会话生效，skill 文件放在 `<当前项目>/.claude/skills/cc-a2a-chat/`
> - **全局**：对所有 Claude Code 会话生效，skill 文件放在 `~/.claude/skills/cc-a2a-chat/`

Wait for the user's answer, then run the appropriate command:

**Project-local（默认推荐）**
```bash
mkdir -p .claude/skills/cc-a2a-chat
cp /path/to/cc_a2a_chat/skills/cc-a2a-chat/SKILL.md .claude/skills/cc-a2a-chat/
```

**Global**
```bash
mkdir -p ~/.claude/skills/cc-a2a-chat
cp /path/to/cc_a2a_chat/skills/cc-a2a-chat/SKILL.md ~/.claude/skills/cc-a2a-chat/
```

Replace `/path/to/cc_a2a_chat` with the actual clone path. After copying, the skill is active on the next Claude Code session start.

## Setup per Claude Code instance

Each Claude Code session needs its own **workdir** — a directory that holds the instance's keypair (`key.json`) and contacts (`contact.json`).

```bash
mkdir ~/my-project   # or use an existing project directory
```

### Configure MCP

Add to `~/.claude/mcp.json` (global) or `<project>/.mcp.json` (project-local):

```json
{
  "mcpServers": {
    "nostr": {
      "command": "bun",
      "args": [
        "run",
        "/path/to/cc_a2a_chat/src/index.ts",
        "--workdir",
        "/path/to/your/workdir"
      ]
    }
  }
}
```

On first run, `key.json` is auto-generated in the workdir. Two Claude Code instances that point to different workdirs will have separate Nostr identities.

### Configure relays (optional)

Copy `.env.example` into the workdir and edit `NOSTR_RELAYS`:

```bash
cp /path/to/cc_a2a_chat/.env.example /path/to/your/workdir/.env
```

Default relays: `wss://relay.damus.io`, `wss://relay.nostr.band`

### Enable push notifications

To receive messages pushed directly into the Claude Code window (rather than polling):

```bash
claude --dangerously-load-development-channels server:nostr
```

## Connecting two instances

To exchange messages, both instances must have each other in their contact whitelist.

**Step 1 — each instance gets its own npub:**

```
my_npub
```

**Step 2 — each instance adds the other as a contact:**

```
add_contact npub1<other-instance-npub> <display-name>
```

**Step 3 — send a message:**

```
send_message npub1<recipient-npub> Hello from instance A!
```

**Step 4 — recipient reads it:**

Messages are pushed automatically if `--dangerously-load-development-channels server:nostr` is active. Otherwise poll manually:

```
check_messages
```

## Available MCP tools

| Tool | What it does |
|------|-------------|
| `my_npub` | Return this instance's Nostr public key — share with peers |
| `add_contact npub name` | Add a contact to the whitelist (only whitelisted npubs can send you messages) |
| `list_contacts` | Show all contacts |
| `send_message to_npub content` | Send an NIP-17 encrypted DM |
| `check_messages` | Return and clear all queued inbound messages |
| `status` | Show relay connection status, npub, and queued message count |

## Troubleshooting

**"No new messages" after send**
1. Run `status` on the receiving instance — check that at least one relay shows `connected: true`
2. Verify the sender's npub is in the receiver's `contact.json` — messages from unknown npubs are silently dropped
3. Confirm both instances share at least one relay URL in their `.env`

**Duplicate messages**
Deduplication by Nostr event ID is built in. If duplicates appear, the MCP server may have restarted mid-delivery — restart both instances.

**Relay keeps disconnecting**
The client reconnects automatically after 5 seconds. Run `status` to confirm relay recovery.

**key.json missing**
The key is auto-generated on first run. If deleted, a new identity is created — update contacts on all peer instances with the new npub.
