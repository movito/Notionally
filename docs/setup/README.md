---
title: Setup and Configuration Documentation
version: 1.0.0
last_updated: 2025-01-10
category: setup
status: active
---

# Setup and Configuration Documentation

Installation, setup, and configuration guides for Notionally.

## Documents

### Dropbox Setup
- [DROPBOX_SETUP.md](./DROPBOX_SETUP.md) - Complete Dropbox configuration
  - API setup
  - Folder configuration
  - Permissions

- [DROPBOX_QUICK_SETUP.md](./DROPBOX_QUICK_SETUP.md) - Quick start guide
  - Minimal setup steps
  - Testing configuration

- [DROPBOX_TOKEN_REGENERATION.md](./DROPBOX_TOKEN_REGENERATION.md) - Token management
  - Regenerating expired tokens
  - Troubleshooting auth issues

### Media Handling
- [VIDEO_CAPTURE.md](./VIDEO_CAPTURE.md) - Video processing setup
  - ffmpeg requirements
  - Video format support
  - Processing configuration

## 🚀 Quick Start

### Prerequisites
- Node.js v16+
- ffmpeg (for video processing)
- Dropbox desktop app
- Firefox with Greasemonkey
- Notion API integration

### Basic Setup Steps

1. **Clone and Install**
```bash
git clone https://github.com/yourusername/Notionally.git
cd Notionally/local-app
npm install
```

2. **Configure Dropbox**
- Follow [DROPBOX_QUICK_SETUP.md](./DROPBOX_QUICK_SETUP.md)
- Or see [DROPBOX_SETUP.md](./DROPBOX_SETUP.md) for full API setup

3. **Set up Notion**
- Create integration at https://www.notion.so/my-integrations
- Add integration to your database
- Copy API key to config.json

4. **Install Greasemonkey Script**
- Open Firefox
- Install Greasemonkey extension
- Add script from `greasemonkey-script/linkedin-notion-saver.user.js`

5. **Start Server**
```bash
npm start
```

## Configuration Files

### config.json
```json
{
  "notion": {
    "apiKey": "secret_xxx",
    "databaseId": "xxx"
  },
  "dropbox": {
    "localPath": "~/Dropbox (Personal)/LinkedIn_Videos"
  },
  "server": {
    "port": 8765
  }
}
```

### Environment Variables
Create `.env` file:
```bash
NOTION_API_KEY=secret_xxx
NOTION_DATABASE_ID=xxx
DROPBOX_LOCAL_PATH="~/Dropbox (Personal)/LinkedIn_Videos"
```

## Testing Setup

After configuration:
```bash
# Test server health
curl http://localhost:8765/health

# Test Notion connection
curl http://localhost:8765/test-notion

# Test Dropbox setup
curl http://localhost:8765/test-dropbox
```

## Troubleshooting

### Common Issues
1. **Dropbox not syncing** - Check desktop app is running
2. **Notion API errors** - Verify integration has database access
3. **Video processing fails** - Ensure ffmpeg is installed
4. **CORS errors** - Server must be on port 8765

### Getting Help
- Check [Development Safeguards](../development/DEVELOPMENT_SAFEGUARDS.md)
- Review [Architecture docs](../architecture/CLAUDE.md)
- See test results in coordination/testing-strategy/

## Related Documentation

- [Architecture](../architecture/CLAUDE.md) - System overview
- [Development](../development/) - Development guidelines
- [Testing](../../coordination/testing-strategy/TEST-RUNNER-GUIDE.md) - Test procedures

## Navigation

- [Back to Index](../INDEX.md)
- [Architecture Docs](../architecture/)
- [Development Docs](../development/)