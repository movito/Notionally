# Changelog

All notable changes to notionally will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2025-10-02

### ⚠️ BREAKING CHANGES

**This is a BREAKING release that requires configuration updates.**

- **Required:** `notion.dataSourceId` must now be configured
- **Required:** Run `npm run fetch-data-source-id` before upgrading
- **API Change:** Now uses Notion API version 2025-09-03 by default
- **Not Compatible:** v2.0.0 configs without `dataSourceId` will not work

### Added
- **Notion API 2025-09-03:** Full implementation of multi-source database support
- **New API Methods:** Using `dataSources.query()` instead of `databases.query()`
- **Required Configuration:** `notion.dataSourceId` is now mandatory
- **Default API Version:** Automatically uses Notion API version 2025-09-03
- **Enhanced Validation:** ConfigManager validates presence of required `dataSourceId`
- **Better Error Messages:** Clear instructions when `dataSourceId` is missing

### Changed
- **BREAKING:** `notion.dataSourceId` changed from optional to required
- **BREAKING:** `pages.create()` now uses `data_source_id` instead of `database_id`
- **BREAKING:** `findPageByUrl()` now uses `dataSources.query()` instead of `databases.query()`
- **BREAKING:** `findExistingPage()` now uses `dataSources.query()` instead of `databases.query()`
- NotionClient constructor now throws error if `dataSourceId` is missing
- Default API version changed from `undefined` to `'2025-09-03'`
- ConfigManager logs now include data source ID and API version

### Migration from v2.0.0

**Required Steps:**
```bash
# 1. Fetch your data source ID
npm run fetch-data-source-id

# 2. Add to your .env file:
NOTION_DATA_SOURCE_ID=your_data_source_id_here

# 3. Or add to config.json:
{
  "notion": {
    "dataSourceId": "your_data_source_id_here"
  }
}

# 4. Upgrade to v3.0.0
git pull origin main
cd local-app && npm install
npm start
```

**Migration Difficulty:** ⭐⭐ Medium (10 minutes, config change required)

### Rollback
If you need to rollback to v2.0.0:
```bash
git checkout v2.0.0
cd local-app && npm install
npm start
```

### Technical Details
- Uses Notion SDK v5.1.0 (unchanged from v2.0.0)
- Implements `data_source_id` parent type in page creation
- All database queries now use data source endpoints
- Maintains backward compatibility with `databaseId` for reference
- Full multi-source database support enabled

### Testing
- TBD: Unit tests for new API patterns
- TBD: Integration tests with real Notion API
- TBD: Migration tests from v2.0.0

### Documentation
- Added `/docs/development/V3.0.0_IMPLEMENTATION_PLAN.md`
- Added `/docs/development/MIGRATION_v3.md` (pending)
- Updated all code comments to reflect v3.0.0 changes

### Notes
- **Why Major Version:** Breaking configuration changes require major version bump
- **Notion Requirement:** Notion may not enforce API 2025-09-03 yet, but we're ready
- **Single User Impact:** As the only user, migration is straightforward
- **Future Proof:** Fully prepared for when Notion enforces new API

---

## [2.0.0] - 2025-10-01

### Added
- **SDK Upgrade:** Upgraded `@notionhq/client` from v2.2.15 to v5.1.0
- **Data Source Support:** Added `fetchDataSourceId()` method to detect Notion data source IDs
- **Helper Method:** Added `ensureDataSourceId()` for automatic data source ID management
- **New Configuration Options** (optional):
  - `notion.dataSourceId` - For future Notion API 2025-09-03 compatibility
  - `notion.apiVersion` - Allows specifying Notion API version
- **Migration Helper:** New npm script `npm run fetch-data-source-id` to retrieve data source ID
- **Environment Variables:** Added support for `NOTION_DATA_SOURCE_ID` and `NOTION_API_VERSION`
- **Documentation:** Comprehensive migration plan and testing documentation

### Changed
- NotionClient constructor now accepts optional `apiVersion` configuration parameter
- ConfigManager updated to load `dataSourceId` and `apiVersion` from environment variables
- Warning message displayed when data source ID is not configured (optional for v2.0.0)

### Technical Details
- **SDK Compatibility:** Upgraded to SDK v5.1.0 while maintaining backward-compatible API patterns
- **API Patterns:** All Notion API calls continue to use `database_id` (not `data_source_id`)
- **Database Structure:** Fixed compatibility with SDK v5.1.0 database response changes (`data_sources` array)
- **Non-Breaking:** All existing v1.7.5 configurations work without modification

