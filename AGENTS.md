# Kaspa Explained MCP Access

Use this remote HTTP MCP endpoint:

```text
https://remote-mcp-server-authless.parker2017.workers.dev/mcp
```

Use this health URL to verify the Worker is live:

```text
https://remote-mcp-server-authless.parker2017.workers.dev/health
```

Do not use `https://mcp.kaspaexplained.com/mcp`. The custom domain is not part of the current setup.

If a browser or plain GET request to `/mcp` returns this error, the Worker can still be healthy:

```json
{"jsonrpc":"2.0","error":{"code":-32000,"message":"Not Acceptable: Client must accept text/event-stream"},"id":null}
```

MCP clients must connect using remote HTTP MCP and include an `Accept` header that allows `text/event-stream`.

Available tools:

- `get_kaspa_explained_index`
- `search_kaspa_explained`
- `read_kaspa_explained`
- `check_kaspa_claim`
- `get_kaspa_status_context`
