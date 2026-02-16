# Contributing to mpx-api

Thanks for your interest in contributing to mpx-api! We welcome contributions from the community.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/mesaplex/mpx-api.git
cd mpx-api

# Install dependencies
npm install

# Link for local development
npm link

# Run tests
npm test
```

## Testing

All pull requests must include tests. We use Node.js built-in test runner.

Run tests:
```bash
npm test
```

Add tests in the `test/` directory with the `.test.js` extension.

## Code Style

- Use ES modules (import/export)
- 2-space indentation
- Semicolons required
- Descriptive variable names
- Comment complex logic

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to your fork (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## Feature Requests

Open an issue with the "enhancement" label. Please include:
- Use case / problem you're trying to solve
- Proposed solution
- Alternative solutions considered

## Bug Reports

Open an issue with the "bug" label. Please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- mpx-api version (`mpx-api --version`)
- Node.js version (`node --version`)
- Operating system

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
