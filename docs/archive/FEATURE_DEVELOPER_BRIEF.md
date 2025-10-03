# Feature Developer Brief - TASK-007

## Your Mission
Implement safe security hardening measures for the notionally app. These are LOW RISK improvements that enhance security without any chance of breaking LinkedIn integration.

## Current State
- Branch: `feature/v1.0.4-security-fixes-1` (already checked out)
- App is working perfectly with v1.0.3 features
- All 7 critical tests passing
- Duplicate prevention working
- Server can be started with `cd local-app && npm start`

## The Task: Security Hardening
Add security improvements that are SAFE and won't affect functionality.

## Implementation Checklist

### 1. Error Message Sanitization (START HERE - Safest)
- Remove file paths from client error responses
- Keep detailed errors in server logs only
- Never echo user input in error messages without sanitization

### 2. Add Safe Security Headers (One at a time!)
```javascript
// Add to server.js AFTER cors middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});
```

**IMPORTANT**: Add ONE header, test, then add the next. If any header causes issues, remove it immediately.

### 3. Input Sanitization
- Sanitize HTML tags from post text
- Escape special characters in author names
- Validate URLs (no javascript: protocol)

### 4. Environment Security
- Check that API keys are never logged
- Add warning if .env permissions are too open

## Critical Safety Rules

### DO NOT:
- ❌ Add Helmet middleware
- ❌ Change CORS configuration
- ❌ Add strict CSP headers
- ❌ Add any header that might block LinkedIn
- ❌ Make breaking changes

### DO:
- ✅ Test after EVERY change
- ✅ Run `./local-app/scripts/test-critical.sh` frequently
- ✅ Test with real LinkedIn posts
- ✅ Keep changes small and incremental
- ✅ Revert immediately if anything breaks

## Testing Protocol

After EACH change:
1. Run `./local-app/scripts/test-critical.sh`
2. All 7 tests must pass
3. Test with a real LinkedIn post save
4. Check server logs for errors

## Files to Modify
- **Main file**: `/Users/broadcaster_three/Github/Notionally/local-app/src/server.js`
- **Maybe**: `/Users/broadcaster_three/Github/Notionally/local-app/src/utils/errors.js` (if it exists)
- **Test with**: `/Users/broadcaster_three/Github/Notionally/local-app/scripts/test-critical.sh`

## Task Details
Full requirements: `/Users/broadcaster_three/Github/Notionally/coordination/tasks/in-progress/TASK-007-security-hardening.md`

## Success Criteria
- All tests still pass (7/7)
- LinkedIn posts still save
- Error messages sanitized
- Security headers present in responses
- No performance impact

## If Something Breaks
```bash
git checkout HEAD src/server.js
cd local-app && npm start
./test-critical.sh
```

## Remember
- These are LOW RISK improvements only
- Working app > Broken secure app
- Test obsessively
- Small incremental changes

Good luck! Take it slow and test everything.