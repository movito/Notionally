# Greasemonkey Script Versions

## Production Scripts

### Main Script
- **`linkedin-notion-saver-v1.6.0.user.js`** - Stable production version
  - Core functionality: Save LinkedIn posts to Notion
  - Handles text, images, videos, and URLs
  - Production ready

### Latest Development
- **`linkedin-notion-saver-v1.7.1.user.js`** - Latest attempt with investigation features
  - Includes dropdown detection fixes
  - Has integrated investigation features
  - Status: Testing

## Investigation & Debug Scripts

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

## Version History

### v1.6.x Series (Stable)
- v1.6.0 - Current stable production version
- v1.6.1-debug - Debug version for comment investigation

### v1.7.x Series (Development)
- v1.7.0 - Added comment investigation features (has issues)
- v1.7.1 - Attempted fix for dropdown detection

### v1.0.x Series (Investigation Tools)
- v1.0.0 - Standalone investigation tools

## Which Version to Use?

- **For normal use**: `linkedin-notion-saver-v1.6.0.user.js`
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