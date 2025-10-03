# Test Runner Guide for notionally

## Overview
This document provides essential information for test-runner agents to effectively validate features and maintain quality in the notionally project.

## Quick Start

### Primary Test Command
```bash
cd ../local-app && ./scripts/test-critical.sh
```
This must pass with 7/7 tests before any feature can be approved.

## Test Suite Structure

### 1. Critical Tests (`test-critical.sh`)
**Purpose**: Validates core functionality
**Pass Criteria**: 7/7 tests must pass
**Covers**:
- Server health
- LinkedIn CORS
- Save post functionality
- Image processing
- Dropbox configuration
- Notion integration
- Duplicate prevention

### 2. Rate Limiting Tests (`test-rate-limiting.sh`)
**Purpose**: Validates v1.0.5+ rate limiting feature
**Expected Results**: 6/8 pass (2 known false positives)
**Known Issues**:
- Headers test fails due to script bug (not implementation bug)
- Fix: Test sends request to localhost without X-Forwarded-For, triggering bypass

### 3. Security Tests (`test-security.sh`)
**Purpose**: Validates security hardening
**Expected Results**: 11/12 pass
**Known Issues**:
- Moderate size request test fails (pre-existing, low priority)

### 4. Duplicate Prevention Tests (`test-duplicate-prevention.sh`)
**Purpose**: Validates cache and deduplication
**Pass Criteria**: 5/5 tests must pass
**Note**: Test 3 takes 61 seconds (cache expiry test)

## Test Execution Order

1. Always run `test-critical.sh` first
2. Run feature-specific tests based on the version:
   - v1.0.2: Focus on input validation
   - v1.0.3: Run duplicate prevention tests
   - v1.0.4: Run security tests
   - v1.0.5: Run rate limiting tests
3. Run all tests for comprehensive validation

## Known Test Issues & Workarounds

### Rate Limiting Header Test (False Positive)
**Issue**: `test-rate-limiting.sh` reports missing headers
**Root Cause**: Test checks headers on localhost request without simulating remote IP
**Workaround**: Manually verify headers with:
```bash
curl -v -X POST http://localhost:8765/save-post \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 192.168.1.1" \
  -d '{"author":"Test","url":"https://test.com/1","text":"Test"}' 2>&1 | grep -i "ratelimit"
```
**Expected Output**:
```
< RateLimit-Policy: 30;w=60
< RateLimit-Limit: 30
< RateLimit-Remaining: 29
```

### Security Test - Moderate Size Request
**Issue**: Security test fails on moderate size request handling
**Impact**: Minimal - doesn't affect normal operation
**Status**: Pre-existing issue, not blocking

## Approval Criteria

### For Feature Approval
- ✅ All critical tests (7/7) must pass
- ✅ Feature-specific tests must meet expected results
- ✅ No regression in previously passing tests
- ⚠️ Document any new known issues

### For Version Release
- ✅ All critical tests passing
- ✅ Version-specific features tested
- ✅ No critical security vulnerabilities
- ✅ Performance not degraded

## Testing Best Practices

### 1. Always Check Server Status First
```bash
curl http://localhost:8765/health
```

### 2. Run Tests in Clean State
- Ensure server is running fresh
- Clear any test data from previous runs

### 3. Document Test Failures
When tests fail:
1. Note the exact error message
2. Check if it's a known issue (see above)
3. Attempt to reproduce manually
4. Document in test report

### 4. Performance Monitoring
Track these metrics during tests:
- Response times
- Memory usage
- CPU utilization
- Notion API rate limits

## Test Report Template

```markdown
## Test Runner Report for v[VERSION]

### Test Results Summary
| Test Suite | Passed | Failed | Notes |
|------------|--------|--------|-------|
| Critical | X/7 | X | |
| Rate Limiting | X/8 | X | |
| Security | X/12 | X | |
| Duplicate Prevention | X/5 | X | |

### Issues Found
1. [Issue Name]
   - Impact: [Critical/High/Medium/Low]
   - Details: [Description]
   - Recommendation: [Fix/Ignore/Document]

### Recommendation
[APPROVED/BLOCKED/CONDITIONAL] for merge/release

### Notes
[Any additional observations]
```

## Emergency Rollback

If critical tests fail after deployment:
1. Revert to previous Git tag
2. Restore previous config.json
3. Restart server
4. Run `test-critical.sh` to confirm stability

## Future Testing Improvements

### Planned Enhancements

#### 1. Fix Rate Limiting Test Script
**Priority**: High
**Location**: `test-rate-limiting.sh:line 61-73`
**Fix**: Add X-Forwarded-For header when testing for rate limit headers
**Details**: Separate localhost bypass test from header verification test

#### 2. Create Consolidated Test Runner
**Priority**: Medium
**Benefits**:
- Single command to run all test suites
- Parallel execution for faster results
- Summary dashboard with pass/fail counts
**Implementation**: Create `test-all.sh` that runs all tests and aggregates results

#### 3. Add Performance Benchmarking
**Priority**: Medium
**Metrics to Track**:
- Response times before/after features
- Memory usage during load tests
- CPU utilization patterns
**Tools**: Consider using Apache Bench (ab) or custom Node.js scripts

#### 4. Implement Test Coverage Metrics
**Priority**: Low
**Goals**:
- Track code coverage percentage
- Identify untested code paths
- Generate coverage reports
**Tools**: nyc (Istanbul) for Node.js coverage

#### 5. Add Integration Test Suite
**Priority**: Medium
**Scenarios**:
- End-to-end LinkedIn → Dropbox → Notion flow
- Multi-video post handling
- Network failure recovery scenarios
- API rate limit handling
**Location**: New file `test-integration.sh`

### Test Script Locations
All test scripts are in: `/local-app/scripts/`
- `test-critical.sh` - Core functionality
- `test-rate-limiting.sh` - Rate limiting (v1.0.5+)
- `test-security.sh` - Security hardening
- `test-duplicate-prevention.sh` - Cache validation

## Contact & Escalation

For test failures that don't match known issues:
1. Check recent commits for changes
2. Review server logs for errors
3. Consult VERSION_HISTORY.md for recent changes
4. Document new issues in this guide

---

**Last Updated**: 2025-09-03
**Version**: v1.0.5
**Status**: Active