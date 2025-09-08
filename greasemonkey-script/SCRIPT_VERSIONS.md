# Greasemonkey Script Versions

## Production Scripts

### Main Script
- **`linkedin-notion-saver-v1.6.0.user.js`** - Stable production version
  - Core functionality: Save LinkedIn posts to Notion
  - Handles text, images, videos, and URLs
  - Production ready

### Latest Development  
- **`linkedin-notion-saver-v1.16.2.user.js`** - ✅ PRODUCTION READY - Italic Support & Visual Feedback
  - Created: 2025-09-07 13:00
  - Fixed: Italic/em tags now properly preserved in Pulse articles
  - Added: Immediate toast notification when saving Pulse articles
  - Improved: Recursive processing of paragraphs, lists, and quotes to preserve inline formatting
  - Better user experience with clear saving status
  - Status: ✅ PRODUCTION READY - Complete formatting support

- **`linkedin-notion-saver-v1.16.1.user.js`** - ✅ Enhanced Author Data
  - Created: 2025-09-07 12:45
  - Improved author extraction from reader-author-info section
  - Captures author name from h2.text-heading-medium
  - Extracts author LinkedIn profile URL
  - Includes author headline/job title
  - Pulse articles now tagged as "LinkedIn Article" in Notion
  - Status: ✅ Working - Superseded by v1.16.2

- **`linkedin-notion-saver-v1.16.0.user.js`** - ✅ Pulse Cover Images
  - Created: 2025-09-07 12:30
  - Extracts and saves Pulse article cover images
  - Cover image appears at top of Notion page with caption
  - Content images still saved separately
  - Processed through Dropbox for embedding
  - Status: ✅ Working - Superseded by v1.16.1

- **`linkedin-notion-saver-v1.15.1.user.js`** - ✅ Refined Text Formatting
  - Created: 2025-09-07 12:25
  - Patch update: Reduced maximum newlines from 3 to 2 for cleaner output
  - All other features identical to v1.15.0
  - Status: ✅ Working - Superseded by v1.16.0

- **`linkedin-notion-saver-v1.15.0.user.js`** - ✅ Custom Pulse Text Extraction
  - Created: 2025-09-07 12:20
  - Built on v1.13.0 base (working feed + Pulse)
  - Custom `extractPulseFormattedContent` function for Pulse articles only
  - Reduces excessive newlines to maximum of 3
  - Converts HTML to clean markdown-style formatting
  - **Important**: Feed post extraction intentionally kept separate (uses direct textContent)
  - Design decision: Different extraction methods for different content types
  - Status: ✅ Working - Superseded by v1.15.1

- **`linkedin-notion-saver-v1.14.0.user.js`** - ⚠️ Mislabeled version
  - File named v1.14.0 but header says v1.13.0
  - Created: 2024-09-07 01:39
  - Identical to v1.13.0 but with investigation features
  - Should be renamed or removed to avoid confusion

- **`linkedin-notion-saver-v1.13.0.user.js`** - ✅ WORKING - Successful Integration!
  - Created: 2024-09-07 01:39
  - Built from proven v1.7.5 base (working feed posts)
  - Added ONLY the Pulse observer from v1.9.5 (working Pulse)
  - Minimal changes to avoid breaking existing functionality
  - Separate observers for feed and Pulse (no conflicts)
  - SPA navigation detection for Pulse articles
  - Status: ✅ WORKING - Both features confirmed working
  - **Note**: Requires clean browser state - reset browser if having issues
  - **Issue**: Uses simple `.textContent` for Pulse causing excessive newlines

- **`linkedin-notion-saver-v1.12.0.user.js`** - ❌ BROKEN Unified Feed + Pulse Support Attempt
  - Combines proven v1.9.5 Pulse implementation with v1.11.0 feed posts
  - Uses exact `observePulseArticleDropdown` function from v1.9.5
  - Watches for `reader-overflow-options__content` class (working in v1.9.5)
  - Maintains all feed post functionality from v1.11.0
  - Includes SPA navigation detection for Pulse articles
  - Status: Production ready - BOTH features working

