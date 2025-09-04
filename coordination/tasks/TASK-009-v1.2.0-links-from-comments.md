# TASK-009: Links from Comments Feature (v1.2.0)

**Status**: 🟡 In Progress  
**Branch**: `feature/v1.2.0-links-from-comments`  
**Assignee**: feature-developer  
**Priority**: High  
**Created**: 2025-01-10  

## Overview

Implement comment extraction functionality to capture author's comments containing links from LinkedIn posts. This addresses the common "link in comments" pattern where authors avoid LinkedIn's algorithm penalty for external links in main posts.

## Background

LinkedIn penalizes posts with external links by reducing their reach. Authors commonly work around this by:
1. Posting content without links
2. Immediately commenting with "Link in comments 👇"
3. Including actual links in their comment

Currently, Notionally only captures the main post, missing these valuable links.

## Requirements

### Functional Requirements
1. **Comment Detection**
   - Identify and access comment sections in LinkedIn posts
   - Handle both expanded and collapsed comment states
   - Manage lazy-loaded comments

2. **Author Identification**
   - Match comment authors with post author
   - Handle name variations and company pages
   - Verify author identity reliably (95%+ accuracy)

3. **Link Extraction**
   - Extract all links from author's comments
   - Handle various link formats (direct, shortened, text)
   - Preserve context around links

4. **Data Integration**
   - Add `authorComments` field to post data structure
   - Include comment text, timestamp, links, and position
   - Maintain backward compatibility

### Non-Functional Requirements
- No significant performance impact (<500ms additional processing)
- Graceful degradation if comment extraction fails
- Must not break existing post saving functionality

## Implementation Steps

### Step 1: Investigation Phase 🔍
**Status**: Ready to Start  
**Duration**: 2-3 hours  
**Output**: Investigation findings document

1. **Setup Debug Environment**
   - **Follow the Greasemonkey Development Guide**: `/docs/development/GREASEMONKEY_DEVELOPMENT_GUIDE.md`
   - Copy investigation code from `/docs/development/COMMENT_EXTRACTION_INVESTIGATION.md`
   - Create debug version of Greasemonkey script (v1.6.1-debug)
   - Add all debug functions and logging
   - Install in Firefox using Greasemonkey extension

2. **Data Collection**
   - Navigate to LinkedIn feed
   - Run `collectCommentData()` on 20+ different posts
   - Focus on posts with "link in comments" pattern
   - Test various scenarios:
     - Single author comment
     - Multiple author comments
     - Author replies to others
     - Lazy-loaded comments
     - No comments

3. **Document Findings**
   ```json
   {
     "selectors": {
       "commentContainer": "discovered_selector",
       "authorIdentifier": "discovered_selector",
       "commentText": "discovered_selector"
     },
     "patterns": {
       "loadBehavior": "description",
       "authorMatching": "method"
     }
   }
   ```

### Step 2: Greasemonkey Script Updates 📝
**File**: `greasemonkey-script/linkedin-notion-saver.user.js`  
**Duration**: 3-4 hours

1. **Add Comment Extraction Functions**
   ```javascript
   function extractAuthorComments(postElement, authorInfo) {
       // Use selectors discovered in Step 1
       const comments = [];
       // Implementation here
       return comments;
   }
   ```

2. **Integrate with Main Extraction**
   - Modify `extractPostData()` function
   - Add after main content extraction:
   ```javascript
   const authorComments = await extractAuthorComments(postElement, author);
   result.authorComments = authorComments;
   ```

3. **Handle Lazy Loading**
   ```javascript
   async function waitForComments(postElement, timeout = 3000) {
       // Implementation based on investigation
   }
   ```

### Step 3: Server Updates 🖥️
**File**: `local-app/src/server.js`  
**Duration**: 1-2 hours

1. **Update Validation Schema**
   ```javascript
   const postSchema = Joi.object({
       // ... existing fields
       authorComments: Joi.array().items(Joi.object({
           text: Joi.string().max(5000),
           timestamp: Joi.string().isoDate(),
           links: Joi.array().items(Joi.string().uri()),
           position: Joi.number().integer().min(1)
       })).optional()
   });
   ```

2. **Add Logging**
   - Log when author comments are received
   - Track link extraction success rate

### Step 4: Notion Client Updates 📄
**File**: `local-app/src/notion-client.js`  
**Duration**: 2-3 hours

1. **Add Author Comments Section**
   ```javascript
   if (postData.authorComments && postData.authorComments.length > 0) {
       // Add section header
       children.push({
           type: 'heading_2',
           heading_2: {
               rich_text: [{ text: { content: '🔗 Author\'s Additional Links' } }]
           }
       });
       
       // Add each comment as callout
       postData.authorComments.forEach(comment => {
           children.push(createCommentBlock(comment));
       });
   }
   ```

2. **Format Links Properly**
   - Create clickable links
   - Add link preview if possible
   - Include comment context

### Step 5: Testing 🧪
**Duration**: 2-3 hours

1. **Create Test Cases**
   - Location: `local-app/scripts/test-comment-extraction.sh`
   - Test all scenarios from Step 1
   - Verify data structure integrity

2. **Manual Testing**
   - Test on real LinkedIn posts
   - Verify Notion page creation
   - Check link functionality

3. **Edge Cases**
   - Post with no comments
   - Comments fail to load
   - Author name mismatch
   - Malformed links

## Deliverables

1. ✅ Investigation findings document
2. ✅ Updated Greasemonkey script with comment extraction
3. ✅ Server validation for new data structure
4. ✅ Notion client displaying author comments
5. ✅ Test suite for comment extraction
6. ✅ Updated documentation

## Test Data

Use these LinkedIn post patterns for testing:
1. Standard "link in comments" post
2. Post with multiple author comments
3. Post where author replies to others
4. Post with no comments
5. Post with lazy-loaded comments

## Success Criteria

- [ ] Captures 95%+ of author comments successfully
- [ ] Correctly identifies post author in comments
- [ ] Extracts all valid links from comments
- [ ] Displays nicely in Notion with context
- [ ] No performance degradation
- [ ] Graceful failure handling
- [ ] All existing tests still pass

## Resources

- **Feature Strategy**: `/docs/development/FEATURE_V1.2.0_LINKS_FROM_COMMENTS.md`
- **Investigation Plan**: `/docs/development/COMMENT_EXTRACTION_INVESTIGATION.md`
- **Greasemonkey Dev Guide**: `/docs/development/GREASEMONKEY_DEVELOPMENT_GUIDE.md`
- **Current Script**: `greasemonkey-script/linkedin-notion-saver.user.js`
- **Test Examples**: Collect during investigation phase

## Notes for Developer

1. **Start with Investigation**
   - Don't skip the investigation phase
   - LinkedIn's DOM varies between users/accounts
   - Document everything you discover

2. **Incremental Development**
   - Test each component separately first
   - Use debug logging extensively
   - Commit working increments

3. **Consider Variations**
   - LinkedIn A/B tests features
   - DOM structure may differ
   - Have fallback selectors

4. **Ask for Help**
   - If selectors don't work consistently
   - If performance becomes an issue
   - If Notion formatting is unclear

## Version History

- v1.2.0 - Initial implementation of links from comments

## Questions/Blockers

*To be filled by developer during implementation*

- [ ] Selector discovery findings:
- [ ] Performance measurements:
- [ ] Edge cases encountered:

---

**When Complete**: 
1. Update this document with actual findings
2. Move to `coordination/tasks/completed/`
3. Update version to 1.2.0 in package.json and Greasemonkey script
4. Create PR for review