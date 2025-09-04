---
title: Notionally Documentation Index
version: 1.0.0
last_updated: 2025-01-10
category: navigation
status: active
---

# Notionally Documentation Index

Welcome to the Notionally documentation. This index provides quick access to all project documentation.

## 🚀 Quick Links

- [System Architecture](./architecture/CLAUDE.md) - Complete project context and architecture
- [Version History](./architecture/VERSION_HISTORY.md) - Release notes and version tracking
- [Development Roadmap](../coordination/ROADMAP.md) - Future features and planning
- [Test Runner Guide](../coordination/testing-strategy/TEST-RUNNER-GUIDE.md) - Testing documentation

## 📚 Documentation by Category

### Architecture & Design
- [CLAUDE.md](./architecture/CLAUDE.md) - Main project context document for Claude
- [VERSION_HISTORY.md](./architecture/VERSION_HISTORY.md) - Complete version history
- [CHANGELOG.md](./architecture/CHANGELOG.md) - Detailed change log

### Development
- [DEVELOPMENT_SAFEGUARDS.md](./development/DEVELOPMENT_SAFEGUARDS.md) - Critical: What NOT to break
- [SAFE_DEVELOPMENT_PROCESS.md](./development/SAFE_DEVELOPMENT_PROCESS.md) - How to develop safely
- [INCREMENTAL_SECURITY_STRATEGY.md](./development/INCREMENTAL_SECURITY_STRATEGY.md) - Security implementation approach
- [OPTIMIZATION_GUIDE.md](./development/OPTIMIZATION_GUIDE.md) - Performance optimization guidelines

### Security
- [SECURITY-AUDIT-CRITICAL.md](./security/SECURITY-AUDIT-CRITICAL.md) - Security audit findings
- [SECURITY_UPGRADE_PLAN.md](./security/SECURITY_UPGRADE_PLAN.md) - Phased security improvements
- [PROTECTION_SUMMARY.md](./security/PROTECTION_SUMMARY.md) - Current security measures

### Setup & Configuration
- [DROPBOX_SETUP.md](./setup/DROPBOX_SETUP.md) - Complete Dropbox setup guide
- [DROPBOX_QUICK_SETUP.md](./setup/DROPBOX_QUICK_SETUP.md) - Quick Dropbox configuration
- [DROPBOX_TOKEN_REGENERATION.md](./setup/DROPBOX_TOKEN_REGENERATION.md) - Token renewal guide
- [VIDEO_CAPTURE.md](./setup/VIDEO_CAPTURE.md) - Video handling documentation

### Roadmap & Planning
- [TODO-PROFESSIONAL-ROADMAP.md](./roadmap/TODO-PROFESSIONAL-ROADMAP.md) - Professional development roadmap

### Archive
Historical documents and completed features:
- [MERGE_READINESS_v1.0.4.md](./archive/MERGE_READINESS_v1.0.4.md)
- [MERGE_RESOLUTION.md](./archive/MERGE_RESOLUTION.md)
- [FEATURE_DEVELOPER_BRIEF.md](./archive/FEATURE_DEVELOPER_BRIEF.md)

## 🗂️ Coordination & Tasks

Project management and task tracking (maintained separately):
- [Coordination README](../coordination/README.md) - Task management overview
- [Decisions Log](../coordination/DECISIONS_LOG.md) - Technical decisions record
- [Project Roadmap](../coordination/ROADMAP.md) - Feature planning
- [Current Status](../coordination/STATUS.md) - Project status

## 🤖 Agent Documentation

Agent configurations and instructions:
- [Agent Configurations](../.claude/agents/) - Agent-specific settings
- [Test Runner Agent](../.claude/agents/test-runner.md)
- [Feature Developer Agent](../.claude/agents/feature-developer.md)
- [Coordinator Agent](../.claude/agents/coordinator.md)
- [Security Reviewer Agent](../.claude/agents/security-reviewer.md)

## 📖 How to Navigate

1. **By Topic**: Use the category sections above
2. **By Urgency**: Start with Quick Links for most important docs
3. **By Role**: 
   - Developers → Development section
   - Testers → Test Runner Guide
   - Security → Security section
   - Setup → Setup & Configuration

## 🔍 Finding Documents

If you're looking for:
- **Architecture details** → [CLAUDE.md](./architecture/CLAUDE.md)
- **What not to break** → [DEVELOPMENT_SAFEGUARDS.md](./development/DEVELOPMENT_SAFEGUARDS.md)
- **Version info** → [VERSION_HISTORY.md](./architecture/VERSION_HISTORY.md)
- **Testing guide** → [TEST-RUNNER-GUIDE.md](../coordination/testing-strategy/TEST-RUNNER-GUIDE.md)
- **Current tasks** → [Coordination folder](../coordination/)

## 📝 Document Versioning

All documents in `/docs/` use YAML frontmatter for version tracking:
```yaml
---
title: Document Title
version: 1.0.0
last_updated: 2025-01-10
category: architecture|development|security|setup
status: active|archived|draft
---
```

## 🚨 Important Notes

- The main `README.md` remains in the project root
- Coordination folder maintains its own structure
- Agent configurations stay in `.claude/agents/`
- This reorganization improves navigation while preserving functionality

---

For questions or issues with documentation, check the [main README](../README.md) or consult the [Development Safeguards](./development/DEVELOPMENT_SAFEGUARDS.md).