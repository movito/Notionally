# Pulse Article Markdown Implementation Plan

## Overview
Implement proper markdown-to-Notion conversion for LinkedIn Pulse articles while keeping feed post formatting unchanged.

## Current Status
- ✅ Client-side: v1.15.1 extracts Pulse articles as clean markdown
- ✅ Server-side: Basic markdown parser added to notion-client.js
- ⏳ Not yet tested or deployed

## Implementation Tasks

### Phase 1: Complete Server Implementation
**Owner: feature-developer**

1. **Fix closing bracket issue** (5 min)
   - File: `/local-app/src/notion-client.js`
   - Line ~528: Missing closing bracket for else block
   - Add `}` after the paragraphs.forEach loop

2. **Ensure type is passed through** (15 min)
   - File: `/local-app/src/services/PostProcessingService.js`
   - Verify `type` field is passed from client to NotionClient
   - Add to notionData object if missing:
   ```javascript
   const notionData = {
       type: data.type, // Add this line
       title: data.text?.substring(0, 100) || `LinkedIn post from ${data.author}`,
       // ... rest of fields
   };
   ```

3. **Enhance inline formatting parser** (30 min)
   - File: `/local-app/src/notion-client.js`
   - Update `parseInlineFormatting` method to handle:
     - **Bold text** (`**text**`)
     - *Italic text* (`*text*`)
     - `Inline code` (`` `code` ``)
     - [Links](url) (`[text](url)`)
   - Example implementation provided in strategy doc

### Phase 2: Testing
**Owner: test-runner**

1. **Unit Tests** (30 min)
   - Test `parseMarkdownToNotionBlocks` with various inputs:
     ```javascript
     // Test cases:
     "# Heading 1" → heading_1 block
     "## Heading 2" → heading_2 block  
     "### Heading 3" → heading_3 block
     "> Quote" → quote block
     "• Item" → bulleted_list_item
     "1. Item" → numbered_list_item
     "---" → divider block
     "```code```" → code block
     "Regular text" → paragraph block
     ```

2. **Integration Tests** (45 min)
   - Test feed posts still work:
     1. Install v1.15.1 script
     2. Save a feed post
     3. Verify it appears in Notion as simple paragraphs
   
   - Test Pulse articles:
     1. Navigate to a Pulse article
     2. Save article to Notion
     3. Verify markdown is converted to proper Notion blocks:
        - Headings appear as headings
        - Lists appear as lists
        - Quotes appear as quote blocks
        - Code blocks appear as code blocks

3. **Edge Cases** (30 min)
   - Very long paragraphs (>2000 chars)
   - Mixed formatting in single paragraph
   - Empty code blocks
   - Nested lists (if supported)
   - Articles without any markdown formatting

### Phase 3: Deployment
**Owner: feature-developer**

1. **Test locally** (15 min)
   ```bash
   cd local-app
   npm test  # Run any existing tests
   npm start # Start server
   ```

2. **Test with real LinkedIn content** (30 min)
   - Save 3 feed posts → Verify unchanged
   - Save 3 Pulse articles → Verify markdown conversion

3. **Document any issues found** (15 min)

### Phase 4: Refinement
**Owner: feature-developer**

Based on test results:
1. Fix any parsing issues
2. Adjust regex patterns if needed
3. Handle any edge cases discovered

## Success Criteria

### Feed Posts (Must Not Break)
- [ ] Text appears as simple paragraphs
- [ ] Line breaks preserved as before
- [ ] No markdown artifacts visible
- [ ] Images and videos still work

### Pulse Articles (New Feature)
- [ ] Headings render as Notion headings (h1, h2, h3)
- [ ] Lists render as Notion lists
- [ ] Quotes render as Notion quote blocks
- [ ] Code blocks render as Notion code blocks
- [ ] Long articles split appropriately
- [ ] No excessive newlines

## Testing Checklist

### Pre-deployment
- [ ] Server starts without errors
- [ ] No TypeScript/linting errors
- [ ] Console logs show correct type detection

### Post-deployment
- [ ] Feed posts still save correctly
- [ ] Pulse articles show rich formatting
- [ ] No duplicate content
- [ ] No missing content
- [ ] Performance acceptable (<3s save time)

## Rollback Plan

If issues arise:
1. Revert notion-client.js changes
2. Remove type check, use paragraph-only logic for all content
3. Document issues for future fix

## Files to Modify

1. `/local-app/src/notion-client.js`
   - Add closing bracket
   - Enhance parseInlineFormatting

2. `/local-app/src/services/PostProcessingService.js`
   - Ensure type field is passed

3. `/greasemonkey-script/linkedin-notion-saver-v1.15.1.user.js`
   - Already complete, no changes needed

## Testing URLs

### Feed Posts (should remain as paragraphs)
- https://www.linkedin.com/feed/

### Pulse Articles (should get rich formatting)
- https://www.linkedin.com/pulse/[article-slug]
- Find articles via LinkedIn homepage → "Articles" section

## Commands

```bash
# Start server
cd local-app
npm start

# Run tests (if available)
npm test

# Check logs
tail -f logs/app.log

# Monitor Notion API calls
# Check browser DevTools Network tab
```

## Timeline

- Phase 1: 1 hour (feature-developer)
- Phase 2: 2 hours (test-runner)  
- Phase 3: 1 hour (feature-developer)
- Phase 4: 30 min (feature-developer)

**Total: ~4.5 hours**

## Notes

- Keep feed posts simple - they work well as-is
- Pulse articles benefit from rich formatting
- Test thoroughly before declaring complete
- Document any quirks discovered