- **`linkedin-notion-saver-v1.11.0.user.js`** - Enhanced Unified Feed + Pulse Support
  - Complete unified script supporting BOTH feed posts and Pulse articles
  - Enhanced Pulse detection with direct button monitoring
  - Proactive overflow button detection for Pulse articles
  - Re-initialization support for late-loading Pulse content
  - Maintains all v1.10.0 functionality with improved reliability
  - Status: Production ready

- **`linkedin-notion-saver-v1.9.0.user.js`** - Full Pulse Article Support
  - Complete LinkedIn Pulse article saving functionality
  - Detects articles via URL pattern and DOM structure
  - Injects save option in article dropdown menu
  - Extracts full article content with rich formatting
  - Status: Ready for testing

- **`linkedin-notion-saver-v1.7.1.user.js`** - Previous version with investigation features
  - Includes dropdown detection fixes
  - Has integrated investigation features
  - Status: Stable for feed posts

## Investigation & Debug Scripts

### Pulse Article Debug
- **`linkedin-notion-saver-v1.9.1-debug.user.js`** - Pulse article dropdown debugger
  - Comprehensive logging for button clicks and dropdown behavior
  - Captures DOM snapshots before/after clicks
  - Tracks mutation observer activity
  - Floating debug button for manual investigation
  - Console helpers: `pulseDebug.investigate()`, `pulseDebug.logs()`
  - Color-coded console output for easy debugging

### Comment Investigation
- **`linkedin-comment-debugger-v1.0.0-debug.user.js`** - Enhanced telemetry debugger
  - Adds red "Debug Comments" button to posts
  - Captures full DOM snapshots
  - Sends detailed telemetry to server
  - Use for understanding why comments aren't detected

- **`linkedin-notion-saver-v1.6.1-debug.user.js`** - Debug version with investigation functions
  - Includes all debug logging and data collection
  - Press Ctrl+Shift+A for automatic collection
  - Press Ctrl+Shift+D for manual collection

### Development Versions
- **`linkedin-notion-saver-v1.7.0-investigation.user.js`** - Investigation features integrated
  - Adds "Check Comments" option to dropdown
  - Status: Dropdown detection issues

- **`linkedin-notion-saver-v1.7.0-with-investigation.user.js`** - Combined version
  - Full save functionality + investigation
  - Status: Dropdown detection issues

- **`comment-investigation-addon-v1.0.0.user.js`** - Standalone investigation add-on
  - Adds floating purple buttons to posts
  - Works independently of main script
  - Good for testing without affecting main functionality

## Development Timeline

### September 6-7, 2024: The Pulse Article Integration Marathon

| Time | Version | Status | Description |
|------|---------|--------|-------------|
| Sep 6 14:29 | v1.7.5 | ✅ Feed posts work | Baseline working version for feed posts |
| Sep 6 17:30 | v1.8.0 | ❌ Broken | First attempt at Pulse articles |
| Sep 6 23:29 | v1.9.0 | ⚠️ Pulse only | Pulse works, feed posts broken |
| Sep 6 23:38 | v1.9.1-debug | 🔍 Debug tool | Debugging Pulse dropdown |
| Sep 7 00:15 | v1.9.2 | ⚠️ Pulse only | Fixed dropdown detection |
| Sep 7 00:15 | v1.9.3 | ⚠️ Pulse only | Fixed server config |
| Sep 7 00:21 | v1.9.4 | ⚠️ Pulse only | Fixed data extraction |
| Sep 7 00:29 | v1.9.5 | ✅ Pulse works | Working Pulse implementation |
| Sep 7 00:47 | v1.10.0 | ⚠️ Feed only | Fixed feeds, broke Pulse |
| Sep 7 01:09 | v1.11.1-debug | 🔍 Debug tool | More Pulse debugging |
| Sep 7 01:27 | v1.11.0 | ⚠️ Feed only | Enhanced detection (failed) |
| Sep 7 01:29 | v1.12.0 | ❌ Both broken | Unification attempt failed |
| Sep 7 01:39 | v1.13.0 | ✅ BOTH WORK! | Success with clean separation |

**Total time**: ~11 hours of continuous development
**Versions created**: 13 (plus debug tools)
**Final result**: SUCCESS (after browser reset)

## Version History

