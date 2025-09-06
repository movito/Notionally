# Lessons Learned

## HTML Entity Handling Regression (v1.7.2 - v1.7.4)

### Issue
Special characters in LinkedIn posts were being saved as HTML entities (&quot;, &#x27;, &#x2F;) instead of plain text when sent to Notion.

### Timeline
- **v1.6.0**: Working correctly - simple text extraction method
- **v1.7.1**: Issue introduced - method was modified
- **v1.7.2-1.7.4**: Multiple failed attempts to fix with complex solutions
- **v1.7.5**: Fixed by restoring v1.6.0 method

### Root Cause
The text extraction method was unnecessarily complicated. LinkedIn's DOM already contains decoded text - we just needed to let the browser handle the decoding naturally through innerHTML → textContent conversion.

### Failed Approaches
1. **Textarea element decoding**: Created textarea elements to decode entities - didn't work because entities were already decoded
2. **Manual entity replacement**: Added regex replacements for common entities - unnecessary and incomplete
3. **Two-stage decoding**: Combined both methods above - added complexity without solving the problem

### Successful Solution
Restored the simple v1.6.0 approach:
```javascript
const tempDiv = document.createElement('div');
tempDiv.innerHTML = formattedText;
postText = tempDiv.textContent || tempDiv.innerText || '';
```

The browser automatically decodes HTML entities when setting innerHTML and reading textContent.

### Key Lessons
1. **Simplicity works**: The original simple solution was correct. Complex solutions often introduce bugs.
2. **Git history is valuable**: When a regression occurs, check what worked before rather than adding more complexity.
3. **Test the actual problem**: We were trying to decode entities that were already decoded text.
4. **Browser APIs handle encoding**: Trust the browser's built-in HTML parsing rather than manual string manipulation.

### Prevention Measures
1. **Test suite created**: `npm run test-entities` validates HTML entity handling
2. **Documentation**: Added detailed notes about the correct approach
3. **Code comments**: Added warnings not to overcomplicate the text extraction

### Technical Details
- LinkedIn's feed-shared-text__text-view element contains text with HTML entities already decoded
- Setting innerHTML on a temporary div and reading textContent gives us clean text
- Line break preservation is handled separately from entity decoding

## Version Management Standards

### Issue
Multiple script files with version numbers in filenames caused confusion (e.g., multiple v1.7.0 variants).

### Solution
1. Single production script with version in filename: `linkedin-notion-saver-vX.Y.Z.user.js`
2. Automated version checking: `npm run check-versions`
3. Version synchronization across package.json and script headers
4. Script version tracking in Notion database

### Key Lessons
1. **Consistent naming**: One canonical filename pattern prevents confusion
2. **Automated checks**: Scripts to verify version consistency catch mismatches early
3. **Version tracking**: Recording script version with each save helps debug issues

## General Development Principles

### Debugging Production Issues
1. **Check git history first**: When something stops working, look at what changed
2. **Compare working versions**: Diff the working and broken versions to identify changes
3. **Test in isolation**: Create minimal test cases for specific functionality
4. **Document fixes**: Record what broke, why, and how it was fixed

### Code Maintenance
1. **Preserve working code**: Don't refactor working code without clear benefit
2. **Add tests before changes**: Ensure existing functionality has test coverage
3. **Small, focused changes**: Make one fix at a time to identify what solves the problem
4. **Clear commit messages**: Document the problem and solution in commits