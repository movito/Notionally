# Changelog

All notable changes to Notionally will be documented in this file.

## [2.0.0] - 2025-01-09

### Added
- **Modular Architecture** - Complete refactor with service layer pattern
  - `PostProcessingService` for centralized post processing logic
  - `URLResolutionService` for LinkedIn URL unfurling
  - `ConfigManager` for centralized configuration management
  - Utility modules to reduce code duplication by 30%
- **URL Unfurling** - Automatic resolution of LinkedIn shortened URLs (lnkd.in)
  - Multiple resolution methods (unshorten.it API, HEAD requests, HTML parsing)
  - Correctly extracts destination URLs from LinkedIn's interstitial pages
  - Filters out static assets and CDN URLs
- **Debug Information** - Comprehensive debug tracking
  - Client-side debug logs collected in Greasemonkey script
  - Server-side processing logs
  - All debug info saved to Notion for troubleshooting
- **Performance Improvements**
  - Parallel processing for videos and images
  - 5x faster image processing with concurrent downloads
  - Request ID tracking for better debugging
  - Graceful error handling with proper HTTP status codes

### Changed
- Upgraded to modular architecture with service layer
- Improved error handling with custom error classes
- Enhanced validation for all inputs
- Better separation of concerns across modules

### Fixed
- LinkedIn URL unfurling now works correctly
- Notion API validation errors (changed "plaintext" to "plain text")
- Static assets no longer mistaken for destination URLs
- Videos and images process correctly in parallel

## [1.6.0] - 2025-01-08

### Added
- Debug information collection in Greasemonkey script
- Debug blocks in Notion pages

### Changed
- Script version tracking for better debugging

## [1.5.7] - 2025-01-07

### Added
- Initial URL unfurling attempts
- Pattern matching for LinkedIn redirect pages

## [1.0.0] - 2025-01-01

### Added
- Initial release
- LinkedIn post saving to Notion
- Video download and processing
- Dropbox integration
- Greasemonkey script for Firefox