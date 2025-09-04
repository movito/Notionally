# Markdown Files Reorganization Plan

## Current State Analysis

### Root Directory (17 files)
Currently cluttered with various markdown files serving different purposes:
- Security documentation (3 files)
- Development guides (3 files)  
- Setup instructions (2 files)
- Version/history tracking (2 files)
- Merge/feature documentation (3 files)
- Architecture docs (1 file)
- Roadmap/planning (1 file)
- README (1 file)

### Existing Organization
- `/coordination/` - Well-organized with tasks, testing, and project management
- `/local-app/` - Contains some Dropbox setup docs
- `/agents/` - Has ROLES.md
- `/.claude/agents/` - Agent configurations (should stay where they are)

## Proposed New Structure

```
/docs/                              # All documentation except coordination
├── README.md                       # Link to main README
├── architecture/                   
│   ├── CLAUDE.md                   # Move from /claude.md
│   ├── VERSION_HISTORY.md          # Track versions
│   └── CHANGELOG.md                # Track changes
├── development/                    
│   ├── DEVELOPMENT_SAFEGUARDS.md   # What not to break
│   ├── SAFE_DEVELOPMENT_PROCESS.md # How to develop safely
│   ├── INCREMENTAL_SECURITY_STRATEGY.md
│   └── OPTIMIZATION_GUIDE.md       # From local-app/
├── security/                       
│   ├── SECURITY-AUDIT-CRITICAL.md  
│   ├── SECURITY_UPGRADE_PLAN.md    
│   └── PROTECTION_SUMMARY.md       
├── setup/                          
│   ├── DROPBOX_SETUP.md           # Consolidate all Dropbox docs
│   ├── DROPBOX_QUICK_SETUP.md     
│   ├── DROPBOX_TOKEN_REGENERATION.md
│   └── VIDEO_CAPTURE.md           
├── roadmap/                        
│   └── TODO-PROFESSIONAL-ROADMAP.md
└── archive/                        # Old/completed docs
    ├── MERGE_READINESS_v1.0.4.md  
    ├── MERGE_RESOLUTION.md         
    └── FEATURE_DEVELOPER_BRIEF.md  

/coordination/                      # KEEP AS IS - Well organized
├── README.md
├── DECISIONS_LOG.md
├── ROADMAP.md
├── STATUS.md
├── tasks/
├── testing-strategy/
└── solutions/

/.claude/                           # KEEP AS IS - Claude-specific
├── agents/                         # Agent configurations
└── settings.local.json

/README.md                          # KEEP IN ROOT - Entry point
/claude.md → /docs/architecture/    # MOVE - Better organized
```

## References to Update

### Critical References
1. **Agent configurations** (.claude/agents/*.md)
   - test-runner.md references TEST-RUNNER-GUIDE.md
   - coordinator.md references VERSION_HISTORY.md and ROADMAP.md

2. **CLAUDE.md** references:
   - VERSION_HISTORY.md 
   - Used by Claude for project context

3. **README.md** references:
   - local-app/docs/DROPBOX_SETUP.md
   - docs/troubleshooting.md (doesn't exist yet)

4. **Code references**:
   - No JavaScript files reference markdown files directly

### Update Strategy
1. Create /docs/ structure
2. Move files to new locations
3. Update all references in:
   - Agent configurations
   - README.md
   - Any markdown files with cross-references
   - Keep redirects/notes in old locations temporarily

## Benefits
1. **Cleaner root** - Only README.md remains
2. **Logical grouping** - Similar docs together
3. **Clear hierarchy** - Easy to find documentation
4. **Separation of concerns** - Operational (coordination/) vs Documentation (docs/)
5. **Scalability** - Room to grow each category

## Migration Steps
1. Create /docs/ directory structure
2. Move files preserving git history
3. Update all references
4. Test agent access to new paths
5. Update .claude/settings.local.json if needed
6. Commit with clear message about reorganization

## Considerations
- Keep `/coordination/` as is - it's well-organized for task management
- Keep `/.claude/` as is - it's Claude-specific configuration
- Main README.md stays in root as entry point
- Consider creating index files in each docs subfolder