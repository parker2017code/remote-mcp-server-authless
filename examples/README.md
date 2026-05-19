# Client Examples

Use these examples only after the Worker is deployed and `https://mcp.kaspaexplained.com/health` returns `status: "ok"`.

Different MCP hosts use different top-level keys:

- `mcp-servers.remote-http.json` uses the common `mcpServers` shape.
- `servers.remote-http.json` uses the common `servers` shape.

Both point to the same remote HTTP MCP endpoint:

```text
https://mcp.kaspaexplained.com/mcp
```
