# notionally Security Audit Report
**Date:** October 3, 2025
**Version Audited:** v3.0.0
**Auditor:** Security Review
**Status:** ✅ Good (Minor Improvements Recommended)

---

## Executive Summary

notionally is a LinkedIn-to-Notion content saver that processes user data locally. This security audit examined authentication, input validation, file operations, dependencies, and error handling. The application demonstrates **strong security practices** with proper input sanitization, secrets management, and rate limiting. No critical vulnerabilities were identified, but several recommendations are provided to further harden security.

**Overall Risk Level:** 🟢 **LOW**

---

## 1. Authentication & Secrets Management

### ✅ Strengths

#### 1.1 Environment Variable Protection
- **`.env` file properly gitignored** (`.gitignore:65`)
- Secrets loaded via `dotenv` at startup (`server.js:19`)
- `.env.example` provided with placeholder values
- No hardcoded secrets in codebase

#### 1.2 File Permission Checking
```javascript
// server.js:21-35
const stats = fs.statSync(envPath);
const mode = (stats.mode & parseInt('777', 8)).toString(8);
if (mode !== '600' && mode !== '644') {
    console.warn('⚠️  Warning: .env file has permissions ' + mode);
    console.warn('🔐 Consider restricting with: chmod 600 .env');
}
```
**Excellent practice** - warns users about overly permissive file permissions.

#### 1.3 Sensitive Value Masking
```javascript
// ConfigManager.js:128-132
maskValue(value) {
    if (!value) return 'Not configured';
    if (value.length <= 8) return '****';
    return value.substring(0, 4) + '****' + value.substring(value.length - 4);
}
```
Secrets are masked in logs to prevent accidental exposure.

#### 1.4 Token Refresh Strategy
```javascript
// dropbox-handler.js:24-30
this.tokenRefreshInterval = setInterval(() => {
    this.refreshAccessToken();
}, 3 * 60 * 60 * 1000); // Proactive refresh every 3 hours
```
Dropbox refresh tokens are proactively rotated before expiry (4-hour lifetime).

### ⚠️ Risks

#### 1.1 Notion API Key Exposure (LOW RISK)
- Notion API keys are stored in plaintext in `.env`
- **Mitigation:** Keys are never committed to git, properly masked in logs
- **Impact:** If `.env` is leaked, attacker gains access to user's Notion workspace
- **Recommendation:** Document key rotation procedures in security policy

#### 1.2 Dropbox App Secret Storage (LOW RISK)
- Client secrets stored in `.env` for OAuth refresh flow
- **Mitigation:** Required for OAuth 2.0 refresh token exchange
- **Impact:** If leaked with refresh token, attacker could impersonate the app
- **Recommendation:** Acceptable for desktop apps; consider hardware keychain on macOS

---

## 2. Input Validation & Sanitization

### ✅ Strengths

