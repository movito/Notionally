---
title: Development Documentation
version: 1.0.0
last_updated: 2025-01-10
category: development
status: active
---

# Development Documentation

Guidelines, safeguards, and best practices for developing Notionally.

## Documents

### Critical Guidelines
- [DEVELOPMENT_SAFEGUARDS.md](./DEVELOPMENT_SAFEGUARDS.md) - **MUST READ**: What NOT to break
  - LinkedIn integration protection
  - Image handling requirements
  - Critical functionality to preserve

### Development Process
- [SAFE_DEVELOPMENT_PROCESS.md](./SAFE_DEVELOPMENT_PROCESS.md) - Step-by-step safe development
  - Pre-development checklist
  - Testing requirements
  - Rollback procedures

### Strategy Documents
- [INCREMENTAL_SECURITY_STRATEGY.md](./INCREMENTAL_SECURITY_STRATEGY.md) - Phased security approach
- [OPTIMIZATION_GUIDE.md](./OPTIMIZATION_GUIDE.md) - Performance optimization guidelines

## ⚠️ Before You Start

1. **Read [DEVELOPMENT_SAFEGUARDS.md](./DEVELOPMENT_SAFEGUARDS.md)** - Know what not to break
2. **Review recent failures** in the safeguards document
3. **Run tests** before and after changes: `./local-app/scripts/test-critical.sh`
4. **Create a backup branch** before major changes

## Development Workflow

1. Create feature branch: `feature/vX.Y.Z-description`
2. Read existing code before modifying
3. Test incrementally
4. Document changes
5. Run full test suite
6. Update VERSION_HISTORY.md

## Testing Requirements

### Critical Tests (Must Pass)
```bash
cd local-app
./scripts/test-critical.sh
```
Expected: 7/7 tests passing

### Documentation Tests
```bash
./scripts/test-doc-references.sh
```

## Common Pitfalls to Avoid

From our experience:
- ❌ Don't add Helmet middleware (breaks CORS)
- ❌ Don't change Dropbox link format
- ❌ Don't modify core save-post flow
- ❌ Don't "optimize" without testing

## Related Documentation

- [Architecture](../architecture/CLAUDE.md) - System design
- [Security](../security/) - Security guidelines
- [Testing Guide](../../coordination/testing-strategy/TEST-RUNNER-GUIDE.md)
- [Task Management](../../coordination/)

## For Feature Developers

When implementing new features:
1. Check [DEVELOPMENT_SAFEGUARDS.md](./DEVELOPMENT_SAFEGUARDS.md)
2. Follow [SAFE_DEVELOPMENT_PROCESS.md](./SAFE_DEVELOPMENT_PROCESS.md)
3. Test with `test-critical.sh`
4. Document in VERSION_HISTORY.md

## Navigation

- [Back to Index](../INDEX.md)
- [Architecture Docs](../architecture/)
- [Security Docs](../security/)