# Decisions Log

## 2025-09-02

### Decision: Implement Comprehensive Safeguards
**Context**: After multiple incidents of "optimizations" breaking the app
**Decision**: Created 4-layer protection system
**Outcome**: ✅ Automated testing prevents breaking commits

### Decision: Fix Image Embedding via Dropbox API
**Context**: Images weren't displaying in Notion (404 errors)
**Decision**: Upload images directly via Dropbox API instead of local sync
**Outcome**: ✅ Images now embed properly with real shareable URLs

### Decision: Remove Problematic Security Middleware
**Context**: Helmet headers blocked LinkedIn CORS
**Decision**: Removed Helmet, kept only safe security measures
**Outcome**: ✅ LinkedIn integration works, basic security maintained

### Decision: Revert to v1.0.0 Architecture
**Context**: v2.0.0 "modular optimization" broke image handling
**Decision**: Rolled back to simpler, working architecture
**Outcome**: ✅ All features restored to working state

### Decision: Implement Phase 1 Security Only
**Context**: Need security without breaking LinkedIn
**Decision**: Added logging, error handling, env validation only
**Outcome**: ✅ Basic security added without breaking functionality

## Key Learnings

1. **Working code > Clean code** - Every optimization attempt broke something
2. **Test immediately** - Not after multiple changes
3. **Small incremental changes** - Easier to identify what breaks
4. **Document everything** - Future reference is invaluable
5. **Maintain stable branches** - Always have a working fallback

## Architectural Decisions

### CORS Configuration
**Decision**: Keep permissive CORS (`app.use(cors())`)
**Reason**: LinkedIn origin must always be allowed
**Alternative rejected**: Specific origin whitelist (too fragile)

### Image Processing Flow
**Decision**: Download → Upload to Dropbox API → Generate share link → Embed
**Reason**: Immediate shareable URLs without waiting for sync
**Alternative rejected**: Local save and wait for sync (too slow, unreliable)

### Error Handling
**Decision**: Generic error messages to client, detailed logs server-side
**Reason**: Security (don't leak stack traces) while maintaining debuggability
**Alternative rejected**: Detailed errors to client (security risk)

### Testing Strategy
**Decision**: Automated critical path testing with pre-commit hooks
**Reason**: Prevent breaking commits from entering codebase
**Alternative rejected**: Manual testing only (too error-prone)

## Technical Debt Acknowledged

1. **Duplicate page prevention** - Currently creates duplicates on rapid requests
2. **Performance optimization** - Image processing could be faster
3. **Error recovery** - Could be more graceful with retries
4. **Code organization** - Could be cleaner (but works!)

These are acknowledged but NOT priorities. Stability > Optimization.

## Future Considerations

Before making ANY of these changes, ensure:
- Full test suite passes
- Backup branch created
- Incremental implementation
- Testing after each step

1. Rate limiting (carefully, without blocking legitimate use)
2. Request validation (without being too strict)
3. Better duplicate detection
4. Video processing optimization
5. Batch processing support

## Forbidden Changes

These have been tried and failed:

❌ Helmet security headers (breaks CORS)
❌ Strict CSP policies (blocks LinkedIn)
❌ Architecture "optimization" (breaks everything)
❌ Async/await refactoring (subtle bugs)
❌ Combining services (creates coupling)

## The Prime Directive

**If it works, don't fix it.**

Every decision should be evaluated against this: Will it break LinkedIn integration or image embedding? If there's any doubt, don't do it.