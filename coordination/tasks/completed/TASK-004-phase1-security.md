# TASK-004: Implement Phase 1 Security Foundation

## Status
- **Assigned To**: feature-developer
- **Priority**: High
- **Created**: 2025-09-02
- **Updated**: 2025-09-02
- **Completed**: 2025-09-02

## Description
Implement Phase 1 security improvements from SECURITY_UPGRADE_PLAN.md. These are low-risk changes that should not break LinkedIn integration.

## Implementation Requirements

### 1. Add Request Logging
Add middleware to log all requests with timing information:
- Log method, path, status code, and duration
- Place BEFORE route handlers
- Use the existing req.id for correlation

### 2. Add Basic Error Handling
Add error handling middleware:
- Must be the LAST middleware
- Log errors with req.id
- Return generic error message (don't leak stack traces)
- Include requestId in error response

### 3. Add Environment Variable Validation
At server startup:
- Check for required env vars: NOTION_API_KEY, NOTION_DATABASE_ID
- Exit cleanly with clear error message if missing
- Log successful validation

## Acceptance Criteria
- [x] Request logging shows in console for all requests
- [x] Error handler catches and logs errors properly
- [x] Server refuses to start without required env vars
- [x] LinkedIn save-post still works perfectly
- [x] No CORS errors
- [x] No performance degradation

## Testing Protocol
After EACH change:
1. Restart server
2. Test health endpoint: `curl http://localhost:8765/health`
3. Test with LinkedIn origin: `curl -X POST http://localhost:8765/save-post -H "Origin: https://www.linkedin.com" ...`
4. Check server logs for new logging
5. Verify no errors

## Files to Modify
- `/Users/broadcaster_three/Github/Notionally/local-app/src/server.js`

## Implementation Order
1. Add request logging (test)
2. Add error handling (test)
3. Add env validation (test)

## Rollback Plan
If ANY change breaks LinkedIn:
- Immediately revert the specific change
- Document what failed
- Do NOT proceed to next change

## Dependencies
- Read SECURITY_UPGRADE_PLAN.md for detailed implementation
- Current working baseline (verified)

## Notes
- This is Phase 1 of 4
- These changes are considered SAFE
- Test after EVERY individual change
- Do not bundle changes together