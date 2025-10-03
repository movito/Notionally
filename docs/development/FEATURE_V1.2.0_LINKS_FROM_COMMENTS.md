---
title: Feature v1.2.0 - Links from Comments
version: 1.2.0
last_updated: 2025-01-10
category: development
status: active
---

# Feature v1.2.0: Links from Comments

## Overview
Capture and include author's own comments from LinkedIn posts, particularly those containing links that authors post to avoid LinkedIn's link penalty in the main post.

## Problem Statement
LinkedIn's algorithm penalizes posts with external links, reducing their reach. Authors commonly work around this by:
1. Posting content without links
2. Adding a comment immediately after with "Link in comments 👇" 
3. Including the actual link(s) in their own comment

Currently, notionally only captures the main post content, missing these valuable author-provided links.

## Solution Strategy

### Phase 1: Comment Detection and Extraction
1. **Identify Comments Section**
   - Locate the comments container for each post
   - Handle both expanded and collapsed comment states
   - Deal with "Load more comments" scenarios

2. **Author Identification**
   - Extract author identifier from main post
   - Match against comment authors
   - Handle author badges/verification marks

3. **Comment Parsing**
   - Extract text content from author's comments
   - Identify and extract links (both plain text and hyperlinked)
   - Preserve comment timestamp and order

### Phase 2: Data Structure Enhancement
```javascript
// Current structure
{
  text: "Post content",
  author: "Author Name",
  url: "linkedin.com/post/...",
  videos: [...],
  images: [...]
}

// Enhanced structure
{
  text: "Post content",
  author: "Author Name",
  url: "linkedin.com/post/...",
  videos: [...],
  images: [...],
  authorComments: [
    {
      text: "Check out my article: example.com/article",
      timestamp: "2024-01-10T10:30:00Z",
      links: ["example.com/article"],
      position: 1  // First comment
    }
  ]
}
```

### Phase 3: Notion Integration
1. **New Section in Notion Pages**
   - Add "Author's Additional Links" section after main content
   - Format as callout blocks with link icon
   - Include comment text and extracted links

2. **Link Processing**
   - Validate URLs
   - Expand shortened URLs if possible
   - Create proper Notion link blocks

## Implementation Plan

### 1. Greasemonkey Script Updates (`linkedin-notion-saver.user.js`)

#### A. Comment Detection Functions
```javascript
function findAuthorComments(post, authorInfo) {
    const comments = [];
    const commentsSection = post.querySelector('[aria-label*="comment"]');
    
    if (!commentsSection) return comments;
    
    const commentElements = commentsSection.querySelectorAll('[data-comment-id]');
    
    commentElements.forEach(comment => {
        const commentAuthor = extractCommentAuthor(comment);
        if (isAuthorMatch(commentAuthor, authorInfo)) {
            comments.push(extractCommentData(comment));
        }
    });
    
    return comments;
}
```

#### B. Link Extraction
```javascript
function extractLinksFromText(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex) || [];
    
    // Also check for common patterns like "link: example.com"
    const informalLinks = text.match(/(?:link|url|website|site):\s*([^\s]+)/gi) || [];
    
    return [...matches, ...informalLinks].map(cleanUrl);
}
```

### 2. Server Updates (`server.js`)

#### A. Request Validation
```javascript
// Add to validation schema
const postSchema = {
    // ... existing fields
    authorComments: Joi.array().items(Joi.object({
        text: Joi.string().max(5000),
        timestamp: Joi.string().isoDate(),
        links: Joi.array().items(Joi.string().uri()),
        position: Joi.number().integer().min(1)
    })).optional()
};
```

### 3. Notion Client Updates (`notion-client.js`)

#### A. Page Creation Enhancement
```javascript
async function addAuthorComments(children, authorComments) {
    if (!authorComments || authorComments.length === 0) return;
    
    // Add section header
    children.push({
        type: 'heading_2',
        heading_2: {
            rich_text: [{
                type: 'text',
                text: { content: '🔗 Author\'s Additional Links' }
            }]
        }
    });
    
    // Add each comment as a callout
    authorComments.forEach(comment => {
        children.push({
            type: 'callout',
            callout: {
                icon: { emoji: '💬' },
                rich_text: formatCommentWithLinks(comment)
            }
        });
    });
}
```

## Testing Strategy

### 1. Unit Tests
- Comment detection with various HTML structures
- Author matching logic
- Link extraction from different formats
- URL validation and cleaning

### 2. Integration Tests
- Full post with author comments
- Multiple comments from author
- Mixed comments (author + others)
- No comments scenario
- Comments with multiple links

### 3. Manual Testing Scenarios
1. Standard "link in comments" post
2. Multiple author comments
3. Author replies to other comments
4. Long comment threads
5. Comments with hashtags and mentions

## Edge Cases

1. **Author Name Variations**
   - Display name vs username
   - Unicode characters
   - Company pages as authors

2. **Comment Loading**
   - Lazy-loaded comments
   - "View more comments" button
   - Nested reply threads

3. **Link Formats**
   - Shortened URLs (bit.ly, etc.)
   - LinkedIn's own link wrapper
   - Markdown-style links
   - Plain text URLs without protocol

4. **Performance**
   - Large comment threads
   - Slow comment loading
   - Rate limiting concerns

## Success Metrics

1. **Functionality**
   - Successfully captures 95%+ of author comments
   - Correctly identifies author in 99%+ cases
   - Extracts all valid links from comments

2. **Performance**
   - No significant increase in save time (<500ms)
   - Handles up to 50 comments efficiently

3. **User Experience**
   - Clear presentation in Notion
   - Links are clickable and valid
   - Maintains context of why link was shared

## Rollback Plan

If issues arise:
1. Feature flag in config to disable comment extraction
2. Graceful degradation - save post even if comment extraction fails
3. Version rollback procedure documented

## Future Enhancements

1. **Phase 2 (v1.3.0)**
   - Capture selected high-value comments from others
   - Thread reconstruction for context

2. **Phase 3 (v1.4.0)**
   - Link preview generation
   - Automatic link categorization

## Notes

- LinkedIn's DOM structure may change; need monitoring
- Consider caching strategy for comment data
- Privacy consideration: only author's public comments