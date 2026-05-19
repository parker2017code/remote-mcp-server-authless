# Client Examples

Use these examples after the Worker health endpoint returns `status: "ok"`:

```text
https://remote-mcp-server-authless.parker2017.workers.dev/health
```

Different MCP hosts use different top-level keys:

- `mcp-servers.remote-http.json` uses the common `mcpServers` shape.
- `servers.remote-http.json` uses the common `servers` shape.

Both point to the same remote HTTP MCP endpoint:

```text
https://remote-mcp-server-authless.parker2017.workers.dev/mcp
```

A plain browser request to `/mcp` may return `Not Acceptable: Client must accept text/event-stream`. That is expected for a non-MCP request.