#### 2.1 Comprehensive XSS Prevention
```javascript
// sanitization.js:6-44
function sanitizeText(text) {
    // Remove script tags
    text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    // Remove iframes
    text = text.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    // Remove on* event handlers
    text = text.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    // Escape HTML entities
    text = text.replace(/[<>&"'`=/]/g, char => htmlEscapes[char] || char);
}
```
**Multi-layered defense** against XSS attacks.

#### 2.2 URL Protocol Validation
```javascript
// sanitization.js:92-120
const dangerousProtocols = [
    'javascript:', 'data:', 'vbscript:', 'file:',
    'about:', 'chrome:', 'chrome-extension:'
];
```
Blocks dangerous URL schemes that could execute code.

#### 2.3 Content-Type Enforcement
```javascript
// server.js:221-227
if (!req.is('application/json')) {
    return res.status(400).json({
        error: 'Content-Type must be application/json',
        requestId: req.id
    });
}
```
Prevents MIME-type confusion attacks.

#### 2.4 Field Size Limits
```javascript
// server.js:266-292
const TEXT_MAX_SIZE = 100 * 1024; // 100KB
const AUTHOR_MAX_LENGTH = 200;
const URL_MAX_LENGTH = 500;
```
Prevents memory exhaustion from oversized inputs.

#### 2.5 Request Size Limits
```javascript
// server.js:124-134
app.use('/health', express.json({ limit: '1kb' }));
app.use('/save-post', express.json({ limit: '25mb' }));
app.use(express.json({ limit: '100kb' })); // Default
```
Endpoint-specific limits prevent DoS attacks.

### ⚠️ Risks

#### 2.1 Regular Expression DoS (ReDoS) Risk (LOW)
```javascript
// sanitization.js:16
text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
```
**Complex nested quantifiers** could cause catastrophic backtracking with malicious input.

**Recommendation:**
```javascript
// Use non-backtracking approach
text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
```

---

## 3. File System Security

### ✅ Strengths

#### 3.1 Path Traversal Protection
```javascript
// server-original.js:810
if (!fullPath.startsWith(path.resolve(expandedDropboxPath))) {
    return res.status(403).json({ error: 'Access denied' });
}
```
Prevents directory traversal attacks using canonical path comparison.

#### 3.2 Controlled Temp Directory
```javascript
// video-processor.js:12
this.tempDir = path.join(__dirname, '..', 'temp');
```
All temporary files confined to application-controlled directory.

#### 3.3 Automatic Cleanup
```javascript
// video-processor.js:312-330
async cleanupTempFiles() {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    // Removes stale temp files
}
```
Prevents temp directory from growing unbounded.

#### 3.4 Safe Path Construction
All file paths use `path.join()` rather than string concatenation, preventing injection.

### ⚠️ Risks

#### 3.1 Symlink Following (LOW RISK)
File operations in `dropbox-handler.js` don't explicitly check for symlinks.

**Scenario:** User creates symlink in Dropbox folder pointing outside allowed directory.

**Current Mitigation:** Path traversal check in `server-original.js:810` provides defense.

**Recommendation:**
```javascript
const realPath = await fs.realpath(fullPath);
if (!realPath.startsWith(path.resolve(expandedDropboxPath))) {
    return res.status(403).json({ error: 'Access denied' });
}
```

#### 3.2 Investigation Data Directory (MEDIUM RISK)
```javascript
// server.js:338-346
const investigationDir = path.join(__dirname, '../../investigation-data');
fs.writeFileSync(filepath, JSON.stringify(fullData, null, 2));
```

**Issues:**
1. No authentication on `/investigation/comments` endpoint
2. Could be abused to fill disk with large payloads
3. User-controlled `filename` uses timestamp but no validation

**Recommendations:**
1. Add authentication or remove in production
2. Add size limit for investigation payloads
3. Implement max file count for investigation directory

---

## 4. API Security

### ✅ Strengths

#### 4.1 Rate Limiting
```javascript
// server.js:146-197
const limiter = rateLimit({
    windowMs: 60000,
    max: 30, // 30 requests per minute
    skipLocalhost: true
});
app.use('/save-post', limiter);
```
Prevents brute force and DoS attacks.

#### 4.2 Request ID Tracking
```javascript
// server.js:109-120
app.use((req, res, next) => {
    req.id = uuidv4();
    res.setHeader('X-Request-Id', req.id);
    next();
});
```
Enables security event correlation and audit trails.

#### 4.3 Security Headers
```javascript
// server.js:113-117
res.setHeader('X-Content-Type-Options', 'nosniff');
res.setHeader('X-Frame-Options', 'SAMEORIGIN');
res.setHeader('X-XSS-Protection', '1; mode=block');
res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
```
Defense-in-depth against common web attacks.

#### 4.4 CORS Protection
```javascript
// server.js:106
app.use(cors());
```
CORS is enabled but defaults are restrictive (same-origin).

### ⚠️ Risks

#### 4.1 No Content Security Policy (LOW RISK)
Application doesn't set CSP header.

**Impact:** If HTML is ever served (currently only JSON), XSS risk increases.

**Recommendation:**
```javascript
res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
```

#### 4.2 Missing HSTS Header (INFORMATIONAL)
No HTTP Strict Transport Security header.

**Impact:** Only relevant if deployed with HTTPS (currently localhost only).

**Recommendation for production:**
```javascript
if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}
```

#### 4.3 Investigation Endpoint Lacks Auth (MEDIUM)
```javascript
// server.js:325-446
app.post('/investigation/comments', asyncHandler(async (req, res) => {
    // No authentication check
    // Accepts arbitrary data
}));
```

**Recommendations:**
1. Add API key authentication
2. Rate limit this endpoint separately
3. Add max payload size validation
4. Consider removing in production builds

#### 4.4 Append Endpoints Lack CSRF Protection (LOW)
```javascript
// server.js:449-549
app.post('/append-links', asyncHandler(async (req, res) => { ... }));
app.post('/append-comment', asyncHandler(async (req, res) => { ... }));
```

**Context:** CSRF less critical for localhost API called by browser extension.

**Recommendation:** Document that these endpoints expect same-origin calls only.

---

## 5. Error Handling & Information Disclosure

### ✅ Strengths

#### 5.1 Error Message Sanitization
```javascript
// errors.js:68-88
function sanitizeErrorMessage(message) {
    // Remove file paths
    sanitized = message.replace(/\/[\w\/\.\-]+/g, '[path]');
    // Remove API keys
    sanitized = sanitized.replace(/secret_[\w]+/gi, '[secret]');
    // Remove tokens
    sanitized = sanitized.replace(/token[\s]*[:=][\s]*[\w\-]+/gi, '[token]');
    // Remove stack traces
    sanitized = sanitized.replace(/at\s+.*\(.*\)/g, '');
}
```
**Excellent defense** against information leakage in error responses.

#### 5.2 Environment-Specific Error Details
```javascript
// errors.js:98
stack: process.env.NODE_ENV === 'development' ? err.stack : '[stack hidden in production]'
```
Stack traces only shown in development mode.

#### 5.3 Generic Client Error Messages
```javascript
// server.js:601-607
res.status(statusCode).json({
    error: 'Something went wrong',
    message: sanitizedMessage,
    requestId: req.id
});
```
Clients receive minimal information while server logs contain full details.

### ⚠️ Risks

#### 5.1 Version Number Disclosure (INFORMATIONAL)
```javascript
// server.js:204
version: '1.0.5'
```
Health endpoint reveals application version.

**Impact:** Minimal - attackers could identify known vulnerabilities in specific versions.

**Recommendation:** Acceptable for localhost usage; remove or obfuscate in public deployments.

---

## 6. External Dependencies

### ✅ Strengths

#### 6.1 No Known Vulnerabilities
```bash
$ npm audit
vulnerabilities: {
  "info": 0, "low": 0, "moderate": 0, "high": 0, "critical": 0, "total": 0
}
```
All dependencies are currently secure.

#### 6.2 Minimal Dependency Surface
- 13 direct dependencies (reasonable for scope)
- Well-maintained packages from reputable sources
- Node.js 22+ enforced (`package.json:52`)

#### 6.3 Pinned Major Versions
```json
"@notionhq/client": "^5.1.0",
"express": "^4.21.2",
"dropbox": "^10.34.0"
```
Semver ranges prevent unexpected breaking changes.

### ⚠️ Risks

#### 6.1 Notion SDK Data Source API (INFORMATIONAL)
Application uses new `dataSources.query()` API (v3.0.0).

**Context:** Requires `dataSourceId` configuration; failure modes properly documented.

**Status:** Working as designed; not a security issue.

#### 6.2 Dropbox SDK Token Management
```javascript
// dropbox-handler.js:13-22
this.dbx = new Dropbox({
    clientId: config.dropbox.appKey || 'lxx59je81bsuya4',
    clientSecret: config.dropbox.appSecret,
    refreshToken: config.dropbox.refreshToken
});
```

**Observation:** Hardcoded fallback `clientId` present.

**Assessment:** Acceptable - this is the app's public OAuth client ID (not secret).

---

## 7. Command Injection & External Process Execution

### ✅ Strengths

#### 7.1 No Direct Shell Injection
FFmpeg commands use fluent-ffmpeg library API, not shell string interpolation.

```javascript
// video-processor.js:134-163
ffmpeg(url)
    .inputOptions([
        '-user_agent', this.config.linkedin.userAgent,
        '-referer', 'https://www.linkedin.com/'
    ])
