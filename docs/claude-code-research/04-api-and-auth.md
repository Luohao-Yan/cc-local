# 04 - API & Authentication

## Overview

Claude Code supports multiple API providers and authentication methods, with a unified client layer that abstracts provider differences.

## Supported Providers

### 1. Anthropic API (Direct)
- **Base URL**: `https://api.anthropic.com`
- **Staging**: `https://api-staging.anthropic.com`
- **Auth**: API key or OAuth
- **Models endpoint**: `/v1/messages`

### 2. AWS Bedrock
- **Base URL**: `https://bedrock-runtime.{region}.amazonaws.com`
- **FIPS**: `https://bedrock-runtime-fips.{region}.amazonaws.com`
- **Mantle**: `https://bedrock-mantle.{region}.amazonaws.com`
- **Auth**: AWS credentials (IAM)
- **Regions**: Multiple AWS regions

### 3. Google Vertex AI
- **Base URL**: `https://aiplatform.googleapis.com/v1`
- **EU Rep**: `https://aiplatform.eu.rep.googleapis.com/v1`
- **US Rep**: `https://aiplatform.us.rep.googleapis.com/v1`
- **Auth**: Google Cloud OAuth
- **Scope**: `https://www.googleapis.com/auth/cloud-platform`

### 4. Anthropic Foundry
- **Base URL**: `https://aws-external-anthropic-{region}....`
- **Auth**: Foundry-specific credentials

### 5. Custom/OpenAI-Compatible Provider
- User-configurable base URL
- OpenAI API compatible
- Custom API key

## Authentication Methods

### API Key
```
ANTHROPIC_API_KEY=sk-ant-...
```
Direct API key authentication for the Anthropic API.

### OAuth (Anthropic)
- **Authorize URL**: `https://platform.claude.com/oauth/authorize`
- **Token URL**: `https://platform.claude.com/v1/oauth/token`
- **Callback**: `https://platform.claude.com/oauth/code/callback`
- **Success**: `https://platform.claude.com/oauth/code/success`
- Supports managed/organization tokens
- Auto-refresh token flow

### OAuth (Notion Integration)
- **Token URL**: `https://api.notion.com/v1/oauth/token`
- Used for Notion workspace integration

### AWS Credentials (Bedrock)
- Standard AWS credential chain
- IAM role-based auth
- Region-specific configuration

### Google Cloud (Vertex)
- `googleapis.com/oauth2/v1/certs` for token validation
- `googleapis.com/oauth2/v3/certs` for token refresh
- Service account support

### apiKeyHelper
- Custom command that returns API key
- Configured via `--settings`
- Used in bare/simple mode

## API Endpoints

### Core API
| Endpoint | Method | Description |
|---|---|---|
| `/v1/messages` | POST | Main chat completions endpoint |
| `/v1/models/{model}` | GET | Get model info |

### Claude Code Platform API
| Endpoint | Method | Description |
|---|---|---|
| `/api/claude_code/metrics` | POST | Usage metrics reporting |
| `/api/directory/servers` | GET | MCP server directory |
| `/api/oauth/claude_cli/create_api_key` | POST | Create API key from OAuth |
| `/api/oauth/claude_cli/roles` | GET | Get OAuth roles |
| `/api/web/domain_info` | GET | Domain safety check |
| `/mcp-registry/v0/servers` | GET | MCP server registry |

### Managed Agents API
| Endpoint | Method | Description |
|---|---|---|
| `/v1/agents` | POST | Create managed agent |
| `/v1/sessions` | POST | Create agent session |
| `/v1/sessions/{id}` | GET | Get session status |
| `/v1/environments` | POST | Create environment |
| `/v1/environments/{id}` | DELETE | Delete environment |
| `/v1/environments/{id}/archive` | POST | Archive environment |
| `/v1/files` | POST | Upload files |
| `/v1/files/{id}` | GET | Download files |

### GitHub API
| Endpoint | Description |
|---|---|
| `https://api.github.com` | REST API |
| `https://api.github.com/graphql` | GraphQL API |
| `https://api.githubcopilot.com/mcp/` | GitHub Copilot MCP |

## Model Management

