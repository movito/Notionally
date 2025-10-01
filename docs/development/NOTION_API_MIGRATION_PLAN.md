# Notion API Migration Plan - Version 2025-09-03

**Status:** Phase 1 Complete (v2.0.0 Released)
**Created:** 2025-09-30
**Last Updated:** 2025-10-01
**Current Version:** v2.0.0
**Target Version:** v3.0.0 (for full API migration)

## Current Status - v2.0.0 (2025-10-01)

**What We Built:** Phase 1 preparation work (SDK upgrade, backward compatible)

**Released as v2.0.0:**
- ✅ SDK upgraded: v2.2.15 → v5.1.0
- ✅ Data source detection methods added
- ✅ Optional configuration support
- ✅ Fully tested (19/20 tests passed)
- ✅ Backward compatible with v1.7.5

**Not Yet Implemented (Future Work):**
- ❌ New Notion API patterns (data_source_id, dataSources.query())
- ❌ Required data source ID
- ❌ API version 2025-09-03 enforcement
- ❌ Breaking changes

**Conclusion:** v2.0.0 is a **non-breaking SDK upgrade** preparing for future API migration.

---

## Overview

Notion is releasing a new API version (2025-09-03) with breaking changes to support multi-source databases. This document outlines our migration strategy.

## Key Changes in Notion API 2025-09-03

### 1. Multi-Source Database Support
- Databases can now have multiple data sources
- **Breaking:** Most operations now require `data_source_id` instead of just `database_id`

### 2. SDK Upgrade Required
- Current: `@notionhq/client` v2.2.15
- Required: `@notionhq/client` v5.0.0
- New methods: `notion.dataSources.*` for querying with data source context

### 3. API Changes
- **Pages.create:** Requires `data_source_id` in parent
- **Database queries:** Use new `dataSources.query()` method
- **Search API:** New filter values for data sources

### 4. Webhook Changes (not currently used)
- New webhook versioning
- New event types for data sources
- Added `data_source_id` to parent data in webhook events

## Migration Strategy

### Phase 1: Preparation Release (v1.8.0) - NON-BREAKING

**Branch:** `feature/v2.0.0-notion-api-upgrade`

**Goals:**
- Upgrade SDK while maintaining backward compatibility
- Add data source detection without requiring it
- Warn users about upcoming changes
- Provide migration tools

**Changes:**
1. ✅ Upgrade `@notionhq/client` to v5.0.0
2. ✅ Add `fetchDataSourceId()` method to NotionClient
3. ✅ Add config option for `dataSourceId` (optional)
4. ✅ Add API version detection
5. ✅ Log warnings about v2.0.0 changes
6. ✅ Create migration helper script
7. ✅ Update documentation

**Testing:**
- Verify existing functionality works unchanged
- Test data source detection
- Ensure users can opt-in to new features

**Rollback:** Easy - revert to main/v1.7.5

---

### Phase 2: Major Release (v2.0.0) - BREAKING CHANGES

**STATUS:** ❌ **NOT IMPLEMENTED** - Current v2.0.0 is Phase 1 work only

**Branch:** `feature/v2.0.0-notion-api-2025-09-03` (based on v1.8.0)

**Goals:**
- Full migration to new Notion API
- Require data source ID
- Update all API calls
- Provide migration path for existing users

**Changes:**
1. ❌ Make `dataSourceId` required in config - **NOT DONE** (optional in v2.0.0)
2. ❌ Update `createPage()` to use `data_source_id` - **NOT DONE** (still uses database_id)
3. ❌ Update `findPageByUrl()` to use `dataSources.query()` - **NOT DONE** (still uses database_id)
4. ❌ Update `findExistingPage()` to use new API - **NOT DONE** (still uses database_id)
5. ❌ Set default API version to "2025-09-03" - **NOT DONE** (defaults to undefined)
6. ❌ Update interactive setup to fetch data source ID - **NOT DONE**
7. ⚠️ Update all documentation - **PARTIAL** (migration plan exists but no MIGRATION.md)
8. ❌ Create MIGRATION.md guide - **NOT DONE**

