# Kaspa Explained MCP

This Cloudflare Worker exposes a public, read-only MCP endpoint for Kaspa Explained.

## Agent Access

Agents and MCP clients should use this remote HTTP MCP URL:

```text
https://remote-mcp-server-authless.parker2017.workers.dev/mcp
```

Check health here:

```text
https://remote-mcp-server-authless.parker2017.workers.dev/health
```

Do not use `https://mcp.kaspaexplained.com/mcp`; the custom domain is not part of the current setup.

Public endpoint:

```text
https://remote-mcp-server-authless.parker2017.workers.dev/mcp
```

Health check:

```text
https://remote-mcp-server-authless.parker2017.workers.dev/
https://remote-mcp-server-authless.parker2017.workers.dev/health
```

## What It Does

The Worker fetches the public Kaspa Explained agent index:

```text
https://kaspaexplained.com/agent-index.json
```

It then exposes MCP tools for agents:

- `get_kaspa_explained_index` - return index metadata, scope, and guidance.
- `search_kaspa_explained` - search public Kaspa Explained pages and reference files.
- `read_kaspa_explained` - read one public page or reference file by path or URL.
- `check_kaspa_claim` - retrieve claim-checking context and cited passages.
- `get_kaspa_status_context` - return compact status context for Toccata, smart contracts, and claims.

## Design

This server is deliberately simple and cheap:

- No embeddings.
- No vector database.
- No server-side LLM answering.
- No wallet, account, private-data, or write tools.

The calling AI agent supplies the model. This MCP server only retrieves public, source-labeled Kaspa Explained content and reminds agents to keep mainnet, ecosystem-live, testnet, targeted, roadmap, research, and unsupported claims separate.

Auth is not required while the tools are public and read-only. Add authentication before exposing private sources or write-capable tools.

## Client Examples

Use the remote HTTP endpoint in MCP clients that support hosted MCP servers:

```json
{
	"mcpServers": {
		"kaspa-explained": {
			"type": "http",
			"url": "https://remote-mcp-server-authless.parker2017.workers.dev/mcp"
		}
	}
}
```

Example files are in `examples/`:

- `examples/mcp-servers.remote-http.json`
- `examples/servers.remote-http.json`

After deployment, verify the access point before adding it to clients:

```bash
curl https://remote-mcp-server-authless.parker2017.workers.dev/health
```

The response should include `status: "ok"` and list the available tool names.

If a browser or plain GET request to `/mcp` returns `Not Acceptable: Client must accept text/event-stream`, the Worker is reachable. MCP clients must connect using the remote HTTP MCP protocol and include `Accept: application/json, text/event-stream`.

## Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Type-check:

```bash
npm run type-check
```

Deploy:

```bash
npm run deploy
```

If deploying from a non-interactive environment, set `CLOUDFLARE_API_TOKEN` first.
