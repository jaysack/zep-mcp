# Zep Cloud MCP Server

An MCP (Model Context Protocol) server that wraps the [Zep Cloud](https://www.getzep.com/) API, giving AI assistants long-term memory via Zep's knowledge graph.

## Tools

| Tool | Description |
|------|-------------|
| `zep_search_memory` | Search a user's knowledge graph for facts |
| `zep_add_note` | Add a fact/note to a user's knowledge graph |
| `zep_get_context` | Get memory context for a thread (for prompt injection) |
| `zep_add_messages` | Store messages in a thread for memory extraction |
| `zep_create_user` | Create or ensure a Zep user exists |
| `zep_create_thread` | Create a new conversation thread for a user |

## Setup

```bash
npm install
```

Get your API key from [Zep Cloud](https://app.getzep.com/).

## Usage

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "zep": {
      "command": "node",
      "args": ["/absolute/path/to/zep-mcp/server.mjs"],
      "env": {
        "ZEP_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "zep": {
      "command": "node",
      "args": ["/absolute/path/to/zep-mcp/server.mjs"],
      "env": {
        "ZEP_API_KEY": "your-api-key"
      }
    }
  }
}
```

### OpenClaw / mcporter

```json
{
  "mcpServers": {
    "zep": {
      "command": "node",
      "args": ["./path/to/zep-mcp/server.mjs"],
      "env": {
        "ZEP_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Standalone

```bash
ZEP_API_KEY=your-api-key node server.mjs
```

The server communicates over stdio using JSON-RPC (MCP protocol).

## How It Works

Zep automatically builds a knowledge graph from conversations. The typical workflow:

1. **Create a user** → `zep_create_user`
2. **Create a thread** → `zep_create_thread`
3. **Store messages** → `zep_add_messages` (Zep extracts facts automatically)
4. **Query memories** → `zep_search_memory` or `zep_get_context`
5. **Add direct notes** → `zep_add_note` (for facts not from conversation)

## License

MIT
