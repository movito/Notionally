#!/bin/bash

# Rate Limiting Test Suite for v1.0.5
# Tests the implementation of TASK-008: Rate limiting protection
# 
# Requirements:
# - Server must be running on localhost:8765
# - Tests rate limiting on /save-post endpoint
# - Verifies localhost bypass
# - Checks rate limit headers

# Don't exit on error, we handle errors ourselves

PORT=8765
HOST="localhost"
ENDPOINT="http://$HOST:$PORT/save-post"
HEALTH_ENDPOINT="http://$HOST:$PORT/health"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test results
print_test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC} $2"
        ((TESTS_FAILED++))
    fi
}

echo "======================================"
echo "Rate Limiting Test Suite - v1.0.5"
echo "======================================"
echo ""

# Check if server is running
echo "1. Checking server availability..."
if curl -s -f "$HEALTH_ENDPOINT" > /dev/null 2>&1; then
    print_test_result 0 "Server is running"
else
    echo -e "${RED}Error: Server is not running on $HOST:$PORT${NC}"
    echo "Please start the server with: npm start"
    exit 1
fi

# Test 2: Localhost bypass - rapid requests should work
echo ""
echo "2. Testing localhost bypass (10 rapid requests)..."
SUCCESS_COUNT=0
for i in {1..10}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
        -H "Content-Type: application/json" \
        -H "Origin: https://www.linkedin.com" \
        -d '{
            "text": "Test post '"$i"' for localhost bypass",
            "author": "Test User",
            "url": "https://linkedin.com/posts/localhost-test-'"$i"'",
            "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"'"
        }' 2>/dev/null | tail -1)
    
    if [ "$RESPONSE" != "429" ]; then
        ((SUCCESS_COUNT++))
    fi
done

if [ $SUCCESS_COUNT -eq 10 ]; then
    print_test_result 0 "Localhost bypass working (10/10 requests succeeded)"
else
    print_test_result 1 "Localhost bypass failed ($SUCCESS_COUNT/10 requests succeeded)"
fi

# Test 3: Rate limit headers on successful request
echo ""
echo "3. Testing rate limit headers..."
HEADERS=$(curl -s -D - -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Origin: https://www.linkedin.com" \
    -d '{
        "text": "Test for headers",
        "author": "Test User",
        "url": "https://linkedin.com/posts/headers-test",
        "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"'"
    }' 2>/dev/null | head -20)

if echo "$HEADERS" | grep -qi "RateLimit-Limit:"; then
    print_test_result 0 "RateLimit-Limit header present"
else
    print_test_result 1 "RateLimit-Limit header missing"
fi

if echo "$HEADERS" | grep -qi "RateLimit-Remaining:"; then
    print_test_result 0 "RateLimit-Remaining header present"
else
    print_test_result 1 "RateLimit-Remaining header missing"
fi

# Test 4: Simulate remote IP (using X-Forwarded-For header)
echo ""
echo "4. Testing rate limiting for remote IP..."
echo "   Making 31 requests with simulated remote IP..."

# First make 30 requests (should all succeed)
SUCCESS_COUNT=0
for i in {1..30}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
        -H "Content-Type: application/json" \
        -H "Origin: https://www.linkedin.com" \
        -H "X-Forwarded-For: 192.168.1.100" \
        -d '{
            "text": "Remote test '"$i"'",
            "author": "Remote User",
            "url": "https://linkedin.com/posts/remote-'"$i"'",
            "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"'"
        }' 2>/dev/null | tail -1)
    
    if [ "$RESPONSE" != "429" ]; then
        ((SUCCESS_COUNT++))
    fi
    
    # Small delay to prevent overwhelming
    sleep 0.05
done

echo "   First 30 requests: $SUCCESS_COUNT succeeded"

# Now the 31st request should be rate limited
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Origin: https://www.linkedin.com" \
    -H "X-Forwarded-For: 192.168.1.100" \
    -d '{
        "text": "Remote test 31 - should be rate limited",
        "author": "Remote User",
        "url": "https://linkedin.com/posts/remote-31",
        "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"'"
    }' 2>/dev/null | tail -1)

if [ "$RESPONSE" = "429" ]; then
    print_test_result 0 "Rate limiting triggered at 31st request (429 status)"
else
    print_test_result 1 "Rate limiting not triggered at 31st request (got $RESPONSE)"
fi

# Test 5: Rate limit error message
echo ""
echo "5. Testing rate limit error response..."
# Make requests to ensure we hit the limit
for i in {1..35}; do
    curl -s -X POST "$ENDPOINT" \
        -H "Content-Type: application/json" \
        -H "Origin: https://www.linkedin.com" \
        -H "X-Forwarded-For: 192.168.1.101" \
        -d '{"text": "Spam", "author": "Spammer", "url": "https://linkedin.com/spam", "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"'"}' \
        > /dev/null 2>&1
done

# Check the error response
ERROR_RESPONSE=$(curl -s -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Origin: https://www.linkedin.com" \
    -H "X-Forwarded-For: 192.168.1.101" \
    -d '{"text": "Test", "author": "Test", "url": "https://linkedin.com/test", "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"'"}')

if echo "$ERROR_RESPONSE" | grep -q "Too many requests"; then
    print_test_result 0 "Rate limit error message correct"
else
    print_test_result 1 "Rate limit error message incorrect"
fi

if echo "$ERROR_RESPONSE" | grep -q "retryAfter"; then
    print_test_result 0 "Retry-after information included"
else
    print_test_result 1 "Retry-after information missing"
fi

# Test 6: Other endpoints not affected
echo ""
echo "6. Testing other endpoints are not rate limited..."

# Make many requests to health endpoint
SUCCESS_COUNT=0
for i in {1..50}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" "$HEALTH_ENDPOINT" 2>/dev/null | tail -1)
    if [ "$RESPONSE" = "200" ]; then
        ((SUCCESS_COUNT++))
    fi
done

if [ $SUCCESS_COUNT -eq 50 ]; then
    print_test_result 0 "Health endpoint not rate limited (50/50 succeeded)"
else
    print_test_result 1 "Health endpoint affected by rate limiting ($SUCCESS_COUNT/50 succeeded)"
fi

# Test 7: Window reset (optional - takes time)
if [ "${RUN_SLOW_TESTS:-0}" = "1" ]; then
    echo ""
    echo "7. Testing rate limit window reset (will take 60 seconds)..."
    echo "   Waiting for rate limit window to reset..."
    sleep 61
    
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$ENDPOINT" \
        -H "Content-Type: application/json" \
        -H "Origin: https://www.linkedin.com" \
        -H "X-Forwarded-For: 192.168.1.100" \
        -d '{
            "text": "Test after window reset",
            "author": "Test User",
            "url": "https://linkedin.com/posts/reset-test",
            "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"'"
        }' 2>/dev/null | tail -1)
    
    if [ "$RESPONSE" != "429" ]; then
        print_test_result 0 "Rate limit window reset after 60 seconds"
    else
        print_test_result 1 "Rate limit window did not reset"
    fi
else
    echo ""
    echo "7. Skipping window reset test (set RUN_SLOW_TESTS=1 to enable)"
fi

# Summary
echo ""
echo "======================================"
echo "Test Results Summary"
echo "======================================"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All rate limiting tests passed!${NC}"
    echo "Rate limiting is working correctly with localhost bypass."
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed${NC}"
    echo "Please review the implementation and check server logs."
    exit 1
fi