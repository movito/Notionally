# Versioning Standards for Notionally

## Core Principle: One Version, One Script

**CRITICAL**: There should only be ONE production script at any given version number.

## Semantic Versioning Rules

We follow semantic versioning (SemVer) strictly:
- **MAJOR.MINOR.PATCH** (e.g., 1.7.0)
- **MAJOR**: Breaking changes (increment to 2.0.0)
- **MINOR**: New features, backwards compatible (1.6.0 → 1.7.0)
- **PATCH**: Bug fixes only (1.7.0 → 1.7.1)

## File Naming Convention

### Production Script
```
linkedin-notion-saver-v1.7.1.user.js
```
- Include version number in filename for clarity
- Version must match @version header inside the script
- This is the ONLY script users should install
- When updating, rename file to match new version

### Development/Testing Scripts
```
linkedin-notion-saver-dev.user.js       # Development version
linkedin-notion-saver-debug.user.js     # Debug version with extra logging
linkedin-notion-saver-test.user.js      # Test version for new features
```

### Deprecated Scripts (for archive only)
```
archive/
├── v1.6.0/
│   └── linkedin-notion-saver.user.js   # Archived version 1.6.0
├── v1.5.0/
│   └── linkedin-notion-saver.user.js   # Archived version 1.5.0
```

## Version Synchronization

These files MUST have matching version numbers:
1. `greasemonkey-script/linkedin-notion-saver.user.js` (@version header)
2. `local-app/package.json` (version field)
3. Git tags (when releasing)

## What NOT to Do

❌ **NEVER** create multiple scripts with version numbers in filenames:
- `linkedin-notion-saver-v1.7.0.user.js`
- `linkedin-notion-saver-v1.7.0-with-investigation.user.js`
- `linkedin-notion-saver-v1.7.0-debug.user.js`

This creates confusion about which is the "real" v1.7.0.

❌ **NEVER** have different features at the same version number

❌ **NEVER** increment version without updating all synchronized files

## Version Management Workflow

### Adding a New Feature
1. Increment MINOR version (1.6.0 → 1.7.0)
2. Update `linkedin-notion-saver.user.js` @version header
3. Update `local-app/package.json` version
4. Commit with message: "Release v1.7.0: [feature description]"
5. Tag: `git tag v1.7.0`

### Fixing a Bug
1. Increment PATCH version (1.7.0 → 1.7.1)
2. Update both files
3. Commit with message: "Fix: [bug description] (v1.7.1)"
4. Tag: `git tag v1.7.1`

### Testing New Features
1. Use `linkedin-notion-saver-dev.user.js`
2. Keep @version as "dev" or next planned version
3. Once tested, merge into main script and increment version

## Current Status Action Items

### Files to Rename/Remove:
- `linkedin-notion-saver-v1.6.0.user.js` → Archive or update to current
- `linkedin-notion-saver-v1.7.0.user.js` → Rename to `linkedin-notion-saver.user.js`
- `linkedin-notion-saver-with-investigation.user.js` → Merge or remove
- `comment-investigation-addon.user.js` → Keep as separate addon
- `linkedin-link-appender-v1.0.0.user.js` → Rename to `linkedin-link-appender.user.js`

### Version Decision:
Current features suggest we should be at v1.7.0:
- v1.6.0: Base LinkedIn to Notion saving
- v1.7.0: Added comment appending feature

## Enforcement Script

Run `npm run check-versions` to verify all versions match.

## Special Cases

### Add-ons and Extensions
Separate tools can have their own versioning:
- `linkedin-link-appender.user.js` - Separate tool, own versioning
- `comment-investigation-addon.user.js` - Debug tool, own versioning

These should NOT share version numbers with the main script.

## Version History Tracking

Maintain a CHANGELOG.md with:
```markdown
## [1.7.0] - 2025-01-06
### Added
- Comment appending feature
- "Append to last save" menu item

## [1.6.0] - 2025-01-05
### Added
- Initial LinkedIn to Notion saving
```

## Summary

**One version, one script.** Multiple features at different stages = different version numbers, not different filenames.