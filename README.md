# Notionally

🎯 **Save LinkedIn posts with videos directly to Notion**

Notionally solves the friction of saving LinkedIn content to Notion by adding "Save to Notion" buttons directly to LinkedIn posts and automatically capturing videos that the standard Notion Web Clipper can't handle.

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
   git clone https://github.com/yourusername/Notionally.git
   cd Notionally
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
Notionally/
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

---

Built with ❤️ for better knowledge management
