# Feature Developer Brief - TASK-006

## Your Mission
Implement duplicate page prevention for the Notionally app. Currently, when the same LinkedIn post is saved multiple times in quick succession, it creates duplicate Notion pages. Your task is to add a simple caching mechanism to prevent this.

## Current State
- Branch: `feature/v1.0.3-task-006-duplicate-prevention` (already checked out)
- App is working perfectly - DO NOT BREAK IT
- All tests currently pass
- Server can be started with `npm start`

## The Problem
When running `./local-app/scripts/test-critical.sh`, the duplicate prevention test shows:
```
Testing: Duplicate prevention... ⚠️  WARNING
  └─ Two different pages were created. Check for duplicate handling.
```

## Your Task
Implement a simple in-memory cache in the PostProcessingService that:
1. Remembers recently saved posts by URL
2. Returns the cached Notion page if the same URL is saved within 60 seconds
3. Automatically cleans up old cache entries

## Implementation Guidelines
1. Start by reading `/Users/broadcaster_three/Github/Notionally/coordination/tasks/in-progress/TASK-006-duplicate-prevention.md`
2. Focus on Option 1 (In-Memory Cache) - it's the simplest and safest
3. Add the cache to PostProcessingService.js
4. Test frequently with `./local-app/scripts/test-critical.sh`
5. Test with real saves to ensure nothing breaks

## Safety Requirements
- Run tests after EVERY change
- If any test fails, immediately revert your changes
- Keep the implementation simple - don't over-engineer
- The cache should fail gracefully - if in doubt, create a duplicate rather than lose data

## Success Criteria
- The duplicate prevention test passes without warning
- All other tests still pass
- No performance impact on normal saves
- Real LinkedIn posts still save correctly

## Files You'll Need
- Main file to modify: `/Users/broadcaster_three/Github/Notionally/local-app/src/services/PostProcessingService.js`
- Test script: `/Users/broadcaster_three/Github/Notionally/local-app/scripts/test-critical.sh`
- Current server: `/Users/broadcaster_three/Github/Notionally/local-app/src/server.js` (for reference only)

## Remember
- The app is currently working perfectly
- Your changes should be minimal and focused
- Test, test, test!
- If something breaks, git checkout the file and start over

Good luck! The codebase is in a stable state and ready for your improvements.