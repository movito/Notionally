---
title: Notionally - Project Context for Claude
version: 2.0.0
last_updated: 2025-01-10
category: architecture
status: active
---

# Notionally - Project Context for Claude

## Project Overview
Notionally is a tool that captures LinkedIn posts (including embedded videos) and saves them directly to Notion. It addresses the limitation of Notion's Web Clipper which cannot handle video content from LinkedIn posts.

## Architecture

### System Components
```
LinkedIn Feed → Greasemonkey Script → Local Node.js Server → Dropbox → Notion API
```

### Components Breakdown

1. **Greasemonkey Script** (`greasemonkey-script/linkedin-notion-saver.user.js`)
   - Runs in Firefox browser
   - Injects "Save to Notion" buttons into LinkedIn feed posts
   - Extracts post data (text, author, videos, images, metadata)
   - Sends data to local processing server via HTTP POST

2. **Local Processing Server** (`local-app/src/server.js`)
   - Express.js server running on localhost:8765
   - CORS configured for LinkedIn domains
   - Main endpoint: `/save-post` - receives post data from Greasemonkey
   - Test endpoints: `/test-notion`, `/test-dropbox`, `/health`
   - Orchestrates video processing, Dropbox storage, and Notion page creation

3. **Video Processor** (`local-app/src/video-processor.js`)
   - Downloads videos from LinkedIn
   - Uses fluent-ffmpeg for video processing/compression
   - Handles multiple video formats (mp4, webm)
   - Manages temporary file storage

4. **Dropbox Handler** (`local-app/src/dropbox-handler.js`)
   - Saves processed videos to local Dropbox folder
   - Generates shareable Dropbox links for videos
   - Path: `~/Dropbox (Personal)/LinkedIn_Videos`

5. **Notion Client** (`local-app/src/notion-client.js`)
   - Creates Notion pages with LinkedIn post content
   - Embeds videos using Dropbox shareable links
   - Maps to existing Notion database schema with additional Notionally-specific fields

## Notion Database Schema

### Core Fields (Existing)
- **Name** (title): Post title/preview
- **URL** (url): Original LinkedIn post URL
- **Created** (date): Post timestamp
- **Type** (select): Set to "LinkedIn Post"
- **Tags** (multi_select): LinkedIn, Video (if applicable), Author name

### Notionally-Specific Fields
- **Author** (rich_text): Post author name
- **Has Video** (checkbox): Whether post contains video
- **Video Count** (number): Number of videos in post
- **Source Platform** (select): Always "LinkedIn"
- **Status** (select): Processing status (e.g., "Saved")
- **Content preview** (rich_text): First 200 chars of post

## Configuration (`config.json`)

```json
{
  "notion": {
    "apiKey": "secret_xxx",           // Notion integration API key
    "databaseId": "xxx"                // Target Notion database ID
  },
  "dropbox": {
    "localPath": "~/Dropbox (Personal)/LinkedIn_Videos"  // Video storage path
  },
  "server": {
    "port": 8765,                      // Local server port
    "host": "localhost"
  },
  "video": {
    "maxSize": "50MB",
    "formats": ["mp4", "webm"],
    "compression": "medium",
    "outputFormat": "mp4"
  }
}
```

## Data Flow

1. **User Action**: Clicks "Save to Notion" button on LinkedIn post
2. **Data Extraction**: Greasemonkey script extracts:
   - Post text content
   - Author information
   - Post URL and timestamp
   - Video sources and poster images
   - Image sources and alt text
3. **Server Processing**:
   - Validates incoming data
   - Downloads and processes videos
   - Saves videos to Dropbox folder
   - Creates Notion page with content
4. **Notion Page Structure**:
   - Post text as paragraphs
   - Embedded videos with Dropbox links
   - Video metadata in callout blocks
   - Images embedded directly
   - Footer with save metadata

## Key Features

- **One-click saving**: Direct integration in LinkedIn feed
- **Video handling**: Automatic download and processing of LinkedIn videos
- **Dropbox integration**: Local storage with shareable links
- **Duplicate detection**: Checks for existing pages by URL
- **Error resilience**: Continues processing even if individual videos fail
- **Real-time feedback**: Button states show save progress

## Development Status

### Completed
- [x] Project structure and architecture
- [x] Local Node.js server implementation
- [x] Greasemonkey userscript for LinkedIn
- [x] Notion API integration with database mapping
- [x] Basic Dropbox file handling
- [x] Video download and processing logic

### Current Issues/Modifications
- Modified `notion-client.js` to handle video embedding with Dropbox URLs
- Server configured with CORS for LinkedIn domains
- Test endpoints available for validating integrations

## Technical Requirements

- **Node.js**: v16+ 
- **ffmpeg**: Required for video processing
- **Dropbox**: Desktop app must be running for file sync
- **Firefox**: With Greasemonkey extension
- **Notion**: API integration with appropriate database permissions

## API Endpoints

- `POST /save-post`: Main endpoint for saving LinkedIn posts
- `GET /health`: Server health check
- `GET /test-notion`: Test Notion API connection
- `GET /test-dropbox`: Test Dropbox folder setup
- `GET /videos/*`: Static file serving for processed videos (optional)

