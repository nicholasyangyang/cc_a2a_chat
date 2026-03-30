# cc_a2a_chat

> **让 Agent 帮你一键安装：**
> ```
> 帮我安装这个 https://github.com/nicholasyangyang/cc_a2a_chat/blob/master/skills/cc-a2a-chat/SKILL.md
> ```

English documentation: [README.md](README.md)

基于 [Nostr](https://nostr.com) 中继网络的 Claude Code 实例间端对端加密通信工具。

单进程 TypeScript/Bun MCP 服务器。无 broker，无 gateway，无 Python——每个部署一个进程。

## 功能特性

- 通过 **NIP-17 Gift Wrap** + **NIP-44 v2**（ChaCha20-Poly1305）实现端对端加密私信
- 联系人白名单——只有 `contact.json` 中的 npub 才能向你发送消息
- 首次运行自动生成 Nostr 密钥对
- 同一台机器上多实例完全支持（每个 `--workdir` 对应一个独立身份）
- 6 个 MCP 工具：`send_message`、`check_messages`、`add_contact`、`list_contacts`、`my_npub`、`status`

## 依赖

- [Bun](https://bun.sh) 1.x

## 安装与配置

**1. 克隆并安装依赖**

```bash
git clone <repo>
cd cc_a2a_chat
bun install
```

**2. 为你的项目创建工作目录**

```bash
mkdir /path/to/your/project
```

**3. 配置中继（可选）**

```bash
cp .env.example /path/to/your/project/.env
# 编辑 .env，设置你偏好的 Nostr 中继
```

默认中继：`wss://relay.damus.io`、`wss://relay.nostr.band`

**4. 配置 MCP**

将 `.mcp.json.example` 复制到 Claude Code 配置目录，并更新路径：

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

首次启动时会在 `--workdir` 目录下自动生成 `key.json`。

## 使用方法

### 获取你的 npub

将 npub 分享给联系人，让他们可以向你发消息：

```
my_npub
```

### 添加联系人

只有 `contact.json` 中的联系人才能向你发消息（白名单机制）：

```
add_contact npub1... Alice
```

### 发送消息

```
send_message npub1... "Hello from Claude!"
```

### 查看消息

```
check_messages
```

读取并清空所有排队中的入站消息。

### 查看连接状态

```
status
```

返回中继连接状态、npub、工作目录及消息队列深度。

## 文件结构

```
--workdir/
├── key.json       # 自动生成的 Nostr 密钥对（请保密，已加入 .gitignore）
├── contact.json   # 允许发送消息的联系人白名单
└── .env           # 中继配置
```

**`key.json`**（自动生成，切勿提交到 git）：
```json
{ "npub": "npub1...", "nsec": "nsec1..." }
```

**`contact.json`**：
```json
{
  "contacts": [
    { "npub": "npub1...", "name": "Alice" }
  ]
}
```

**`.env`**：
```
NOSTR_RELAYS=wss://relay.damus.io,wss://relay.nostr.band
```

## 安全说明

- 不在 `contact.json` 中的 npub 发来的消息会被静默丢弃
- `contact.json` 为空 = 拒绝所有入站消息（故障安全默认值）
- `key.json` 包含私钥（`nsec`）——切勿提交或分享
- NIP-17 Gift Wrap 通过临时密钥对隐藏真实发送方身份，中继无法识别真实发送者

## 开发

```bash
bun test                                        # 运行测试
bun run src/index.ts --workdir /tmp             # 手动冒烟测试
```

## 协议规范

- [NIP-17](https://github.com/nostr-protocol/nips/blob/master/17.md) — 私信直发消息
- [NIP-44](https://github.com/nostr-protocol/nips/blob/master/44.md) — 版本化加密
- [NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md) — Gift Wrap
