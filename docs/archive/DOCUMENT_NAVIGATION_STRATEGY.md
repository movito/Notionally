---
title: Document Navigation and Reference Strategy
version: 1.0.0
last_updated: 2025-01-10
category: architecture
status: active
---

# Document Navigation and Reference Strategy

## Current Reference Patterns

### 1. Direct Path References
- Agents use: `/coordination/testing-strategy/TEST-RUNNER-GUIDE.md`
- Cross-docs use: `VERSION_HISTORY.md`, `ROADMAP.md`
- Problem: Break when files move

### 2. User Navigation
- Currently: Users must know exact file locations
- No central index or navigation structure
- Difficult to discover related documents

## Proposed Solution: Multi-Layer Navigation

### Layer 1: Central Index File (`/docs/INDEX.md`)
```markdown
# notionally Documentation Index

## Quick Links
- [Architecture Overview](./architecture/CLAUDE.md)
- [Development Setup](./setup/README.md)
- [Security Guidelines](./security/README.md)
- [Version History](./architecture/VERSION_HISTORY.md)
- [Roadmap](../coordination/ROADMAP.md)

## By Category
### Architecture & Design
- [System Architecture](./architecture/CLAUDE.md) - Main project context
- [Version History](./architecture/VERSION_HISTORY.md) - Release tracking

### Development
- [Development Safeguards](./development/DEVELOPMENT_SAFEGUARDS.md) - What not to break
- [Safe Development Process](./development/SAFE_DEVELOPMENT_PROCESS.md) - How to develop
```

### Layer 2: Category Index Files
Each subdirectory gets its own `README.md` with:
- Overview of that category
- List of documents with descriptions
- Related documents in other categories

Example `/docs/security/README.md`:
```markdown
# Security Documentation

## Documents
- [Security Audit](./SECURITY-AUDIT-CRITICAL.md) - Critical security analysis
- [Security Upgrade Plan](./SECURITY_UPGRADE_PLAN.md) - Phased improvement strategy
- [Protection Summary](./PROTECTION_SUMMARY.md) - Current protections

## Related
- [Development Safeguards](../development/DEVELOPMENT_SAFEGUARDS.md)
- [Test Runner Guide](../../coordination/testing-strategy/TEST-RUNNER-GUIDE.md)
```

### Layer 3: Document Aliases/Shortcuts
Create symbolic references that won't break:

#### Option A: Alias Mapping File (`.claude/doc-aliases.json`)
```json
{
  "aliases": {
    "CLAUDE": "/docs/architecture/CLAUDE.md",
    "VERSION_HISTORY": "/docs/architecture/VERSION_HISTORY.md",
    "TEST_GUIDE": "/coordination/testing-strategy/TEST-RUNNER-GUIDE.md",
    "SAFEGUARDS": "/docs/development/DEVELOPMENT_SAFEGUARDS.md"
  }
}
```

#### Option B: Legacy Redirect Files
Leave small stub files in old locations:
```markdown
# This document has moved
Please see: [/docs/architecture/CLAUDE.md](/docs/architecture/CLAUDE.md)
```

### Layer 4: Smart Agent References
Update agent configurations to use relative paths from project root:

```yaml
# In .claude/agents/test-runner.md
references:
  - /coordination/testing-strategy/TEST-RUNNER-GUIDE.md
  - /docs/architecture/VERSION_HISTORY.md
```

## Migration Strategy with Navigation

### Phase 1: Prepare Navigation
1. Create `/docs/INDEX.md` as central hub
2. Create category README files
3. Set up alias mapping

### Phase 2: Move Files
1. Move files to new locations
2. Add YAML frontmatter with version info
3. Update internal cross-references

### Phase 3: Update References
1. Update agent configurations
2. Update README.md
3. Add redirect stubs if needed

### Phase 4: Documentation
1. Update CLAUDE.md with new structure
2. Add navigation instructions to main README
3. Document the alias system

## Benefits of This Approach

1. **Multiple Access Paths**
   - Direct path for those who know it
   - Index navigation for discovery
   - Aliases for common references

2. **Resilient to Future Changes**
   - Alias mapping can be updated without breaking references
   - Index files provide stable navigation
   - Category structure allows growth

3. **Agent-Friendly**
   - Agents can use INDEX.md to discover documents
   - Aliases provide stable references
   - Clear path structure

4. **User-Friendly**
   - Easy discovery through indexes
   - Logical categorization
   - Quick access to common docs

## Example Navigation Flows

### User Looking for Security Docs:
1. Start at `/docs/INDEX.md`
2. Navigate to Security section
3. Or go directly to `/docs/security/README.md`

### Agent Needing Test Guide:
1. Reference stays as `/coordination/testing-strategy/TEST-RUNNER-GUIDE.md`
2. No change needed (coordination folder unchanged)

### Finding Version Info:
1. Old: Look for VERSION_HISTORY.md in root
2. New: Check `/docs/INDEX.md` → Architecture section
3. Or use alias: `VERSION_HISTORY` → `/docs/architecture/VERSION_HISTORY.md`

## Implementation Checklist

- [ ] Create `/docs/INDEX.md` with all document links
- [ ] Create category README files
- [ ] Set up document aliases
- [ ] Add YAML frontmatter to all docs
- [ ] Update agent references
- [ ] Test navigation paths
- [ ] Document the system in main README