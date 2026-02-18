# mpx-api 🚀

**Developer-first API testing, mocking, and documentation CLI.**

No GUI. No proprietary formats. Just powerful, git-friendly API testing from your terminal.

Part of the [Mesaplex](https://mesaplex.com) developer toolchain.

[![npm version](https://img.shields.io/npm/v/mpx-api.svg)](https://www.npmjs.com/package/mpx-api)
[![License: Dual](https://img.shields.io/badge/license-Dual-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

## Features

- **Git-friendly** — Collections are YAML files, not proprietary blobs
- **CI/CD ready** — Exit codes, JSON output, no GUI dependency
- **Beautiful terminal output** with syntax highlighting
- **Request chaining** — Use response data from one request in another
- **Built-in mock server** — Test against OpenAPI specs without deploying (Pro)
- **Load testing** — RPS control, percentile reporting (Pro)
- **Doc generation** — Generate API docs from collections (Pro)
- **MCP server** — Integrates with any MCP-compatible AI agent
- **Self-documenting** — `--schema` returns machine-readable tool description

## Installation

```bash
npm install -g mpx-api
```

Or run directly with npx:

```bash
npx mpx-api get https://api.github.com/users/octocat
```

**Requirements:** Node.js 18+ · No native dependencies · macOS, Linux, Windows

## Quick Start

```bash
# Simple GET request
mpx-api get https://jsonplaceholder.typicode.com/users

# POST with JSON
mpx-api post https://api.example.com/users --json '{"name":"Alice"}'

# Custom headers
mpx-api get https://api.example.com/protected \
  -H "Authorization: Bearer $TOKEN"

# Verbose output (show headers)
mpx-api get https://httpbin.org/get -v

# Quiet mode (only response body)
mpx-api get https://api.example.com/data -q
```

## Usage

### HTTP Requests

Supports `get`, `post`, `put`, `patch`, `delete`, `head`, and `options`:

```bash
mpx-api get https://api.example.com/users
mpx-api post https://api.example.com/users --json '{"name":"Bob"}'
mpx-api put https://api.example.com/users/1 --json '{"name":"Alice"}'
mpx-api delete https://api.example.com/users/1
```

### Collections

Collections are YAML files for repeatable API test suites:

```bash
# Initialize collection in your project
mpx-api collection init

# Add requests
mpx-api collection add get-users GET /users
mpx-api collection add create-user POST /users --json '{"name":"Bob"}'

# Run the collection
mpx-api collection run
```

Collection file format (`.mpx-api/collection.yaml`):

```yaml
name: My API Tests
baseUrl: https://api.example.com

requests:
  - name: get-users
    method: GET
    url: /users
    headers:
      Authorization: Bearer {{env.API_TOKEN}}
    assert:
      status: 200
      body.length: { gt: 0 }
      responseTime: { lt: 500 }

  - name: get-specific-user
    method: GET
    url: /users/{{get-users.response.body[0].id}}
    assert:
      status: 200
```

Features: request chaining (`{{request.response.body.id}}`), environment variables (`{{env.VAR}}`), built-in assertions.

### Environments

```bash
mpx-api env init                              # Create dev, staging, production
mpx-api env set staging API_URL=https://...   # Set variables
mpx-api env list                              # List environments
mpx-api collection run --env staging          # Run with environment
```

### Testing & Assertions

```bash
mpx-api test ./collection.yaml
mpx-api test ./collection.yaml --env production
mpx-api test ./collection.yaml --json
```

Assertion operators: `gt`, `lt`, `gte`, `lte`, `eq`, `ne`, `contains`, `exists`

### Request History

```bash
mpx-api history         # View recent requests
mpx-api history -n 50   # Last 50
```

### Mock Server (Pro)

```bash
mpx-api mock ./openapi.yaml --port 4000
```

### Load Testing (Pro)

```bash
mpx-api load https://api.example.com/health --rps 100 --duration 30s
```

### Documentation Generation (Pro)

```bash
mpx-api docs ./collection.yaml --output API.md
```

## AI Agent Usage

mpx-api is designed to be used by AI agents as well as humans.

### JSON Output

Add `--json` to any command for structured, machine-readable output:

```bash
mpx-api get https://api.github.com/users/octocat --json
```

```json
{
  "request": {
    "method": "GET",
    "url": "https://api.github.com/users/octocat",
    "headers": {},
    "body": null
  },
  "response": {
    "status": 200,
    "statusText": "OK",
    "headers": { "content-type": "application/json" },
    "body": { "login": "octocat" },
    "responseTime": 145,
    "size": 1234
  }
}
```

### Schema Discovery

```bash
mpx-api --schema
```

Returns a complete JSON schema describing all commands, flags, inputs, outputs, and examples.

### MCP Integration

Add to your MCP client configuration (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "mpx-api": {
      "command": "npx",
      "args": ["mpx-api", "mcp"]
    }
  }
}
```

The MCP server exposes these tools:
- **`http_request`** — Send HTTP requests with full control over method, headers, body
- **`get_schema`** — Get the complete tool schema for dynamic discovery

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (2xx or 3xx HTTP status) |
| 1 | Request failed or 4xx/5xx HTTP status |

### Automation Tips

- Use `--json` for machine-parseable output
- Use `--quiet` to suppress banners and progress info
- Pipe output to `jq` for filtering
- Check exit codes for pass/fail in CI/CD

## CI/CD Integration

```yaml
# .github/workflows/api-tests.yml
- name: Run API Tests
  run: npx mpx-api test ./tests/api-collection.yaml --env staging
```

## Free vs Pro

| Feature | Free | Pro |
|---------|------|-----|
| HTTP requests | ✅ | ✅ |
| Collections & chaining | ✅ | ✅ |
| Environments | ✅ | ✅ |
| Assertions & testing | ✅ | ✅ |
| JSON output | ✅ | ✅ |
| MCP server | ✅ | ✅ |
| Mock server | ❌ | ✅ |
| Load testing | ❌ | ✅ |
| Doc generation | ❌ | ✅ |

**Upgrade to Pro:** [https://mesaplex.com/mpx-api](https://mesaplex.com/mpx-api)

## License

Dual License — Free tier for personal use, Pro license for commercial use and advanced features. See [LICENSE](LICENSE) for full terms.

## Links

- **Website:** [https://mesaplex.com](https://mesaplex.com)
- **npm:** [https://www.npmjs.com/package/mpx-api](https://www.npmjs.com/package/mpx-api)
- **GitHub:** [https://github.com/mesaplexdev/mpx-api](https://github.com/mesaplexdev/mpx-api)
- **Support:** support@mesaplex.com

### Related Tools

- **[mpx-scan](https://www.npmjs.com/package/mpx-scan)** — Website security scanner
- **[mpx-db](https://www.npmjs.com/package/mpx-db)** — Database management CLI
- **[mpx-secrets-audit](https://www.npmjs.com/package/mpx-secrets-audit)** — Secret lifecycle tracking and audit

---

**Made with ❤️ by [Mesaplex](https://mesaplex.com)**
