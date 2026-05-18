# Kaspa Explained MCP

This Cloudflare Worker exposes a public, read-only MCP endpoint for Kaspa Explained.

Endpoint:

```text
https://remote-mcp-server-authless.<your-account>.workers.dev/mcp
```

If a custom domain is added later, the intended endpoint is:

```text
https://mcp.kaspaexplained.com/mcp
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
