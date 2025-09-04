---
title: Architecture Documentation
version: 1.0.0
last_updated: 2025-01-10
category: architecture
status: active
---

# Architecture Documentation

This directory contains core architecture and design documents for the Notionally project.

## Documents

### Core Architecture
- [CLAUDE.md](./CLAUDE.md) - **Primary Reference**: Complete project context and architecture
  - System components and data flow
  - Notion database schema
  - Configuration details
  - Development practices

### Version Tracking
- [VERSION_HISTORY.md](./VERSION_HISTORY.md) - Complete version history with release notes
- [CHANGELOG.md](./CHANGELOG.md) - Detailed change log

## Quick Reference

### System Architecture
```
LinkedIn Feed → Greasemonkey Script → Local Node.js Server → Dropbox → Notion API
```

### Current Version
See [VERSION_HISTORY.md](./VERSION_HISTORY.md) for the latest version and changes.

## Related Documentation

- [Development Safeguards](../development/DEVELOPMENT_SAFEGUARDS.md) - What not to break
- [Safe Development Process](../development/SAFE_DEVELOPMENT_PROCESS.md) - How to develop
- [Security Overview](../security/PROTECTION_SUMMARY.md) - Security measures
- [Setup Guides](../setup/) - Installation and configuration

## For Agents

Key files agents should reference:
- `CLAUDE.md` - Project context (always read first)
- `VERSION_HISTORY.md` - Track versions
- Development roadmap at `/coordination/ROADMAP.md`

## Navigation

- [Back to Index](../INDEX.md)
- [Development Docs](../development/)
- [Security Docs](../security/)