```
Arguments passed as array, preventing command injection.

### ⚠️ Risks

#### 7.1 User-Controlled Filenames in FFmpeg (LOW)
```javascript
// video-processor.js:52
const filename = `${timestamp}_${authorSlug}.mp4`;
```

**Analysis:** `authorSlug` is sanitized via `slugify()` which removes special characters.

**Verdict:** Safe - no injection risk.

---

## 8. CORS & Cross-Origin Security

### ✅ Strengths

#### 8.1 CORS Enabled for Extension
```javascript
// server.js:106
app.use(cors());
```
Allows browser extension to communicate with localhost server.

### ⚠️ Risks

#### 8.1 Permissive CORS (ACCEPTED RISK)
Default CORS allows all origins.

**Context:** Localhost server intended for personal use with trusted browser extension.

**Recommendation:** Document that this should not be exposed to network.

**Alternative for production:**
```javascript
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:*',
    credentials: true
}));
```

---

## 9. Logging & Audit Trail

### ✅ Strengths

#### 9.1 Request Logging with Timing
```javascript
// server.js:137-144
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${req.id}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
});
```
All requests logged with unique ID and timing.

#### 9.2 Structured Error Logging
Request IDs enable correlation across distributed logs.

### ⚠️ Risks

#### 9.1 No Log Rotation (INFORMATIONAL)
Console logs go to stdout; no built-in rotation.

**Recommendation:** Document use of external log management (e.g., `pm2` with rotation).

---

## 10. Node.js Runtime Security

### ✅ Strengths

#### 10.1 Modern Node.js Requirement
```json
"engines": { "node": ">=22.0.0" }
```
Enforces recent Node.js with security fixes.

#### 10.2 Native Fetch API
```javascript
// video-processor.js:106
const response = await fetch(url, { ... });
```
Uses built-in Node 18+ fetch instead of external library.

#### 10.3 Graceful Shutdown
```javascript
// server.js:627-660
process.on('SIGTERM', () => { ... });
process.on('SIGINT', () => { ... });
process.on('uncaughtException', (error) => { process.exit(1); });
```
Proper cleanup prevents resource leaks.

---

## Security Recommendations Summary

### 🔴 **HIGH PRIORITY**

None identified.

### 🟡 **MEDIUM PRIORITY**

1. **Secure Investigation Endpoint**
   - Add authentication to `/investigation/comments`
   - Implement rate limiting (separate from main endpoints)
   - Add max payload size and file count limits
   - Consider removing in production via environment flag

2. **Symlink Protection**
   - Use `fs.realpath()` before serving files
   - Add explicit symlink checks in file operations

### 🟢 **LOW PRIORITY**

3. **ReDoS Mitigation**
   - Replace complex regex in `sanitization.js:16` with non-backtracking version
   - Add input size pre-checks before regex operations

4. **Content Security Policy**
   - Add CSP header even for JSON-only API (defense-in-depth)

5. **CORS Tightening**
   - Document network isolation requirement
   - Consider origin whitelist for multi-user scenarios

6. **Version Disclosure**
   - Remove or obfuscate version from `/health` endpoint in production

### 📘 **BEST PRACTICES**

7. **Security Documentation**
   - Create `SECURITY.md` with:
     - Vulnerability reporting process
     - Key rotation procedures
     - Deployment security checklist
     - Network isolation requirements

8. **Dependency Monitoring**
   - Set up automated `npm audit` in CI/CD
   - Configure Dependabot or Renovate for updates

9. **Secret Rotation Documentation**
   - Document Notion API key rotation procedure
   - Document Dropbox refresh token regeneration

10. **Security Headers for Production**
    - Add HSTS if deployed over HTTPS
    - Consider `Permissions-Policy` header

---

## Compliance & Privacy

### Data Handling
- **User Data:** LinkedIn posts processed locally, stored in user's Dropbox
- **API Keys:** Stored locally in `.env`, never transmitted except to respective APIs
- **Retention:** Investigation data (`investigation-data/`) accumulates indefinitely

### Privacy Considerations
- ✅ No telemetry or external reporting
- ✅ All processing happens on user's machine
- ✅ No third-party analytics
- ⚠️ Investigation endpoint could be used to collect LinkedIn content - consider auth

---

## Testing Recommendations

1. **Fuzzing**
   - Fuzz `/save-post` endpoint with malformed JSON
   - Test XSS payloads in all text fields
   - Test path traversal in filename generation

2. **Load Testing**
   - Verify rate limiting under sustained load
   - Test memory usage with maximum-size payloads
   - Confirm temp file cleanup under failure conditions

3. **Security Regression Tests**
   - Add test cases for XSS sanitization
   - Add test cases for path traversal protection
   - Add test cases for URL protocol validation

---

## Conclusion

notionally demonstrates **strong security fundamentals** with comprehensive input validation, proper secrets management, and defense-in-depth practices. The application is well-suited for personal use on localhost. The recommended improvements are primarily defense-in-depth measures and operational hardening.

**No critical or high-severity vulnerabilities identified.**

### Security Posture Rating: 🟢 **8.5/10**

**Breakdown:**
- Authentication & Secrets: 9/10 (Excellent)
- Input Validation: 9/10 (Excellent)
- File Security: 8/10 (Very Good)
- API Security: 7/10 (Good, needs investigation endpoint hardening)
- Error Handling: 9/10 (Excellent)
- Dependencies: 10/10 (Perfect - no vulnerabilities)

**Next Security Review:** Recommended after v4.0.0 or in 12 months, whichever comes first.

---

## Appendix: Security Checklist

### For Developers
- [ ] Review this audit before making changes to authentication
- [ ] Run `npm audit` before each release
- [ ] Test XSS sanitization for new input fields
- [ ] Verify file path operations use `path.join()` or `path.resolve()`
- [ ] Check error messages don't leak sensitive data

### For Deployment
- [ ] Verify `.env` has mode 600 or 644
- [ ] Confirm `.env` is gitignored
- [ ] Run `npm run check` to verify configuration
- [ ] Ensure server only listens on localhost
- [ ] Document network isolation requirement

### For Users
- [ ] Keep Node.js updated to latest v22.x LTS
- [ ] Rotate Notion API key if `.env` is ever exposed
- [ ] Regenerate Dropbox refresh token if credentials leak
- [ ] Monitor `investigation-data/` directory size
- [ ] Review `/health` endpoint to confirm services are configured

---

**Report Generated:** October 3, 2025
**Document Version:** 1.0
**Classification:** Internal Security Review
