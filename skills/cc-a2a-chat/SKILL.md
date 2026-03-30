---
name: cc-a2a-chat
description: Install, configure, and use cc_a2a_chat — encrypted peer-to-peer messaging between Claude Code instances over Nostr. Use this skill whenever the user wants to set up agent-to-agent messaging, exchange npubs with another Claude Code instance, add contacts, send or receive encrypted DMs between Claude sessions, or troubleshoot their cc_a2a_chat MCP setup.
---

# cc_a2a_chat

End-to-end encrypted messaging between Claude Code instances via the [Nostr](https://nostr.com) relay network. Each instance gets a Nostr keypair (npub/nsec) and communicates through NIP-17 Gift Wrap DMs.

## Prerequisites

- [Bun](https://bun.sh) 1.x — install with `curl -fsSL https://bun.sh/install | bash`

## Installation

### Step 1 — Ask where to install the skill

Ask the user:

> 要把这个 skill 装到哪里？
> - **项目目录**（推荐）：只对当前项目生效，放在 `<当前项目>/.claude/skills/cc-a2a-chat/`
> - **全局**：对所有 Claude Code 会话生效，放在 `~/.claude/skills/cc-a2a-chat/`

Determine `SKILL_DIR` from the answer:
- Project-local（默认）: `SKILL_DIR=<project-root>/.claude/skills/cc-a2a-chat`
- Global: `SKILL_DIR=~/.claude/skills/cc-a2a-chat`

### Step 2 — Clone the repo into the skill directory

```bash
mkdir -p "$SKILL_DIR"
git clone https://github.com/nicholasyangyang/cc_a2a_chat.git "$SKILL_DIR/code"
cd "$SKILL_DIR/code"
bun install
```

Also copy this SKILL.md into place so it is available to future sessions:

```bash
cp "$SKILL_DIR/code/skills/cc-a2a-chat/SKILL.md" "$SKILL_DIR/SKILL.md"
```

### Step 3 — Determine the workdir

The workdir stores this instance's keypair (`key.json`) and contacts (`contact.json`). Use the current project root as the workdir — confirm with the user if needed:

```bash
WORKDIR=$(pwd)   # or wherever the user's project lives
```

### Step 4 — Write the .env file

Create `$WORKDIR/.env` with the default relay list:

```bash
cat > "$WORKDIR/.env" <<'EOF'
NOSTR_RELAYS=wss://relay.damus.io,wss://relay.0xchat.com,wss://nostr.oxtr.dev,wss://nostr-pub.wellorder.net,wss://relay.primal.net
EOF
```

Tell the user: 如果需要使用其他 relay，直接编辑 `$WORKDIR/.env` 中的 `NOSTR_RELAYS`，逗号分隔多个地址即可。

### Step 5 — Configure MCP

Write or merge into `$WORKDIR/.mcp.json`:

```json
{
  "mcpServers": {
    "nostr": {
      "command": "bun",
      "args": [
        "run",
        "<SKILL_DIR>/code/src/index.ts",
        "--workdir",
        "<WORKDIR>"
      ]
    }
  }
}
```

Replace `<SKILL_DIR>` and `<WORKDIR>` with the actual absolute paths.

On first run, `key.json` is auto-generated in the workdir. Different workdirs = separate Nostr identities.

### Step 6 — Restart and enable push notifications

Remind the user:

> 配置完成！请用以下命令重启 Claude Code，开启消息推送通道：
>
> ```bash
> claude --dangerously-skip-permissions --dangerously-load-development-channels server:nostr
> ```
>
> 这样收到的 Nostr 消息会直接推送到当前会话窗口，无需手动调用 `check_messages`。

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
