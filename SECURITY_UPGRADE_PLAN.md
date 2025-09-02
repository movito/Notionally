# Incremental Security Upgrade Plan for Notionally v1.0.1

## Current State
- Working v1.0.0 baseline
- Server accepts all CORS origins (needed for LinkedIn)
- No input validation
- No rate limiting
- Large request size limits (50MB)
- Credentials in .env (properly configured)

## Core Principle: Test After Every Change
Each security improvement MUST be tested with LinkedIn before proceeding to the next.

## Phase 1: Foundation (Low Risk)
These changes are unlikely to break LinkedIn integration.

### 1.1 Add Request Logging ✅ SAFE
```javascript
// Simple logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${req.id}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});
```
**Test**: Verify logs appear, LinkedIn still works

### 1.2 Add Basic Error Handling ✅ SAFE
```javascript
// Error handler (at the END of middleware)
app.use((err, req, res, next) => {
    console.error(`[${req.id}] Error:`, err.message);
    res.status(err.status || 500).json({
        error: 'Something went wrong',
        requestId: req.id
    });
});
```
**Test**: Trigger an error, verify LinkedIn still works

### 1.3 Environment Variable Validation ✅ SAFE
```javascript
// At startup, validate required env vars
const required = ['NOTION_API_KEY', 'NOTION_DATABASE_ID'];
for (const key of required) {
    if (!process.env[key]) {
        console.error(`Missing required env var: ${key}`);
        process.exit(1);
    }
}
```
**Test**: Start server, verify it runs

## Phase 2: Input Validation (Medium Risk)
More likely to cause issues if done wrong.

### 2.1 Content-Type Validation ⚠️ CAREFUL
```javascript
// Only on /save-post endpoint
app.post('/save-post', (req, res, next) => {
    if (!req.is('application/json')) {
        return res.status(400).json({ error: 'Content-Type must be application/json' });
    }
    next();
}, handler);
```
**Test**: LinkedIn request has correct Content-Type

### 2.2 Required Fields Validation ⚠️ CAREFUL
```javascript
// Validate minimum required fields
const validatePost = (req, res, next) => {
    const { text, author, url } = req.body;
    if (!text || !author || !url) {
        return res.status(400).json({ 
            error: 'Missing required fields',
            required: ['text', 'author', 'url']
        });
    }
    next();
};
```
**Test**: Save actual LinkedIn post

### 2.3 Size Limits Per Field ⚠️ CAREFUL
```javascript
// Reasonable limits per field
const validateSizes = (req, res, next) => {
    const { text } = req.body;
    if (text && text.length > 100000) { // 100KB text
        return res.status(400).json({ error: 'Post text too large' });
    }
    next();
};
```
**Test**: Save post with video

## Phase 3: Rate Limiting (Higher Risk)
Most likely to cause issues with legitimate use.

### 3.1 Generous Rate Limits First ⚠️ TEST THOROUGHLY
```javascript
const rateLimit = require('express-rate-limit');

// Very generous limits to start
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: 'Too many requests'
});

app.use('/save-post', limiter);
```
**Test**: Save multiple posts quickly

### 3.2 Tighten Gradually
- Start: 30 req/min
- Test for a week
- Reduce: 20 req/min
- Test for a week
- Target: 10 req/min

## Phase 4: CORS Refinement (Highest Risk)
Most likely to break LinkedIn integration.

### 4.1 Allow Specific Origins ⚠️ HIGH RISK
```javascript
const corsOptions = {
    origin: [
        'https://www.linkedin.com',
        'https://linkedin.com',
        'http://localhost:3000' // for testing
    ],
    credentials: true
};
app.use(cors(corsOptions));
```
**Test**: Extensive LinkedIn testing

### 4.2 Add CORS Headers Manually (If Needed)
```javascript
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && origin.includes('linkedin.com')) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    next();
});
```

## Testing Protocol for Each Phase

1. **Before Change**:
   - Confirm LinkedIn save works
   - Note current behavior

2. **After Change**:
   - Restart server
   - Test health endpoint
   - Test with curl
   - Test with Greasemonkey
   - Save real LinkedIn post
   - Check server logs

3. **If It Breaks**:
   - Immediately revert change
   - Document what failed
   - Try alternative approach

## Security Improvements NOT to Add (Yet)

These are known to break LinkedIn integration:

❌ **Helmet security headers** - Breaks CORS
❌ **Strict Content Security Policy** - Blocks requests
❌ **CSRF tokens** - Greasemonkey can't provide
❌ **Request signing** - Too complex for browser script
❌ **IP whitelisting** - User's IP changes

## Success Metrics

After each phase, we should have:
- ✅ LinkedIn integration still working
- ✅ Security improvement measurable
- ✅ No increase in errors
- ✅ No performance degradation
- ✅ Clear rollback path

## Rollback Strategy

If any change breaks LinkedIn:
1. `git stash` or `git reset --hard HEAD`
2. Restart server
3. Verify working state
4. Document failure in `/coordination/decisions/log.md`
5. Try alternative approach

## Timeline

- **Week 1**: Phase 1 (Foundation)
- **Week 2**: Phase 2 (Input Validation)
- **Week 3**: Phase 3 (Rate Limiting)
- **Week 4**: Phase 4 (CORS Refinement)

Each phase should be completed and tested before moving to the next.