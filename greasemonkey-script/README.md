# notionally Greasemonkey Scripts

## ✅ Current Status: v1.13.0 WORKS! 

### 🎉 v1.13.0 Status (CONFIRMED WORKING)
- **LinkedIn Feed Posts**: ✅ WORKING - Saves posts to Notion
- **LinkedIn Pulse Articles**: ✅ WORKING - Saves articles to Notion
- **Important**: If not working, perform a browser reset (see Troubleshooting)

### Installation

1. Install Greasemonkey (Firefox) or Tampermonkey (Chrome)
2. Open `linkedin-notion-saver-v1.13.0.user.js` in your browser
3. Click "Install" when prompted
4. Start the local server: `cd local-app && npm start`

## Version Guide

### ✅ Production Ready
- **v1.13.0** - BOTH feed posts and Pulse articles work! (RECOMMENDED)
  - Successfully combines v1.7.5 feed code with v1.9.5 Pulse code
  - Requires clean browser state - reset if having issues

### Alternative Versions (Single Feature)
- **v1.7.5** - Feed posts only 
- **v1.9.5** - Pulse articles only 
- **v1.6.0** - Feed posts only (older)

### Failed Attempts (Historical)
- **v1.12.0** - Attempted unification (broken)
- **v1.11.0** - Feed posts work, Pulse broken
- **v1.10.0** - Feed posts work, Pulse broken

### Debug/Development
- **v1.11.1-pulse-debug** - Debug tool for Pulse article dropdowns
- **linkedin-comment-debugger-v1.0.0-debug** - Comment investigation tool

### Historical Versions
See [SCRIPT_VERSIONS.md](./SCRIPT_VERSIONS.md) for complete version history.

## How It Works

### For Feed Posts
1. Detects when you open the three-dots menu on any LinkedIn post
2. Injects "Save post to Notion" option
3. Extracts post content, images, author, and metadata
4. Sends to local server which forwards to Notion

### For Pulse Articles
1. Detects when you're on a Pulse article page (`/pulse/` URL)
2. Monitors the overflow menu button
3. Injects "Save Article to Notion" when menu opens
4. Extracts full article content and metadata
5. Sends to local server for Notion integration

## Architecture

The script uses **separate observers** for different features:

```
Feed Post Observer ──────┐
                         ├──> Local Server ──> Notion API
Pulse Article Observer ──┘
```

This separation prevents conflicts and ensures both features work independently.

## Troubleshooting

### 🔴 CRITICAL: Browser State Issues

**If v1.13.0 isn't working, try a BROWSER RESET first:**
1. Clear browser cache and cookies for LinkedIn
2. Restart browser completely
3. Re-install the script
4. Log into LinkedIn fresh

This solves most issues as browser state can interfere with script operation.

### "Save to Notion" not appearing

**For Feed Posts:**
1. Check console for errors: `F12` > Console
2. Verify server is running: `http://localhost:8765/health`
3. Try refreshing the page
4. Open and close the three-dots menu again

**For Pulse Articles:**
1. Ensure you're on a `/pulse/` URL
2. Click the three-dots button in the article header
3. Wait 1-2 seconds for menu to populate
4. Check console for "Pulse article detected" message

### Server Connection Issues
1. Start the server: `cd local-app && npm start`
2. Check port 8765 is not in use
3. Verify Dropbox credentials are configured

### LinkedIn Updates
If LinkedIn updates their interface and breaks the script:
1. Try v1.6.0 for feed posts only
2. Check for updated versions in this repository
3. Report issues with console logs

## Development

### Key Files
- `linkedin-notion-saver-v1.13.0.user.js` - Main production script
- `SCRIPT_VERSIONS.md` - Version history and changelog
- `/docs/development/` - Technical documentation

### Adding New Features
1. Start from v1.13.0 as base
2. Keep feed and Pulse observers separate
3. Test both features after changes
4. Document selector changes

### Testing Checklist
- [ ] Feed: Text post saves correctly
- [ ] Feed: Image post saves with media
- [ ] Feed: Video post saves with thumbnail
- [ ] Pulse: Article title and author extracted
- [ ] Pulse: Article content preserves formatting
- [ ] Pulse: Images are captured
- [ ] Both: Server communication works
- [ ] Both: Success notifications appear

## Known Issues

1. **Line Break Preservation**: While v1.13.0 extracts line breaks correctly from LinkedIn (verified in code), they may not appear in Notion. This is identical to v1.7.5's extraction logic. The issue may be:
   - Notion API handling of newline characters
   - Server-side processing removing line breaks
   - Need to verify the `content` field in Notion is configured as rich text

2. **Timing Sensitivity**: LinkedIn loads content asynchronously. The script uses timeouts that may occasionally miss content.

3. **Class Name Changes**: LinkedIn frequently updates their CSS classes. The script may break without warning.

4. **A/B Testing**: LinkedIn shows different interfaces to different users. The script may not work for all variations.

5. **Performance**: Multiple observers can impact page performance on slower machines.

## Contributing

When contributing:
1. Test both feed posts AND Pulse articles
2. Document any new selectors or timing changes
3. Maintain separation between features
4. Update version number using semantic versioning

## Support

For issues:
1. Check the console for error messages
2. Try the debug versions for more logging
3. Include your browser, OS, and script version
4. Provide example LinkedIn URLs that fail

## License

See main project LICENSE file.