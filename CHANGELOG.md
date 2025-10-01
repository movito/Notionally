# Changelog

All notable changes to Notionally will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-09-30

### Added
- **Notion API 2025-09-03 support** - Major version upgrade for new Notion API
- Upgraded `@notionhq/client` SDK from v2.2.15 to v5.1.0
- Added `fetchDataSourceId()` method to NotionClient for data source detection
- Added `ensureDataSourceId()` helper method for automatic data source ID fetching
- New configuration options:
  - `notion.dataSourceId` (optional, will be required in v2.0.0)
  - `notion.apiVersion` (optional, defaults to latest)
- New npm script: `npm run fetch-data-source-id` - Helper to retrieve data source ID
- Updated `.env.example` with new optional environment variables:
  - `NOTION_DATA_SOURCE_ID`
  - `NOTION_API_VERSION`
- Migration plan documentation in `/docs/development/NOTION_API_MIGRATION_PLAN.md`

### Changed
- NotionClient constructor now accepts optional `apiVersion` parameter
- ConfigManager updated to support optional `dataSourceId` and `apiVersion` from environment
- Warning message shown if data source ID is not configured
- **BREAKING:** SDK upgraded from v2.2.15 to v5.1.0

### Notes
- **Backward compatible:** All existing configurations will continue to work with SDK v5.x
- **Action recommended:** Run `npm run fetch-data-source-id` to get your data source ID
- **Future preparation:** Data source ID will be required in future versions using API 2025-09-03
- SDK upgrade enables future migration to new Notion API patterns
- This is a major version bump due to SDK upgrade (v2.x → v5.x)

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