## Error Handling

- Validation errors return 400 with specific error codes
- Notion API errors include validation and authorization checks
- Video processing failures don't block entire post save
- Detailed logging throughout the pipeline

## Security Considerations

- CORS restricted to LinkedIn domains
- Local server only (localhost:8765)
- No external API exposure
- Notion API key stored locally in config

## Testing

Start server: `npm start` or `npm run dev` (with nodemon)
Test health: `curl http://localhost:8765/health`
Test Notion: `curl http://localhost:8765/test-notion`
Test Dropbox: `curl http://localhost:8765/test-dropbox`

## Common Tasks

### Adding new Notion database fields
1. Update `notion-client.js` properties mapping in `createPage()` method
2. Ensure field names match exactly in Notion database

### Debugging video downloads
1. Check `video-processor.js` for download logic
2. Verify LinkedIn video URLs are accessible
3. Check temp folder permissions

### Updating Greasemonkey script
1. Modify `greasemonkey-script/linkedin-notion-saver.user.js`
2. Reinstall in Firefox Greasemonkey extension
3. Refresh LinkedIn page

## Development Practices

### Semantic Versioning & Branch Naming

#### Version Numbers
All version numbers in this project MUST follow semantic versioning (SemVer) practices:
- **Format**: `MAJOR.MINOR.PATCH` (e.g., 1.2.3)
- **MAJOR**: Increment for breaking changes that are NOT backwards compatible
- **MINOR**: Increment for new features that ARE backwards compatible
- **PATCH**: Increment for bug fixes and minor improvements (backwards compatible)

#### Branch Naming Conventions
All feature branches MUST follow these naming patterns:
- **Features**: `feature/v{MAJOR.MINOR.PATCH}-{brief-description}`
  - Example: `feature/v1.0.5-rate-limiting`
  - Example: `feature/v1.1.0-batch-processing`
- **Bug Fixes**: `fix/v{MAJOR.MINOR.PATCH}-{issue-description}`
  - Example: `fix/v1.0.6-cors-header-issue`
- **Security**: `security/v{MAJOR.MINOR.PATCH}-{security-focus}`
  - Example: `security/v1.0.7-input-validation`
- **Hotfixes**: `hotfix/v{MAJOR.MINOR.PATCH}-{critical-issue}`
  - Example: `hotfix/v1.0.8-notion-api-breaking`

#### Version Increment Rules
When creating a new branch, determine the version based on the type of change:

1. **PATCH Version (1.0.x)** - Increment when:
   - Fixing bugs without adding features
   - Improving performance without API changes
   - Updating documentation
   - Refactoring code without changing functionality
   - Adding tests
   - Security patches that don't break compatibility

2. **MINOR Version (1.x.0)** - Increment when:
   - Adding new features
   - Adding new endpoints
   - Adding optional parameters
   - Enhancing existing features (backwards compatible)
   - Adding new configuration options

3. **MAJOR Version (x.0.0)** - Increment when:
   - Removing features or endpoints
   - Changing API contracts
   - Modifying data structures in breaking ways
   - Requiring configuration changes
   - Changing system requirements

#### Files That Must Maintain Version Consistency
When updating version numbers, these files MUST be kept in sync:
- `greasemonkey-script/linkedin-notion-saver.user.js` (header @version)
- `local-app/package.json` (version field)
- `VERSION_HISTORY.md` (new version entry)
- Git release tags (when creating releases)

#### Task Naming
When creating tasks in the coordination folder, use version numbers:
- `TASK-{NUMBER}-v{VERSION}-{description}.md`
- Example: `TASK-008-v1.0.5-implement-rate-limiting.md`

#### Commit Messages
Include version context in commit messages:
- `feat(v1.1.0): Add batch processing capability`
- `fix(v1.0.5): Resolve duplicate page creation issue`
- `security(v1.0.6): Add XSS prevention measures`
- `docs(v1.0.5): Update API documentation`

#### Version Tracking
- Always document version changes in `VERSION_HISTORY.md`
- Include what changed, why, and any migration notes
- Mark versions as stable, beta, or deprecated as appropriate

#### Examples of Proper Versioning

**Scenario 1**: Adding a new feature to export posts as PDF
- Current version: 1.0.4
- New branch: `feature/v1.1.0-pdf-export`
- After merge: Version becomes 1.1.0

**Scenario 2**: Fixing a bug where images don't upload
- Current version: 1.1.0
- New branch: `fix/v1.1.1-image-upload-failure`
- After merge: Version becomes 1.1.1

**Scenario 3**: Complete rewrite of the server architecture
- Current version: 1.1.1
- New branch: `feature/v2.0.0-server-rewrite`
- After merge: Version becomes 2.0.0

#### Important Notes
- NEVER reuse version numbers
- NEVER decrease version numbers
- ALWAYS increment from the current master version
- If multiple branches are in progress, coordinate version numbers to avoid conflicts
- When in doubt, ask before creating a branch with a version number

## Notes for Future Development

- Consider implementing batch processing for multiple posts
- Add support for LinkedIn articles and documents
- Implement progress tracking for large video downloads
- Consider adding configuration UI instead of JSON file
- Potential for browser extension instead of Greasemonkey script