### Testing
- **Phase 2 Baseline:** 5/5 tests passed - Module loading, SDK version, syntax validation
- **Phase 3 Real API:** 10/11 tests passed - Live Notion API integration verified
- **Critical Suite:** 4/5 tests passed - Core functionality confirmed (Dropbox optional)
- **Verification:** 2 real Notion pages created during testing

### Notes
- **Backward Compatible:** This is a NON-BREAKING release despite major version bump
- **Major Version Rationale:** SDK major version jump (v2.x → v5.x) justifies app v2.0.0
- **Future Ready:** Preparation for Notion API 2025-09-03 (not yet implemented)
- **Action Optional:** Run `npm run fetch-data-source-id` to prepare for future API versions
- **Migration:** Upgrading from v1.7.5 requires no configuration changes

## [1.7.5] - 2025-01-06

### Fixed
- RESTORED text extraction method from v1.6.0 that was working correctly
- Removed overly complex HTML entity decoding that was not working
- HTML entities are now properly decoded using the simple, proven approach

### Changed  
- Reverted to the simpler text extraction method that uses innerHTML → tempDiv → textContent
- This is the exact method from v1.6.0 that handled entities correctly

### Note
The complex textarea and manual decoding approaches in v1.7.2-1.7.4 were actually breaking entity decoding. The simple approach from v1.6.0 works because the browser automatically decodes entities when setting innerHTML and reading textContent.

## [1.7.4] - 2025-01-06

### Fixed  
- Fixed SCRIPT_VERSION constant not matching actual version (was hardcoded as 1.7.1)
- Improved HTML entity decoding using textarea element method for more reliable decoding
- Added fallback manual decoding for any remaining HTML entities
- HTML entities like `&#x2F;`, `&quot;`, `&#x27;` are now properly decoded

### Changed
- Enhanced entity detection logging to help diagnose issues
- Two-stage decoding approach: textarea element first, then manual fallback

## [1.7.3] - 2025-01-06

### Added
- Script version tracking in Notion - each saved post now records which version of the Greasemonkey script was used
- New "Script version" select field in Notion database to track imports by version

### Changed
- Script version is now included in post data sent to server
- PostProcessingService passes script version to Notion client
- Notion client sets "Script version" field when creating pages

## [1.7.2] - 2025-01-06

### Fixed
- Fixed HTML entity encoding issue where special characters (quotes, apostrophes, slashes) were being sent as HTML entities (&quot;, &#x27;, &#x2F;) instead of plain text
- Improved text extraction to properly decode HTML entities while preserving line breaks

### Added
- Test suite for HTML entity handling (`npm run test-entities`)
- Guardrails to prevent HTML entity encoding regressions

## [1.7.1] - 2025-01-06

### Fixed
- Fixed dropdown detection that was broken in v1.7.0
- Restored investigation features with proper menu handling

### Changed
- Updated versioning standards to include version number in main script filename
- Modified version checker to handle versioned filenames

## [1.7.0] - 2025-01-06

### Added
- Comment appending feature - "Append to last save" menu item in comment dropdowns
- Track last saved post in localStorage for comment appending
- Server endpoint `/append-comment` for adding comments to existing Notion pages
- `appendCommentToPage()` method in Notion client
- Version checking script (`npm run check-versions`)
- Versioning standards documentation

### Changed
- Reorganized Greasemonkey scripts to follow proper naming conventions
- Updated package.json version to match script version
- Removed version numbers from script filenames (now only in @version header)

### Fixed
- Script naming confusion with multiple v1.7.0 variants

## [1.6.0] - 2025-01-02

### Added
- Initial LinkedIn to Notion saving functionality
- Video download and processing capabilities
- Dropbox integration for video storage
- URL unfurling for LinkedIn shortened links
- Comprehensive debug info collection
- "Save to Notion" button in LinkedIn post dropdown menus

### Fixed
- CORS issues with URL resolution
- LinkedIn redirect page detection
- Video extraction from LinkedIn posts

## [1.5.x] - 2024-12

### Added
- Base server infrastructure
- Notion API integration
- Greasemonkey userscript foundation

### Changed
- Various improvements to URL handling
- Enhanced error logging

## [1.0.0] - 2024-11

### Added
- Initial project setup
- Basic LinkedIn post extraction
- Notion database integration