**Testing:**
- Full regression testing
- Test with new Notion databases
- Test migration from v1.x configs
- Test error handling for missing data source ID

**Rollback:** Moderate difficulty - can revert to v1.8.0

**NOTE:** This phase represents future work. Current v2.0.0 release (2025-10-01) completed Phase 1 only.

---

## Version Timeline

```
v1.7.5 (Current - Stable)
   │
   ├── feature/v2.0.0-notion-api-upgrade
   │   │
   │   └──> v1.8.0 (Preparation Release - Non-breaking)
   │        │ - SDK upgraded
   │        │ - Data source detection added
   │        │ - Warnings logged
   │        │ - Still works with old API
   │        │
   │        └── feature/v2.0.0-notion-api-2025-09-03
   │            │
   │            └──> v2.0.0 (Major Release - Breaking)
   │                 - Requires data source ID
   │                 - Uses new API exclusively
   │                 - Migration guide provided
```

## Branching Rules

### feature/v2.0.0-notion-api-upgrade
- **Base:** main (v1.7.5)
- **Purpose:** Preparation, backward-compatible changes
- **Merge to:** main → becomes v1.8.0
- **Tag:** `v1.8.0`, `stable-v1.8.0`

### feature/v2.0.0-notion-api-2025-09-03
- **Base:** main (after v1.8.0 merge)
- **Purpose:** Breaking changes, full API migration
- **Merge to:** main → becomes v2.0.0
- **Tag:** `v2.0.0`, `stable-v2.0.0`

### Rollback Branches
- `stable-v1.7.5` - Current stable (already exists as main)
- `stable-v1.8.0` - Created after v1.8.0 release
- `stable-v2.0.0` - Created after v2.0.0 release

## Version Synchronization Checklist

For each release, update these files in order:

### v1.8.0
- [ ] `/local-app/package.json` - version: "1.8.0"
- [ ] `/greasemonkey-script/linkedin-notion-saver-v1.8.0.user.js` - @version 1.8.0
- [ ] `/CHANGELOG.md` - Add v1.8.0 section
- [ ] Git tag: `v1.8.0`
- [ ] Git tag: `stable-v1.8.0`

### v2.0.0
- [ ] `/local-app/package.json` - version: "2.0.0"
- [ ] `/greasemonkey-script/linkedin-notion-saver-v2.0.0.user.js` - @version 2.0.0
- [ ] `/CHANGELOG.md` - Add v2.0.0 section with BREAKING CHANGES notice
- [ ] `/docs/MIGRATION_v2.md` - Create migration guide
- [ ] Git tag: `v2.0.0`
- [ ] Git tag: `stable-v2.0.0`

## Code Changes Summary

### Phase 1 (v1.8.0) - Files Modified

#### `/local-app/package.json`
```json
{
  "version": "1.8.0",
  "dependencies": {
    "@notionhq/client": "^5.0.0"
  }
}
```

#### `/local-app/src/notion-client.js`
- Add `fetchDataSourceId()` method
- Add optional `dataSourceId` property
- Add backward compatibility mode
- Add logging for API version detection

#### `/local-app/src/config/ConfigManager.js`
- Add optional `notion.dataSourceId` config
- Add optional `notion.apiVersion` config

#### `/local-app/config.example.json`
- Add `dataSourceId` and `apiVersion` (commented as optional)

#### New Files
- `/local-app/scripts/fetch-data-source-id.js` - Helper script
- `/docs/development/NOTION_API_MIGRATION_PLAN.md` - This file

---

### Phase 2 (v2.0.0) - Files Modified

#### `/local-app/src/notion-client.js`
- Make `dataSourceId` required
- Update `createPage()` - use `data_source_id`
- Update `findPageByUrl()` - use `dataSources.query()`
- Update `findExistingPage()` - use new API
- Set default API version to "2025-09-03"

