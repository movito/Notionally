# TASK-006: Fix Duplicate Page Prevention

## Status
- **Assigned To**: feature-developer
- **Priority**: Low
- **Created**: 2025-09-02
- **Updated**: 2025-09-02
- **Started**: 2025-09-02
- **Branch**: feature/v1.0.2-careful-upgrade
- **Blocked**: No

## Description
Currently, rapid successive saves of the same post create duplicate Notion pages. Implement proper duplicate detection and prevention.

## Current Behavior
- First save: Creates page
- Second save (same URL): Creates another page
- Test shows: "⚠️ WARNING - Two different pages were created"

## Root Cause Analysis
The `findExistingPage` method in notion-client.js queries by URL, but:
1. Query might not find recently created pages (Notion API lag)
2. No caching of recent saves
3. No request deduplication

## Proposed Solutions

### Option 1: In-Memory Cache (Recommended)
```javascript
// Simple cache of recent saves
const recentSaves = new Map();

// Before creating page
const cacheKey = postData.url;
if (recentSaves.has(cacheKey)) {
    const cached = recentSaves.get(cacheKey);
    if (Date.now() - cached.timestamp < 60000) { // 1 minute
        return cached.result;
    }
}

// After creating page
recentSaves.set(cacheKey, {
    result: notionPage,
    timestamp: Date.now()
});
```

### Option 2: Request Queue
Queue requests for same URL, process sequentially

### Option 3: Database Query with Retry
Add delay and retry to find recently created pages

## Implementation Steps
1. Add caching mechanism to PostProcessingService
2. Test with rapid requests
3. Test with different URLs
4. Ensure cache doesn't grow unbounded
5. Add cache cleanup (remove old entries)

## Testing
```bash
# Test script for duplicate prevention
URL="https://linkedin.com/test-$(date +%s)"
curl -X POST http://localhost:8765/save-post \
    -H "Origin: https://www.linkedin.com" \
    -d "{\"url\":\"$URL\",...}" &
curl -X POST http://localhost:8765/save-post \
    -H "Origin: https://www.linkedin.com" \
    -d "{\"url\":\"$URL\",...}" &
wait
# Check if only one page was created
```

## Acceptance Criteria
- [ ] Same URL within 60 seconds returns same Notion page
- [ ] Different URLs create different pages
- [ ] Cache doesn't cause memory issues
- [ ] No impact on normal save performance
- [ ] Test passes without warning
- [ ] Run ./local-app/scripts/test-critical.sh - all must pass

## Important Notes
- Low priority - duplicates are annoying but not breaking
- Don't over-engineer the solution
- Simple cache is probably sufficient
- Test thoroughly with the automated test suite
- Remember to test with real LinkedIn posts after implementation

## Files to Modify
- `/Users/broadcaster_three/Github/Notionally/local-app/src/services/PostProcessingService.js` - Add caching logic
- Possibly `/Users/broadcaster_three/Github/Notionally/local-app/src/notion-client.js` - If cache should be at Notion level

## Safety Requirements
- Must not break existing functionality
- Must pass all tests in test-critical.sh
- Must handle cache failures gracefully
- Must not cause memory leaks