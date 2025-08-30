# Notionally

🎯 **Save LinkedIn posts with videos directly to Notion**

Notionally solves the friction of saving LinkedIn content to Notion by adding "Save to Notion" buttons directly to LinkedIn posts and automatically capturing videos that the standard Notion Web Clipper can't handle.

## ✨ Features

- **One-click saving** - Save LinkedIn posts without copying URLs or opening new tabs
- **Video capture** - Automatically downloads and saves videos from LinkedIn posts
- **Dropbox integration** - Videos stored in your Dropbox with shareable links embedded in Notion
- **In-feed buttons** - "Save to Notion" buttons appear directly on each LinkedIn post
- **Local processing** - All video processing happens on your machine for privacy

## 🏗️ Architecture

```
LinkedIn Feed (Greasemonkey) ↔ Local App (Node.js) ↔ Dropbox ↔ Notion
```

1. **Greasemonkey Script** - Runs in Firefox, adds save buttons to LinkedIn posts
2. **Local Processing App** - Node.js server that downloads videos and calls Notion API
3. **Dropbox Storage** - Videos saved to local Dropbox folder with shareable links
4. **Notion Integration** - Posts created with text content and embedded video players

## 🚀 Quick Start

### Prerequisites

- Firefox with Greasemonkey extension
- Node.js (v16+)
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
   # Edit config.json with your Notion API key and Dropbox path
   ```

4. Start the local processing app:
   ```bash
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
│   │   ├── server.js         # Express server
│   │   ├── video-processor.js # Video download and processing
│   │   ├── notion-client.js   # Notion API integration
│   │   └── dropbox-handler.js # Dropbox file management
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

For more help, see [docs/troubleshooting.md](docs/troubleshooting.md)

## 🚧 Development Status

- [x] Project structure and documentation
- [ ] Local processing app (video download/processing)
- [ ] Greasemonkey script (LinkedIn integration)
- [ ] Notion API integration
- [ ] Dropbox file handling
- [ ] Testing and debugging
- [ ] User documentation

---

Built with ❤️ for better knowledge management