### v1.13.x Series (Clean Integration)
- v1.13.0 - Built from v1.7.5 base with minimal Pulse additions
  - Started fresh from last known working feed post version (v1.7.5)
  - Added only essential Pulse functions from v1.9.5
  - No modifications to existing feed post code
  - Separate, independent observers for each feature
  - Both features work without interfering with each other

### v1.12.x Series (Working Unified Support)
- v1.12.0 - Combines PROVEN implementations from v1.9.5 (Pulse) + v1.11.0 (feed)
  - Restored exact `observePulseArticleDropdown` function from v1.9.5
  - Uses `reader-overflow-options__content` class that works in production
  - Maintains separate observers for feed and Pulse (no conflicts)
  - SPA navigation detection for Pulse articles
  - Both features confirmed working independently

### v1.11.x Series (Enhanced Unified Support)
- v1.11.0 - Enhanced Pulse article detection with direct button monitoring
  - Added `isPulseArticle()` function for URL-based detection
  - Proactive monitoring of Pulse article overflow button
  - Click handler injection for reliable menu item addition
  - Re-initialization check for late-loading Pulse content
  - Initialization marker to prevent duplicate setup

### v1.10.x Series (Unified Support)
- v1.10.0 - Complete unified script supporting BOTH feed posts and Pulse articles
  - Restored all feed post functionality from v1.7.5 (working version)
  - Added Pulse article support without breaking existing features
  - Maintains toast notifications and success feedback
  - Proper separation of concerns between feed and article handlers
  - Single script solution for better user experience

### v1.9.x Series (Pulse Articles)
- v1.9.5 - Enhanced content formatting preservation
  - Preserves headings, paragraphs, lists, quotes, and links
  - Converts HTML structure to markdown-style formatting
  - Maintains proper spacing between content blocks
  - Handles bold, italic, code blocks, and other formatting
- v1.9.4 - Fixed Pulse article data extraction
  - Author field now sent as top-level string (required by server)
  - Added text field with article content (required by server)
  - Improved selectors based on actual HTML structure
  - Added authorProfileUrl and authorHeadline as separate fields
- v1.9.3 - Fixed server configuration
  - Corrected server port from 7777 to 8765
  - Fixed endpoint from `/linkedin/save` to `/save-post`
  - Now properly saves articles to Notion
- v1.9.2 - Fixed Pulse article dropdown detection based on debug findings
  - Correctly monitors `reader-overflow-options__content` class
  - Watches for class changes indicating dropdown opening
  - Improved menu item structure matching LinkedIn's actual DOM
- v1.9.1 - Debug version with comprehensive logging for Pulse article dropdown behavior
- v1.9.0 - Full LinkedIn Pulse article support with proper dropdown integration

### v1.8.x Series (Initial Pulse)
- v1.8.0 - Initial structure for Pulse article support (incomplete)

### v1.7.x Series (Investigation Features)
- v1.7.5 - Restored HTML entity handling from v1.6.0
- v1.7.1 - Fixed dropdown detection issues
- v1.7.0 - Added comment investigation features

### v1.6.x Series (Stable)
- v1.6.0 - Current stable production version
- v1.6.1-debug - Debug version for comment investigation

### v1.0.x Series (Investigation Tools)
- v1.0.0 - Standalone investigation tools

## Which Version to Use?

### ✅ RECOMMENDED: v1.13.0 for Everything!

- **For BOTH features**: `linkedin-notion-saver-v1.13.0.user.js` 
- **For feed posts only**: `linkedin-notion-saver-v1.7.5.user.js` (if you prefer single-feature)
- **For Pulse articles only**: `linkedin-notion-saver-v1.9.5.user.js` (if you prefer single-feature)
- **For debugging comments**: `linkedin-comment-debugger-v1.0.0-debug.user.js`
- **For data collection**: `linkedin-notion-saver-v1.6.1-debug.user.js`
- **For testing**: `comment-investigation-addon-v1.0.0.user.js`

## Installation

1. Open any `.user.js` file in Firefox with Greasemonkey installed
2. Greasemonkey will detect it and prompt to install
3. Click "Install"
4. The script will be active on LinkedIn

## Server Requirements

Most debug and investigation scripts require the local server running:
```bash
cd local-app
npm start
```

The server receives telemetry at `http://localhost:8765/investigation/comments`