# Development Safeguards for Notionally

## Critical Working Features (DO NOT BREAK)

### 1. LinkedIn to Notion Pipeline ✅
- **Greasemonkey script** extracts post data from LinkedIn
- **CORS** must allow `https://www.linkedin.com` origin
- **Save-post endpoint** processes posts without errors
- **No security middleware** that blocks LinkedIn requests

### 2. Image Processing ✅
```javascript
// WORKING FLOW - DO NOT CHANGE
1. Download image from URL → Buffer
2. Upload to Dropbox API → /LinkedIn_Videos/[date]/images/
3. Create share link → https://www.dropbox.com/...
4. Convert to streaming URL → dl.dropboxusercontent.com
5. Embed in Notion using streaming URL
```

### 3. Dropbox Integration ✅
- **API uploads** for immediate share links (not local sync)
- **Refresh token** authentication (not access token)
- **Share links** must be public with viewer access
- **Streaming URLs** format: `dl.dropboxusercontent.com` (no query params)

### 4. Notion Integration ✅
- **Page creation** in specified database
- **Image embedding** using Dropbox streaming URLs
- **Metadata** properly mapped to database fields
- **No retries** on page creation (causes duplicates)

## Development Rules

### RULE 1: Test Before Committing
```bash
# REQUIRED TEST SEQUENCE
1. npm start
2. curl http://localhost:8765/health
3. Test with LinkedIn origin:
   curl -X POST http://localhost:8765/save-post \
     -H "Origin: https://www.linkedin.com" \
     -H "Content-Type: application/json" \
     -d '{"text":"Test","author":"Test","url":"https://linkedin.com/test"}'
4. Verify in Notion that page was created
5. If images involved, verify they appear in Notion
```

### RULE 2: Version Control Strategy
```bash
# Before ANY major change:
git branch backup/pre-[feature-name]
git checkout -b feature/[feature-name]

# If something breaks:
git checkout backup/pre-[feature-name]
npm start  # Verify it works
```

### RULE 3: No "Optimizations" Without Testing
- **NO** architecture changes without complete testing
- **NO** combining multiple services without testing each
- **NO** removing "redundant" code without understanding why it exists
- **NO** async/await refactoring without testing error paths

### RULE 4: Security Additions Must Preserve LinkedIn
- **ALLOWED**: Request logging, error handling, env validation
- **FORBIDDEN**: Helmet headers that block CORS
- **FORBIDDEN**: Strict CSP policies
- **FORBIDDEN**: CSRF tokens (Greasemonkey can't provide)
- **TEST**: After each security addition, test with LinkedIn origin

## Red Flags (Stop Immediately If You See These)

🚨 **"NetworkError when trying to fetch resource"** - CORS is broken
🚨 **"Invalid image url (Error 422)"** - Dropbox URLs aren't working
🚨 **"Error 404 dl.dropboxusercontent.com"** - Using mock URLs instead of real
🚨 **Multiple Notion pages created** - Retry logic is broken
🚨 **"Missing required fields"** - Validation is too strict

## Testing Checklist

### Before Each Change
- [ ] Current branch is backed up
- [ ] Server starts without errors
- [ ] Health endpoint responds
- [ ] LinkedIn origin is accepted

### After Each Change
- [ ] All "Before" checks still pass
- [ ] Save-post works with test data
- [ ] Images embed properly (if applicable)
- [ ] No duplicate pages created
- [ ] No new security errors

### Before Merging
- [ ] Full LinkedIn test with real post
- [ ] Images display in Notion
- [ ] Videos process correctly
- [ ] No performance degradation
- [ ] Documentation updated

## Rollback Procedures

### Quick Rollback (Last Known Good)
```bash
git stash  # Save current changes
git checkout stable-v1.0.0
npm start
# Verify it works
```

### Selective Rollback (Specific File)
```bash
# Restore specific file from stable branch
git checkout stable-v1.0.0 -- src/[filename]
npm start
# Test the specific functionality
```

### Emergency Rollback (Everything Broken)
```bash
git reset --hard stable-v1.0.0
npm install
npm start
```

## Critical File Boundaries

### Files That Should Rarely Change
- `src/dropbox-handler.js` - Image upload logic is fragile
- `src/notion-client.js` - `addImagesToPage` method is critical
- `src/server.js` - CORS configuration is essential

### Safe to Modify
- `src/config/` - Configuration management
- `src/utils/` - Utility functions
- `coordination/` - Documentation and planning

### Requires Extreme Caution
- `src/services/PostProcessingService.js` - Orchestrates everything
- `src/video-processor.js` - Complex ffmpeg interactions
- `.env` - Breaking credentials breaks everything

## Performance Benchmarks

Current acceptable performance:
- Health check: < 100ms
- Save post (no media): < 2 seconds
- Save post (with image): < 20 seconds
- Save post (with video): < 60 seconds

If performance degrades beyond these limits, investigate immediately.

## Documentation Requirements

For EVERY change:
1. Update relevant comments in code
2. Update CLAUDE.md if architecture changes
3. Add to git commit message what was changed and why
4. Document any new dependencies
5. Note any new error conditions

## The Golden Rule

**If it works, and you're not 100% sure why you're changing it, DON'T CHANGE IT.**

Better to have working "unoptimized" code than broken "clean" code.

## Emergency Contacts

- Stable branch: `stable-v1.0.0`
- Last known good commit: `a500537`
- Critical test post: Any LinkedIn post with images
- Test Notion database: Check created pages for duplicates

## Remember

Every "optimization" that broke the app:
1. v2.0.0 modular architecture - Broke image handling
2. Security middleware addition - Broke CORS
3. Notion retry logic - Created duplicate pages
4. Image embedding "fix" - Used wrong URL format

The current setup works. Protect it.