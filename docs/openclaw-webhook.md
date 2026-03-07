# OpenClaw Webhook Setup

HomeClaw sends HomeKit events to OpenClaw via mapped webhooks. Events are routed to a dedicated HomeClaw agent that classifies them and notifies the main agent when something meaningful happens.

## Prerequisites

- OpenClaw gateway running on `127.0.0.1:18789`
- HomeClaw app installed and connected to HomeKit

## 1. Install the HomeClaw Agent

```bash
openclaw agents add homeclaw \
  --agent-dir /Applications/HomeClaw.app/Contents/Resources/openclaw/agents/homeclaw \
  --workspace ~/.openclaw/agents/homeclaw/workspace \
  --non-interactive
```

**Important:** `--non-interactive` skips auth setup. You must manually copy auth files from an existing agent:

```bash
cp ~/.openclaw/agents/<existing-agent>/agent/auth-profiles.json \
   ~/.openclaw/agents/homeclaw/agent/
cp ~/.openclaw/agents/<existing-agent>/agent/auth.json \
   ~/.openclaw/agents/homeclaw/agent/
```

Then copy the agent docs from the app bundle to the local (writable) agent dir:

```bash
cp /Applications/HomeClaw.app/Contents/Resources/openclaw/agents/homeclaw/*.md \
   ~/.openclaw/agents/homeclaw/agent/
```

## 2. Generate a Webhook Token

```bash
TOKEN=$(openssl rand -base64 24 | tr '+/' '-_' | tr -d '=')
echo "HOMECLAW_WEBHOOK_TOKEN=$TOKEN" >> ~/.openclaw/.env
echo "Token: $TOKEN"
```

## 3. Configure OpenClaw Gateway

Add the HomeClaw agent entry and hooks mapping to `~/.openclaw/openclaw.json`:

### Agent Entry (in `agents.list`)

```json
{
  "id": "homeclaw",
  "name": "HomeClaw",
  "workspace": "~/.openclaw/agents/homeclaw/workspace",
  "agentDir": "~/.openclaw/agents/homeclaw/agent",
  "model": "anthropic/claude-sonnet-4-20250514",
  "identity": { "name": "HomeClaw", "emoji": "\ud83c\udfe0" },
  "sandbox": { "mode": "off" },
  "tools": {
    "profile": "minimal",
    "alsoAllow": [
      "memory_search", "memory_get", "session_status",
      "message", "sessions_send", "sessions_list",
      "sessions_history", "read", "write"
    ],
    "deny": [
      "exec", "browser", "canvas", "nodes", "cron",
      "gateway", "process", "apply_patch", "web_search",
      "web_fetch", "image", "tts", "fastmail_*",
      "apple_pim_*", "travel_hub_*"
    ]
  }
}
```

### Hooks Mapping (in `hooks.mappings`)

```json
{
  "id": "homeclaw",
  "match": { "path": "homeclaw" },
  "action": "agent",
  "agentId": "homeclaw",
  "sessionKey": "hook:homeclaw",
  "wakeMode": "now",
  "name": "HomeClaw",
  "deliver": true,
  "allowUnsafeExternalContent": true,
  "channel": "last",
  "transform": {
    "module": "homeclaw-transform.js",
    "export": "transform"
  }
}
```

### Install the Transform

```bash
cp openclaw/hooks/homeclaw-transform.js ~/.openclaw/hooks/transforms/
```

### Hooks Token

Ensure `hooks.token` references the env var:

```json
"hooks": {
  "enabled": true,
  "token": "${HOMECLAW_WEBHOOK_TOKEN}"
}
```

Then restart the gateway:

```bash
openclaw gateway restart
```

## 4. Configure HomeClaw

```bash
homeclaw-cli config --webhook-enabled true
homeclaw-cli config --webhook-url http://127.0.0.1:18789
homeclaw-cli config --webhook-token "<your-token>"
```

The webhook endpoint defaults to `/hooks/homeclaw` (set via HomeClaw Settings UI).

## 5. Test

```bash
homeclaw-cli config --webhook-test
```

Expected: `"ok": true, "status": 200`

## Webhook Payload Format

HomeClaw sends JSON payloads with two fields:

```json
{
  "text": "[Trigger Label] [Home] HomeKit: Accessory in Room characteristic changed to value",
  "mode": "now"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `text` | string | Pre-formatted event description. Prefixed with `[trigger_label]`. |
| `mode` | string | `"now"` for critical/immediate events, `"next-heartbeat"` for routine events. |

### Examples

```json
{"text": "[Garage Door] [Home] HomeKit: Garage Door in Garage power changed to true", "mode": "next-heartbeat"}
{"text": "[Door Sensor] [Home] HomeKit: Front Hallway Door Sensor in Front Hallway contact_state changed to 0", "mode": "now"}
{"text": "[HomeClaw] Webhook test event", "mode": "now"}
```

### Transform

The bundled transform (`openclaw/hooks/homeclaw-transform.js`) wraps the `text` field with a `[HomeClaw]` prefix and passes through the `mode`. Test events are silently logged (`deliver: false`) to avoid unnecessary agent notifications.

## Troubleshooting

- **400 "hook mapping requires message"**: The transform is missing or not loaded. Copy it to `~/.openclaw/hooks/transforms/` and restart the gateway.
- **Gateway strips transform on restart**: Re-add the `transform` block to the mapping and restart again. This is a known gateway config-rewrite issue.
- **Agent has no model access**: Auth files missing. Copy `auth-profiles.json` from an existing agent (see step 1).
- **Circuit breaker open**: Run `homeclaw-cli config --webhook-reset` to close it.
