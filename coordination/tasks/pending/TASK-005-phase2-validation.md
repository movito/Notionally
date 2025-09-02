# TASK-005: Implement Phase 2 Input Validation

## Status
- **Assigned To**: TBD
- **Priority**: Medium
- **Created**: 2025-09-02
- **Updated**: 2025-09-02
- **Blocked**: No

## Description
Implement Phase 2 security improvements from SECURITY_UPGRADE_PLAN.md. Add input validation without breaking LinkedIn integration.

## Prerequisites
- [ ] Phase 1 security completed (✅ DONE)
- [ ] All tests passing
- [ ] Backup branch created
- [ ] Test environment ready

## Implementation Requirements

### 1. Content-Type Validation
Add validation ONLY on /save-post endpoint:
```javascript
if (!req.is('application/json')) {
    return res.status(400).json({ error: 'Content-Type must be application/json' });
}
```
**Test**: Ensure LinkedIn sends correct Content-Type

### 2. Required Fields Validation
Validate minimum required fields:
- text OR media.videos must exist
- author must exist
- url must exist
**Test**: Save various types of LinkedIn posts

### 3. Field Size Limits
Implement reasonable limits:
- text: max 100KB
- author: max 200 chars
- url: max 500 chars
**Test**: Save post with video (larger payloads)

## Testing Protocol

After EACH validation addition:
1. Run `./local-app/scripts/test-critical.sh`
2. Test with real LinkedIn post
3. Test with post containing images
4. Test with post containing video
5. Monitor server logs for validation errors

## Acceptance Criteria
- [ ] Content-Type validation works
- [ ] Required fields are validated
- [ ] Size limits are enforced
- [ ] LinkedIn posts still save successfully
- [ ] No false-positive validation errors
- [ ] Error messages are helpful
- [ ] All existing tests pass

## Rollback Plan
If ANY validation breaks LinkedIn:
```bash
git checkout HEAD~1 src/server.js
npm start
./local-app/scripts/test-critical.sh
```

## Notes
- This is Phase 2 of 4
- Medium risk - validation can be too strict
- Test with variety of real LinkedIn posts
- Consider edge cases (polls, articles, etc.)