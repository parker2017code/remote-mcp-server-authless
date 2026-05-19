# Kaspa Explained MCP

This Cloudflare Worker exposes a public, read-only MCP endpoint for Kaspa Explained.

Planned public endpoint:

```text
https://mcp.kaspaexplained.com/mcp
```

Health check:

```text
https://mcp.kaspaexplained.com/
https://mcp.kaspaexplained.com/health
```

The Worker also keeps `workers.dev` enabled, so Cloudflare may provide a fallback endpoint in this form after deployment:

```text
https://remote-mcp-server-authless.<your-account-subdomain>.workers.dev/mcp
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
			"url": "https://mcp.kaspaexplained.com/mcp"
		}
	}
}
```

Example files are in `examples/`:

- `examples/mcp-servers.remote-http.json`
- `examples/servers.remote-http.json`

After deployment, verify the access point before adding it to clients:

```bash
curl https://mcp.kaspaexplained.com/health
```

The response should include `status: "ok"` and list the available tool names.

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

The deployment config attaches `mcp.kaspaexplained.com` as a Cloudflare Workers custom domain through `wrangler.jsonc`:

```jsonc
"routes": [
	{
		"pattern": "mcp.kaspaexplained.com",
		"custom_domain": true
	}
]
```

If deploying from a non-interactive environment, set `CLOUDFLARE_API_TOKEN` first.

Cloudflare custom-domain requirements:

- The zone for `kaspaexplained.com` must be active in the Cloudflare account used for deployment.
- `mcp.kaspaexplained.com` must not already have a conflicting CNAME record.
- Custom Domains match the exact hostname, so `mcp.kaspaexplained.com` is separate from `www.mcp.kaspaexplained.com`.
