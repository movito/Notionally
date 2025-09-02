# Testing Strategy for TASK-006: Duplicate Page Prevention

## Overview
This document outlines the comprehensive testing strategy for the duplicate page prevention feature implemented in v1.0.3.

## Implementation Summary
- **Solution**: In-memory cache with 60-second TTL
- **Location**: PostProcessingService.js
- **Key Methods**: `checkCache()`, `addToCache()`, `cleanupCache()`
- **Cleanup**: Automatic every 30 seconds + bounded to 100 entries max

## Test Categories

### 1. Unit Tests (To be implemented)

#### Cache Operations
- **Test**: Cache hit for same URL within TTL
- **Test**: Cache miss for expired entries
- **Test**: Cache miss for different URLs
- **Test**: Null URL handling (no caching)

#### Memory Management
- **Test**: Automatic cleanup removes expired entries
- **Test**: Cache size limit enforcement (max 100 entries)
- **Test**: Timer cleanup on service destroy

### 2. Integration Tests (test-duplicate-prevention.sh)

#### Test 1: Rapid Duplicate Prevention ✅
- **Scenario**: Two identical requests sent immediately
- **Expected**: Same Notion page URL returned
- **Validates**: Basic cache functionality

#### Test 2: Different URLs Create Different Pages ✅
- **Scenario**: Two requests with different URLs
- **Expected**: Different Notion pages created
- **Validates**: Cache key uniqueness

#### Test 3: Concurrent Request Handling ✅
- **Scenario**: 5 simultaneous requests with same URL
- **Expected**: All return same Notion page
- **Validates**: Thread safety/race condition handling

#### Test 4: Posts Without URL ✅
- **Scenario**: Posts missing URL field
- **Expected**: No caching, separate pages created
- **Validates**: Graceful handling of missing data

#### Test 5: Cache Expiration ✅
- **Scenario**: Same URL after 61 seconds
- **Expected**: New page created after TTL
- **Validates**: TTL enforcement

### 3. Regression Tests (test-critical.sh)

Must ensure all existing tests still pass:
- Basic post saving
- Video processing
- Image handling
- Error scenarios
- Input validation

### 4. Manual Testing Checklist

#### LinkedIn Integration
- [ ] Save same post twice rapidly from LinkedIn
- [ ] Verify button shows "Already Saved" on second click
- [ ] Test with posts containing videos
- [ ] Test with posts containing images
- [ ] Test with text-only posts

#### Server Behavior
- [ ] Monitor server logs for cache hits/misses
- [ ] Verify cleanup logs appear every 30 seconds
- [ ] Test server restart (cache should be empty)
- [ ] Test graceful shutdown (cleanup timer stops)

#### Edge Cases
- [ ] Very long URLs (500+ chars)
- [ ] URLs with special characters
- [ ] Rapid clicks (10+ times)
- [ ] Server under load

### 5. Performance Testing

#### Metrics to Monitor
- **Cache hit rate**: Should be high for duplicate saves
- **Memory usage**: Should remain stable over time
- **Response time**: Cache hits should be faster than DB queries
- **Cleanup overhead**: Should be negligible (<1ms)

#### Load Test Scenarios
1. **Burst test**: 100 unique URLs in 10 seconds
2. **Sustained test**: 10 requests/second for 5 minutes
3. **Memory test**: Fill cache to limit, verify cleanup

## Test Execution Plan

### Phase 1: Automated Tests (5 minutes)
```bash
# Quick tests (no expiration test)
./local-app/scripts/test-duplicate-prevention.sh --quick

# Full test suite
./local-app/scripts/test-duplicate-prevention.sh

# Regression tests
./local-app/scripts/test-critical.sh
```

### Phase 2: Manual LinkedIn Testing (10 minutes)
1. Start server with `npm start`
2. Open LinkedIn in Firefox with Greasemonkey
3. Execute manual testing checklist
4. Document any issues

### Phase 3: Performance Validation (15 minutes)
1. Run load tests
2. Monitor memory usage
3. Check server logs for anomalies

## Success Criteria

### Must Pass
- ✅ All automated tests pass (100%)
- ✅ No regression in existing functionality
- ✅ Cache prevents duplicates within 60 seconds
- ✅ Memory usage remains stable
- ✅ Server shutdown is clean

### Should Pass
- ⚠️ Cache hit rate > 90% for rapid duplicates
- ⚠️ Response time improvement > 50% for cache hits
- ⚠️ Handles 100+ concurrent users

### Nice to Have
- 📊 Metrics dashboard for cache performance
- 📝 Cache statistics in debug endpoint
- 🔄 Configurable TTL via environment variable

## Known Limitations

1. **Single-server only**: Cache not shared across instances
2. **Restart clears cache**: Expected behavior
3. **TTL not configurable**: Hardcoded 60 seconds
4. **No persistence**: Cache is memory-only

## Rollback Plan

If issues are discovered:
1. Comment out cache check in `processPost()`
2. Comment out `addToCache()` call
3. Deploy without cache (preserves new code structure)
4. Investigate and fix issues
5. Re-enable cache

## Testing Tools

### Automated
- `test-duplicate-prevention.sh`: Dedicated test script
- `test-critical.sh`: Regression suite
- `curl`: Manual API testing

### Monitoring
- Server logs: Cache hits/misses/cleanup
- Memory profiler: Node.js --inspect
- Network inspector: Browser DevTools

## Test Data Examples

### Valid Test Post
```json
{
    "url": "https://linkedin.com/posts/test-123",
    "text": "Test post content",
    "author": "Test Author",
    "timestamp": "2025-01-01T00:00:00Z"
}
```

### Post Without URL (No Caching)
```json
{
    "text": "Post without URL",
    "author": "Test Author",
    "timestamp": "2025-01-01T00:00:00Z"
}
```

## Handoff Notes for Testing Agent

1. **Start with**: `test-duplicate-prevention.sh --quick`
2. **If passes**: Run full suite without `--quick` flag
3. **Then run**: `test-critical.sh` for regression
4. **Monitor**: Server logs during tests
5. **Document**: Any unexpected behavior
6. **Report**: Test results in TASK-006 completion

## References
- Implementation: `/local-app/src/services/PostProcessingService.js`
- Test Script: `/local-app/scripts/test-duplicate-prevention.sh`
- Task Details: `/coordination/tasks/in-progress/TASK-006-duplicate-prevention.md`