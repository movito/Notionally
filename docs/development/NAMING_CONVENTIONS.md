# Script Naming and Versioning Conventions

## Semantic Versioning Requirements

All scripts MUST follow semantic versioning (semver):

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Breaking changes or complete rewrites
- **MINOR**: New features, backwards compatible
- **PATCH**: Bug fixes, minor improvements

## File Naming Convention

### Production Scripts
```
linkedin-notion-saver-vMAJOR.MINOR.PATCH.user.js
```

Example: `linkedin-notion-saver-v1.13.0.user.js`

### Debug Scripts
```
linkedin-notion-saver-vMAJOR.MINOR.PATCH-debug.user.js
```

Example: `linkedin-notion-saver-v1.9.1-debug.user.js`

### Special Purpose Scripts
```
linkedin-[purpose]-vMAJOR.MINOR.PATCH.user.js
```

Example: `linkedin-comment-debugger-v1.0.0.user.js`

## Required Header Format

Every script MUST include these elements in the header:

```javascript
// ==UserScript==
// @name         Notionally - [Description]
// @namespace    http://tampermonkey.net/
// @version      MAJOR.MINOR.PATCH
// @description  [Brief description]
// @author       [Author name]
// @match        https://www.linkedin.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
// @grant        none
// ==/UserScript==

/**
 * Created: YYYY-MM-DD HH:MM
 * Version MAJOR.MINOR.PATCH - [What this version does]
 * [Previous version history...]
 */
```

## Timestamp Requirements

### Format
```
Created: YYYY-MM-DD HH:MM
```

Example: `Created: 2024-09-07 01:39`

### Where to Add
- First line of the version history comment block
- Use 24-hour format
- Include timezone if not local

## Version Incrementing Rules

### When to increment PATCH (x.x.+1)
- Bug fixes
- Performance improvements
- Minor text changes
- Debug logging additions

### When to increment MINOR (x.+1.0)
- New features
- New selectors for LinkedIn changes
- Additional data extraction
- New configuration options

### When to increment MAJOR (+1.0.0)
- Complete rewrite
- Breaking changes to data format
- Incompatible server changes
- Architecture changes

## Common Mistakes to Avoid

### ❌ DON'T
- Skip version numbers (1.9.0 → 1.11.0)
- Use non-numeric versions (v1.9.5a)
- Forget to update @version in header
- Mix debug and production in same file
- Create versions without testing

### ✅ DO
- Increment sequentially
- Test before creating new version
- Document what changed
- Keep debug code separate
- Add creation timestamp

## Version Branches

### Development Pattern
```
v1.7.5 (stable base)
  ├── v1.8.0 (add feature A)
  │   ├── v1.8.1 (fix bug in A)
  │   └── v1.8.2 (improve A)
  └── v1.9.0 (add feature B)
      ├── v1.9.1 (fix bug in B)
      └── v1.9.2 (improve B)
```

### Merging Features
When combining features from different branches:
1. Create new minor version
2. Document source versions
3. Test thoroughly
4. Add comprehensive timestamp

Example:
```javascript
/**
 * Created: 2024-09-07 01:39
 * Version 1.13.0 - Combines v1.7.5 (feed posts) + v1.9.5 (Pulse articles)
 */
```

## Debug Versions

### Naming
- Add `-debug` suffix
- Keep same version number as production
- Never promote debug to production

### Purpose
- Extensive logging
- DOM inspection tools
- Performance monitoring
- Never for production use

## Version Tracking

### In Code
```javascript
const SCRIPT_VERSION = '1.13.0';  // Must match @version
```

### In Documentation
- Update SCRIPT_VERSIONS.md
- Include creation timestamp
- Document what works/doesn't work
- Add to timeline

## Cleanup Policy

### Keep
- All working versions
- Latest broken version of each series
- All debug tools

### Archive
- Intermediate broken versions after 30 days
- Move to `/archive/` directory
- Keep documentation references

## Emergency Versioning

If a critical bug is found:
1. Create hotfix on current version (x.x.+1)
2. Document as HOTFIX in header
3. Fast-track testing
4. Update all documentation

Example:
```javascript
/**
 * Created: 2024-09-07 15:30
 * Version 1.13.1 - HOTFIX: Critical bug in text extraction
 */
```

## Agent Guidelines

When creating new versions:

1. **Check existing versions first**
   ```bash
   ls -la linkedin-notion-saver-v*.user.js | tail -5
   ```

2. **Use next sequential version**
   - If latest is v1.13.0, next is v1.13.1 or v1.14.0
   - Never skip numbers

3. **Add timestamp immediately**
   ```javascript
   /**
    * Created: $(date '+%Y-%m-%d %H:%M')
    * Version X.Y.Z - Description
    */
   ```

4. **Update documentation**
   - SCRIPT_VERSIONS.md
   - README.md if production-ready
   - Timeline if significant

## Version Success Criteria

A version is considered successful when:
1. Core functionality works
2. No console errors
3. Tested in clean browser
4. Documentation updated
5. Timestamp added

## Rollback Procedure

If a new version fails:
1. Document failure in SCRIPT_VERSIONS.md
2. Recommend previous working version
3. Keep failed version for analysis
4. Add WARNING to header

```javascript
/**
 * Created: 2024-09-07 01:29
 * WARNING: This version is BROKEN - use v1.13.0 instead
 * Version 1.12.0 - Failed unification attempt
 */
```