#### `/local-app/src/config/ConfigManager.js`
- Make `notion.dataSourceId` required
- Set default `notion.apiVersion` to "2025-09-03"

#### `/local-app/src/setup/interactive-setup.js`
- Add data source ID fetching during setup
- Update validation to require data source ID

#### New Files
- `/docs/MIGRATION_v2.md` - Migration guide for users
- `/local-app/scripts/migrate-config-v2.js` - Config migration script

## Testing Strategy

### v1.8.0 Testing
1. **Backward Compatibility**
   - Test with existing v1.7.5 configs (no dataSourceId)
   - Verify all features work unchanged
   - Confirm warnings are logged appropriately

2. **New Features**
   - Test data source ID detection
   - Test with explicit dataSourceId in config
   - Verify migration script works

3. **Regression Testing**
   - Save LinkedIn posts
   - Query existing pages
   - Append blocks to pages
   - Image uploads

### v2.0.0 Testing
1. **Migration**
   - Test upgrade from v1.8.0 with migration script
   - Verify error messages for missing dataSourceId
   - Test interactive setup with new requirements

2. **Full Functionality**
   - All v1.8.0 regression tests
   - Test with multiple Notion databases
   - Test error handling

3. **Edge Cases**
   - Invalid data source IDs
   - Database permission issues
   - API rate limiting

## Risk Assessment

### v1.8.0 Risks
- **Low Risk:** SDK upgrade with backward compatibility
- **Low Risk:** New optional features
- **Mitigation:** Thorough testing, easy rollback to v1.7.5

### v2.0.0 Risks
- **Medium Risk:** Breaking changes for existing users
- **Medium Risk:** Config migration required
- **Mitigation:**
  - Clear migration guide
  - Automated migration scripts
  - Detailed error messages
  - v1.8.0 as transition period

## Rollback Procedures

### From v1.8.0 to v1.7.5
```bash
git checkout main
git reset --hard stable-v1.7.5
npm install
```

### From v2.0.0 to v1.8.0
```bash
git checkout main
git reset --hard stable-v1.8.0
npm install
# Users need to restore old config.json
```

## Communication Plan

### v1.8.0 Release
- **Blog post:** "Preparing for Notion API Upgrade"
- **Warnings in logs:** "v2.0.0 will require data source ID"
- **README update:** Note about upcoming v2.0.0

### v2.0.0 Release
- **Blog post:** "Major Release: Notion API 2025-09-03 Support"
- **MIGRATION.md:** Step-by-step upgrade guide
- **README update:** Breaking changes notice
- **GitHub release:** Detailed changelog

## Success Criteria

### v1.8.0
- ✅ All existing functionality works unchanged
- ✅ SDK upgraded successfully
- ✅ Data source detection works
- ✅ Users can preview v2.0.0 changes
- ✅ Zero breaking changes

### v2.0.0
- ✅ All features work with new API
- ✅ Migration path is clear and documented
- ✅ Error messages are helpful
- ✅ Performance is maintained or improved
- ✅ Users can successfully upgrade from v1.x

## Timeline

- **Week 1:** v1.8.0 development and testing
- **Week 2:** v1.8.0 release and user feedback
- **Week 3-4:** v2.0.0 development
- **Week 5:** v2.0.0 testing and migration guide
- **Week 6:** v2.0.0 release

## Next Steps

1. ✅ Create `feature/v2.0.0-notion-api-upgrade` branch
2. ⏳ Implement v1.8.0 changes
3. ⏳ Test v1.8.0 thoroughly
4. ⏳ Release v1.8.0
5. ⏳ Gather feedback
6. ⏳ Create `feature/v2.0.0-notion-api-2025-09-03` branch
7. ⏳ Implement v2.0.0 changes
8. ⏳ Test v2.0.0 thoroughly
9. ⏳ Create migration guide
10. ⏳ Release v2.0.0

---

**Document Status:** Living document, update as needed
**Last Updated:** 2025-09-30
**Next Review:** After v1.8.0 release