### Model Registry (from binary extraction)
| Model ID | Family | Notes |
|---|---|---|
| `claude-3-haiku-20240307` | Haiku 3 | Legacy |
| `claude-3-sonnet-20240229` | Sonnet 3 | Legacy |
| `claude-3-opus-20240229` | Opus 3 | Legacy |
| `claude-3-5-haiku-20241022` | Haiku 3.5 | |
| `claude-3-5-sonnet-20240620` | Sonnet 3.5 v1 | |
| `claude-3-5-sonnet-20241022` | Sonnet 3.5 v2 | |
| `claude-3-7-sonnet-20250219` | Sonnet 3.7 | |
| `claude-4-opus-20250514` | Opus 4 | |
| `claude-haiku-4` | Haiku 4 | |
| `claude-haiku-4-5-20251001` | Haiku 4.5 | |
| `claude-sonnet-4-20250514` | Sonnet 4 | |
| `claude-sonnet-4-5-20250929` | Sonnet 4.5 | |
| `claude-opus-4-20250514` | Opus 4 | |
| `claude-opus-4-5-20251101` | Opus 4.5 | |
| `claude-opus-4-6-20251101` | Opus 4.6 | Latest Opus |
| `claude-sonnet-4-6-20251114` | Sonnet 4.6 | Latest Sonnet |
| `claude-opus-4-7` | Opus 4.7 | Upcoming |

### Model Aliases
| Alias | Resolves To |
|---|---|
| `sonnet` | Latest Sonnet (4.6) |
| `opus` | Latest Opus (4.6) |
| `haiku` | Latest Haiku (4.5) |

### Fast Mode
- `claude-opus-4-6-fast` - Fast variant of Opus 4.6
- Uses same model, faster output generation

## Streaming

### Response Format
- Server-Sent Events (SSE) based streaming
- Supports `converse-stream` endpoint for Bedrock
- Anthropic API uses native message streaming

### Stream Events
```
message_start     → Initial message metadata
content_block_start → Begin text/tool_use block
content_block_delta  → Text/delta content
content_block_stop   → End block
message_delta     → Stop reason, usage
message_stop      → Final event
```

### Stream JSON Mode
`--output-format=stream-json` provides real-time streaming output:
- `--include-partial-messages` for chunk-level updates
- `--include-hook-events` for hook lifecycle events
- `--input-format=stream-json` for real-time input

## Error Handling

### Common API Errors
| Error | Code | Description |
|---|---|---|
| `RateLimitError` | 429 | Rate limit exceeded |
| `APIStatusError` | 4xx/5xx | General API error |
| `duplicate tool_use ID` | 400 | Duplicate tool use in conversation |
| `tool_use/tool_result pairing mismatch` | 400 | Strict mode pairing violation |

### Retry Logic
- Exponential backoff on 429/5xx errors
- Automatic fallback model support (`--fallback-model`)
- Only works with `--print` mode

## Usage & Cost Tracking

### Token Counting
- Input tokens (including cache read/write)
- Output tokens
- Cache creation tokens (ephemeral 1h, ephemeral 5m)
- Server tool use (web search, web fetch counts)

### Cost Reporting
- Real-time cost tracking per session
- Budget limits (`--max-budget-usd`, print mode only)
- Service tier reporting (standard, priority, batch)

### Usage Output Schema
```typescript
{
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number | null;
    cache_read_input_tokens: number | null;
    server_tool_use: {
      web_search_requests: number;
      web_fetch_requests: number;
    } | null;
    service_tier: ("standard" | "priority" | "batch") | null;
    cache_creation: {
      ephemeral_1h_input_tokens: number;
      ephemeral_5m_input_tokens: number;
    } | null;
  }
}
```

## Domain Safety

### Domain Checking
- Pre-fetch domain validation via `/api/web/domain_info`
- Blocked domain list enforcement
- Organization policy compliance

### Country Restrictions
- Service availability: `https://www.anthropic.com/supported-countries`
- Domain-level egress blocking
- `EgressBlockedError` for unauthorized access

## Redaction & Privacy

### Sensitive Data Redaction
```javascript
// Redaction patterns for API keys, tokens, etc.
{
  redactSensitiveKeys: true,
  redactObject: true,
  redact: true
}
```

### Privacy Settings
- Training data opt-out: "Allow the use of your chats and coding sessions to train and improve Anthropic AI models"
- Managed settings can enforce privacy policies
- Legal references: `https://www.anthropic.com/legal/aup`, `https://www.anthropic.com/legal/consumer-terms`
