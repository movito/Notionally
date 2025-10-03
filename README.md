# notionally

🎯 **Save LinkedIn posts with videos directly to Notion**

**Current Version:** v2.0.0 (2025-10-01)

notionally solves the friction of saving LinkedIn content to Notion by adding "Save to Notion" buttons directly to LinkedIn posts and automatically capturing videos that the standard Notion Web Clipper can't handle.

## ✨ Features

- **One-click saving** - Save LinkedIn posts without copying URLs or opening new tabs
- **Video capture** - Automatically downloads and saves videos from LinkedIn posts
- **URL unfurling** - Automatically resolves LinkedIn shortened URLs (lnkd.in) to their destinations
- **Dropbox integration** - Videos stored in your Dropbox with shareable links embedded in Notion
- **In-feed buttons** - "Save to Notion" buttons appear directly on each LinkedIn post
- **Local processing** - All video processing happens on your machine for privacy
- **Debug tracking** - Comprehensive debug information saved with each post for troubleshooting

## 🏗️ Architecture

```
LinkedIn Feed (Greasemonkey) ↔ Local App (Node.js) ↔ Dropbox ↔ Notion
```

1. **Greasemonkey Script** - Runs in Firefox, adds save buttons to LinkedIn posts and collects debug information
2. **Local Processing App** - Modular Node.js server with:
   - Service layer for post processing
   - Parallel video/image downloading
   - URL resolution for shortened links
   - Comprehensive error handling
3. **Dropbox Storage** - Videos saved to local Dropbox folder with shareable links
4. **Notion Integration** - Posts created with text content, embedded video players, and debug information

## 🚀 Quick Start

### Prerequisites

- Firefox with Greasemonkey extension
- Node.js (v22.0.0+) - **Required for native fetch support**
- ffmpeg for video processing
- Dropbox desktop app
- Notion account with API access

### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/notionally.git
   cd notionally
   ```

2. Install dependencies:
   ```bash
   cd local-app
   npm install
   ```

3. Configure your settings:
   ```bash
   cp config.example.json config.json
   # Edit config.json with your Notion API key and Dropbox settings
   ```
   
   **Dropbox Setup (Important!):**
   - For long-term access, use a refresh token instead of access token
   - Run `npm run setup:dropbox` for an interactive setup
   - Or see [DROPBOX_SETUP.md](docs/setup/DROPBOX_SETUP.md) for manual setup

4. Start the local processing app:
   ```bash
   # Option 1: Use the start script (auto-selects Node 22)
   ./start.sh
   
   # Option 2: Manual start (requires Node 22+)
   npm start
   ```

5. Install the Greasemonkey script:
   - Open `greasemonkey-script/linkedin-notion-saver.user.js`
   - Install in Greasemonkey
   - Visit LinkedIn and look for "Save to Notion" buttons

## 📁 Project Structure

```
notionally/
├── local-app/                 # Node.js server for video processing
│   ├── src/
│   │   ├── server.js          # Main Express server
│   │   ├── video-processor.js # Video download and processing
│   │   ├── notion-client.js   # Notion API integration
│   │   ├── dropbox-handler.js # Dropbox file management
│   │   ├── config/            # Configuration management
│   │   │   └── ConfigManager.js
│   │   ├── services/          # Service layer
│   │   │   ├── PostProcessingService.js
│   │   │   └── URLResolutionService.js
│   │   └── utils/             # Shared utilities
│   │       ├── index.js
│   │       └── errors.js
│   ├── package.json
│   └── config.example.json
├── greasemonkey-script/       # Firefox userscript
│   └── linkedin-notion-saver.user.js
├── docs/                      # Documentation
│   ├── setup.md
│   └── troubleshooting.md
└── examples/                  # Example configurations and outputs
```

## ⚙️ Configuration

Create `local-app/config.json`:

```json
{
  "notion": {
    "apiKey": "your_notion_integration_key",
    "databaseId": "your_notion_database_id"
  },
  "dropbox": {
    "localPath": "~/Dropbox (Personal)/LinkedIn_Videos"
  },
  "server": {
    "port": 8765,
    "host": "localhost"
  },
  "video": {
    "maxSize": "50MB",
    "formats": ["mp4", "webm"],
    "compression": "medium"
  }
}
```

### Optional: Environment Variables (v2.0.0+)

You can also use a `.env` file for sensitive credentials:

```bash
# Required
NOTION_API_KEY=your_notion_api_key
NOTION_DATABASE_ID=your_database_id

# Optional (v2.0.0 features)
NOTION_DATA_SOURCE_ID=your_data_source_id  # For future API compatibility
NOTION_API_VERSION=2025-09-03              # Specify API version

# Optional Dropbox API
DROPBOX_APP_KEY=your_app_key
DROPBOX_APP_SECRET=your_app_secret
DROPBOX_REFRESH_TOKEN=your_refresh_token
```

See [MIGRATION.md](MIGRATION.md) for upgrade details.

## 🤝 Contributing

This is a personal project but contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

- **Videos not downloading?** Check that LinkedIn is not blocking the requests
- **Notion integration failing?** Verify your API key and database permissions
- **Dropbox links not working?** Ensure Dropbox desktop app is running and syncing

For more help, see [Documentation Index](docs/INDEX.md)

## 🚧 Development Status

- [x] Project structure and documentation
- [x] Local processing app (video download/processing)
- [x] Greasemonkey script (LinkedIn integration)
- [x] Notion API integration
- [x] Dropbox file handling
- [x] URL unfurling for LinkedIn shortened links
- [x] Debug information tracking
- [x] Modular architecture with service layer
- [x] Testing and debugging
- [x] User documentation
- [x] **v2.0.0:** Notion SDK v5.1.0 upgrade (2025-10-01)
- [x] **v2.0.0:** Comprehensive test suite (33/33 meaningful tests passed, 100% pass rate)
- [x] **v2.0.0:** Production-ready with gold standard quality

## 📋 What's New in v2.0.0

**Released:** 2025-10-01

### ✨ SDK Upgrade
- Upgraded Notion SDK from v2.2.15 to v5.1.0
- Fully backward compatible - no config changes required
- All existing v1.7.5 configurations work unchanged

### 🔮 Future-Ready Features
- Optional data source ID support (for future Notion API)
- Optional API version configuration
- New helper script: `npm run fetch-data-source-id`

### ✅ Quality Assurance
- **33/33 meaningful tests passed** (100% success rate, 39 total tests with 6 expected failures)
- Real API testing with live Notion integration
- Manual Firefox testing verified
- Zero breaking changes confirmed

### 📚 Documentation
See [MIGRATION.md](MIGRATION.md) for upgrade guide and [docs/releases/v2.0.0.md](docs/releases/v2.0.0.md) for complete release notes.

---

Built with ❤️ for better knowledge management
