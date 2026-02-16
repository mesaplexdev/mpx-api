# mpx-api 🚀

**Developer-first API testing, mocking, and documentation CLI.**

No GUI. No proprietary formats. Just powerful, git-friendly API testing from your terminal.

[![npm version](https://img.shields.io/npm/v/mpx-api.svg)](https://www.npmjs.com/package/mpx-api)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Why mpx-api?

- **Git-friendly**: Collections are YAML files, not proprietary blobs
- **CI/CD ready**: Exit codes, JSON output, no GUI dependency
- **Developer experience**: Beautiful terminal output, syntax highlighting
- **Request chaining**: Use response from one request in another (`{{request.response.body.id}}`)
- **Built-in mock server**: Test against OpenAPI specs without deploying
- **Assertions in collections**: No separate test code needed
- **Fast**: Pure Node.js, minimal dependencies, < 200ms startup

## Installation

```bash
npm install -g mpx-api
```

Or use with `npx`:

```bash
npx mpx-api get https://api.github.com/users/octocat
```

## Quick Start

### Make HTTP Requests

```bash
# Simple GET request
mpx-api get https://jsonplaceholder.typicode.com/users

# POST with JSON
mpx-api post https://api.example.com/users --json '{"name":"Alice","email":"alice@example.com"}'

# Custom headers
mpx-api get https://api.example.com/protected \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json"

# Verbose output (show headers)
mpx-api get https://httpbin.org/get -v

# Quiet mode (only response body)
mpx-api get https://api.example.com/data -q
```

### Create a Collection

```bash
# Initialize collection in your project
mpx-api collection init

# Add requests
mpx-api collection add get-users GET /users
mpx-api collection add create-user POST /users --json '{"name":"Bob"}'

# Run the collection
mpx-api collection run
```

### Collection File Format

Collections are simple YAML files (`.mpx-api/collection.yaml`):

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
      body.email: { exists: true }

  - name: create-post
    method: POST
    url: /posts
    json:
      title: New Post
      userId: {{get-users.response.body[0].id}}
    assert:
      status: 201
      body.title: New Post
```

**Key features:**

- **Request chaining**: `{{get-users.response.body[0].id}}` uses the response from a previous request
- **Environment variables**: `{{env.API_TOKEN}}` pulls from environment files
- **Assertions**: Test status codes, response times, body fields, headers
- **Operators**: `gt`, `lt`, `gte`, `lte`, `eq`, `ne`, `contains`, `exists`

### Environments

```bash
# Initialize environments (creates dev, staging, production)
mpx-api env init

# Set variables
mpx-api env set staging API_URL=https://staging.example.com
mpx-api env set staging API_TOKEN=abc123

# List environments
mpx-api env list

# List variables in environment
mpx-api env list staging

# Run collection with environment
mpx-api collection run --env staging
```

Environment files (`.mpx-api/environments/staging.yaml`):

```yaml
name: staging
variables:
  API_URL: https://staging.example.com
  API_TOKEN: secret-token-here
```

### Testing & Assertions

```bash
# Run tests from collection
mpx-api test ./collection.yaml

# With environment
mpx-api test ./collection.yaml --env production

# JSON output for CI/CD
mpx-api test ./collection.yaml --json
```

Assertions support:

- **Status codes**: `status: 200`
- **Response time**: `responseTime: { lt: 500 }`
- **Headers**: `headers.content-type: application/json`
- **Body fields**: `body.users[0].name: Alice`
- **Operators**:
  - `{ gt: 10 }` - greater than
  - `{ lt: 100 }` - less than
  - `{ gte: 5 }` - greater than or equal
  - `{ lte: 50 }` - less than or equal
  - `{ eq: "value" }` - equals
  - `{ ne: "value" }` - not equals
  - `{ contains: "text" }` - contains substring
  - `{ exists: true }` - field exists

### Request History

```bash
# View recent requests
mpx-api history

# Limit to last 50
mpx-api history -n 50
```

### Cookie Management

Cookies are automatically saved and sent with subsequent requests. Cookie jar is stored at `~/.mpx-api/cookies.json`.

## Pro Features 💎

Upgrade to **mpx-api Pro** ($12/mo) for advanced features:

### Mock Server

Start a mock API server from an OpenAPI spec:

```bash
mpx-api mock ./openapi.yaml --port 4000
```

Supports:
- OpenAPI 3.0 specs (YAML or JSON)
- Automatic response generation from schemas
- Configurable response delay: `--delay 200`
- CORS support: `--cors`

### Load Testing

```bash
mpx-api load https://api.example.com/health --rps 100 --duration 30s
```

Features:
- Requests per second (RPS) control
- Response time percentiles (P50, P95, P99)
- Status code distribution
- Error tracking

### Documentation Generation

Generate beautiful API docs from your collections:

```bash
mpx-api docs ./collection.yaml --output API.md
```

Creates Markdown documentation with:
- Table of contents
- Request/response examples
- Expected responses from assertions
- Auto-generated from your test collections

### Request Chaining

Already included in free tier! Use response data from previous requests:

```yaml
requests:
  - name: login
    method: POST
    url: /auth/login
    json:
      username: test
      password: secret

  - name: get-profile
    method: GET
    url: /users/me
    headers:
      Authorization: Bearer {{login.response.body.token}}
```

## Examples

See the `examples/` directory for real-world collections:

- `jsonplaceholder.yaml` - CRUD operations with JSONPlaceholder API
- `github-api.yaml` - GitHub API with request chaining
- `openapi-petstore.yaml` - OpenAPI spec for mock server testing

Run examples:

```bash
mpx-api test examples/jsonplaceholder.yaml
mpx-api collection run examples/github-api.yaml
```

## CI/CD Integration

Use exit codes for CI/CD pipelines:

```bash
# In your CI script
mpx-api test ./api-tests.yaml --env production

# Exit code 0 = all tests passed
# Exit code 1 = tests failed
```

GitHub Actions example:

```yaml
- name: Run API Tests
  run: npx mpx-api test ./tests/api-collection.yaml --env staging
```

## Error Handling

mpx-api gracefully handles:

- **DNS failures**: Clear error messages
- **Timeouts**: Configurable with `--timeout <ms>`
- **SSL errors**: Skip verification with `--no-verify`
- **Invalid JSON**: Parse errors with helpful messages
- **Large responses**: Automatic truncation in terminal (full body still accessible)

## Configuration

Global config: `~/.mpx-api/config.json`  
Project config: `.mpx-api/config.json`  
Cookie jar: `~/.mpx-api/cookies.json`  
History: `~/.mpx-api/history.jsonl`

## Comparison

| Feature | mpx-api | Postman | HTTPie Pro | curl |
|---------|---------|---------|------------|------|
| **Price** | Free / $12 Pro | $49/user | $9/mo | Free |
| **Collections** | ✅ YAML files | ✅ Proprietary | ❌ | ❌ |
| **Request chaining** | ✅ | ✅ | ❌ | ❌ |
| **Assertions** | ✅ Built-in | ✅ Scripts | ❌ | ❌ |
| **Mock server** | ✅ Pro | ✅ Pro | ❌ | ❌ |
| **Load testing** | ✅ Pro | ✅ Pro | ❌ | ❌ |
| **Git-friendly** | ✅ | ⚠️ Export needed | N/A | N/A |
| **No GUI needed** | ✅ | ❌ | ✅ | ✅ |
| **Syntax highlighting** | ✅ | ✅ | ✅ | ❌ |

## Development

```bash
# Clone and install
git clone https://github.com/mesaplex/mpx-api.git
cd mpx-api
npm install

# Run tests
npm test

# Link for local development
npm link
```

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## License

MIT © Mesaplex

## Support

- **Issues**: [GitHub Issues](https://github.com/mesaplex/mpx-api/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mesaplex/mpx-api/discussions)
- **Email**: support@mpx-api.dev

---

**Built with ❤️ by developers, for developers.**
