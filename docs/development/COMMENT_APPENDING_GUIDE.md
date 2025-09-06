# Comment Appending Feature - v1.7.0

## Overview

Version 1.7.0 adds the ability to append individual LinkedIn comments (with their links) to existing Notion pages. This solves the "link in comments" problem where authors post links in comments to avoid LinkedIn's algorithm penalties.

## Architecture

The feature follows the existing UI pattern:
1. User saves a LinkedIn post using "Save to Notion" from the post's dropdown menu
2. User identifies a relevant comment with links
3. User clicks the comment's option menu (three dots)
4. User selects "📎 Append to last save"
5. The comment and its links are appended to the Notion page

## How It Works

### 1. Tracking Last Saved Post
When a post is saved to Notion, the script stores:
```javascript
{
    url: postData.url,
    title: postData.title,
    author: postData.author,
    timestamp: new Date().toISOString()
}
```

### 2. Comment Dropdown Detection
The script detects comment dropdowns by:
- Monitoring `aria-expanded` attribute changes
- Checking for `aria-label` containing "comment"
- Looking for `.comment-options-dropdown__trigger-icon` class
- Verifying the element is within `.comments-comment-item`

### 3. Comment Data Extraction
When "Append to last save" is clicked:
- Author name extracted from `.comments-post-meta__name-text`
- Comment text extracted from `.comments-comment-item__main-content`
- URLs extracted using regex: `/(https?:\/\/[^\s]+)/g`

### 4. Server Processing
The `/append-comment` endpoint:
1. Receives comment data and post URL
2. Finds existing Notion page by URL
3. Appends formatted comment section

### 5. Notion Page Structure
Appended comments appear as:
```
─────────────────────────
## 💬 Comment from LinkedIn
By [Author Name] • Added on [timestamp]

💭 [Comment content in callout block]

### 🔗 Links in comment
• [Link 1]
• [Link 2]
```

## Files Modified

### Greasemonkey Script
**File**: `greasemonkey-script/linkedin-notion-saver-v1.7.0.user.js`

Key additions:
- `saveLastPost()` - Stores last saved post info
- `extractCommentData()` - Extracts comment content and links
- `addAppendToCommentDropdown()` - Adds menu item to comment dropdowns
- `appendCommentToNotion()` - Sends comment to server

### Server Endpoint
**File**: `local-app/src/server.js` (lines 500-549)

New endpoint: `POST /append-comment`
```javascript
{
    postUrl: "https://linkedin.com/posts/...",
    postAuthor: "Original Post Author",
    comment: {
        author: "Comment Author",
        content: "Comment text with links",
        urls: ["https://example.com"],
        timestamp: "2025-01-06T..."
    }
}
```

### Notion Client
**File**: `local-app/src/notion-client.js` (lines 895-1015)

New methods:
- `findPageByUrl(url)` - Finds Notion page by LinkedIn URL
- `appendCommentToPage(pageId, commentData)` - Adds comment blocks to page

## Usage Instructions

1. **Save a Post First**
   - Click the three dots menu on a LinkedIn post
   - Select "💾 Save to Notion"
   - Wait for success confirmation

2. **Find Relevant Comment**
   - Scroll to comments section
   - Identify comments with important links

3. **Append Comment**
   - Click the three dots on the comment
   - Select "📎 Append to last save"
   - Comment will be added to the Notion page

## Technical Details

### Storage
Uses Greasemonkey's `GM_getValue` and `GM_setValue` to persist last saved post across page loads.

### Comment Detection Selectors
```javascript
// Comment container selectors
'.comments-comment-item'
'.comment-item'
'[data-test-comment-entity]'

// Author selectors
'.comments-post-meta__name-text span[aria-hidden="true"]'
'.update-components-actor__name'

// Content selectors  
'.comments-comment-item__main-content'
'.feed-shared-comment__text'
```

### Error Handling
- No last save: Menu item won't appear
- Page not found: Error message shown
- Network errors: Feedback shown near comment

## Troubleshooting

### "Append to last save" not appearing
- Ensure you've saved at least one post in this session
- Check that you're clicking on a comment dropdown (not post)
- Refresh the page and try again

### Comment not appending
- Verify the original post was saved successfully
- Check server is running on port 8765
- Look for errors in browser console

### Wrong comment extracted
- The script extracts from the nearest comment container
- Ensure you're clicking the correct comment's menu

## Version History

- **v1.7.0** - Added comment appending feature
- **v1.6.0** - Original save to Notion functionality