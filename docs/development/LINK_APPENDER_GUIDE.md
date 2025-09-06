# Link Appender - Manual Link Addition from Comments

## Overview

The Link Appender is a standalone Greasemonkey script that allows users to manually select and append links from LinkedIn comments to existing Notion pages. This is a simpler alternative to automated comment detection.

## Features

- **Floating Action Button (FAB)**: A blue 🔗 button in the bottom-right corner
- **Link Detection**: Automatically finds all links in post comments
- **Author Attribution**: Shows which comment author posted each link
- **Selective Appending**: Choose which links to add to your Notion page
- **Real-time Feedback**: Status messages for success/failure

## Installation

1. Install the Greasemonkey script:
   - Open Firefox with Greasemonkey extension
   - Navigate to `greasemonkey-script/linkedin-link-appender-v1.0.0.user.js`
   - Click "Install" when prompted

2. Ensure the local server is running:
   ```bash
   npm run dev
   ```

## Usage

### Basic Workflow

1. **Save a LinkedIn Post First**
   - Use the regular "Save to Notion" feature to save a post
   - This creates the initial Notion page

2. **Open Link Appender**
   - Click the blue 🔗 FAB button on any LinkedIn post
   - A panel will appear showing all links found in comments

3. **Select Links**
   - Check the boxes next to links you want to append
   - Each link shows the comment author's name

4. **Append to Notion**
   - Click "Append Selected Links"
   - Links are added to the existing Notion page
   - Success message confirms completion

### How It Works

1. **Link Detection**: The script scans all comments for URLs using regex
2. **Page Matching**: Server finds the Notion page by LinkedIn URL
3. **Content Appending**: New section added with selected links

### Notion Page Structure

Appended links appear as:
```
─────────────────────────
## 🔗 Links from Comments
Added on [timestamp]

💬 [Author Name]: [Link URL]
💬 [Author Name]: [Link URL]
```

## Technical Details

### Client-Side (Greasemonkey Script)

**File**: `greasemonkey-script/linkedin-link-appender-v1.0.0.user.js`

Key functions:
- `extractLinksFromComments()`: Finds all URLs in comments
- `createLinkPanel()`: Creates the UI panel
- `sendToServer()`: Sends selected links to backend

### Server-Side

**Endpoint**: `POST /append-links`

Request format:
```json
{
  "postUrl": "https://linkedin.com/posts/...",
  "postAuthor": "John Doe",
  "links": [
    {
      "url": "https://example.com",
      "author": "Jane Smith"
    }
  ]
}
```

### Notion Client Methods

- `findPageByUrl(url)`: Locates existing Notion page
- `appendLinksToPage(pageId, linkData)`: Adds links section

## Error Handling

- **No Existing Page**: Error if post wasn't saved to Notion first
- **Network Errors**: Graceful failure with error messages
- **Invalid Links**: Malformed URLs are cleaned before processing

## Troubleshooting

### FAB Button Not Appearing
- Refresh the LinkedIn page
- Check Greasemonkey is enabled
- Verify script is installed

### Links Not Found
- Ensure comments are loaded (click "Show more comments")
- Check if links are in nested replies
- Some LinkedIn shortened links may not be detected

### Server Connection Failed
- Verify server is running on port 8765
- Check CORS settings in server.js
- Look for errors in server console

## Future Enhancements

- [ ] Auto-detect if page exists in Notion
- [ ] Support for nested comment replies
- [ ] Bulk operations for multiple posts
- [ ] Link preview generation
- [ ] Duplicate link detection

## Version History

- **v1.0.0** - Initial release with manual link appending