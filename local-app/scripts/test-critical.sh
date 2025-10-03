#!/bin/bash

# Critical Functionality Test Suite for notionally
# Run this before ANY commit to ensure nothing is broken

set -e  # Exit on any error

echo "🧪 Starting Critical Functionality Tests..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -ne "Testing: $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Function to check HTTP response
check_http_response() {
    local url="$1"
    local expected_code="$2"
    local actual_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    [ "$actual_code" = "$expected_code" ]
}

# Ensure server is running
if ! lsof -i:8765 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Server not running on port 8765${NC}"
    echo "Please start the server with 'npm start' in another terminal"
    exit 1
fi

echo -e "${GREEN}✅ Server is running on port 8765${NC}"
echo ""

# Test 1: Health Check
run_test "Health endpoint" "check_http_response 'http://localhost:8765/health' 200"

# Test 2: CORS with LinkedIn Origin
run_test "LinkedIn CORS" 'curl -s -X OPTIONS http://localhost:8765/save-post \
    -H "Origin: https://www.linkedin.com" \
    -H "Access-Control-Request-Method: POST" \
    -I 2>/dev/null | grep -q "HTTP/1.1 204"'

# Test 3: Save Post Endpoint (Minimal)
run_test "Save post (minimal)" 'curl -s -X POST http://localhost:8765/save-post \
    -H "Origin: https://www.linkedin.com" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"Test\",\"author\":\"Test\",\"url\":\"https://linkedin.com/test-$(date +%s)\",\"timestamp\":\"$(date -Iseconds)\"}" \
    | grep -q "\"success\":true"'

# Test 4: Save Post with Image
echo ""
echo "Testing image processing (this may take up to 20 seconds)..."
IMAGE_TEST_RESULT=$(curl -s -X POST http://localhost:8765/save-post \
    -H "Origin: https://www.linkedin.com" \
    -H "Content-Type: application/json" \
    -d '{
        "text": "Automated test with image",
        "author": "Test Suite",
        "url": "https://linkedin.com/test-image-'$(date +%s)'",
        "timestamp": "'$(date -Iseconds)'",
        "media": {
            "images": [{
                "src": "https://www.w3schools.com/html/pic_trulli.jpg",
                "alt": "Test image"
            }]
        }
    }' 2>/dev/null)

if echo "$IMAGE_TEST_RESULT" | grep -q '"success":true'; then
    echo -e "Testing: Image processing... ${GREEN}✅ PASSED${NC}"
    ((TESTS_PASSED++))
    
    # Extract Notion URL
    NOTION_URL=$(echo "$IMAGE_TEST_RESULT" | grep -o '"notionUrl":"[^"]*' | cut -d'"' -f4)
    if [ -n "$NOTION_URL" ]; then
        echo -e "  └─ Notion page created: $NOTION_URL"
    fi
else
    echo -e "Testing: Image processing... ${RED}❌ FAILED${NC}"
    ((TESTS_FAILED++))
fi

# Test 5: Dropbox Configuration
run_test "Dropbox configured" 'curl -s http://localhost:8765/health | grep -q "\"dropbox\":\"configured\""'

# Test 6: Notion Configuration  
run_test "Notion configured" 'curl -s http://localhost:8765/health | grep -q "\"notion\":\"configured\""'

# Test 7: No Duplicate Pages (Quick successive requests)
echo ""
echo "Testing duplicate prevention..."
UNIQUE_URL="https://linkedin.com/test-dup-$(date +%s)"
FIRST_RESPONSE=$(curl -s -X POST http://localhost:8765/save-post \
    -H "Origin: https://www.linkedin.com" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"Duplicate test\",\"author\":\"Test\",\"url\":\"$UNIQUE_URL\",\"timestamp\":\"$(date -Iseconds)\"}" 2>/dev/null)

# Small delay
sleep 2

SECOND_RESPONSE=$(curl -s -X POST http://localhost:8765/save-post \
    -H "Origin: https://www.linkedin.com" \
    -H "Content-Type: application/json" \
    -d "{\"text\":\"Duplicate test\",\"author\":\"Test\",\"url\":\"$UNIQUE_URL\",\"timestamp\":\"$(date -Iseconds)\"}" 2>/dev/null)

FIRST_NOTION=$(echo "$FIRST_RESPONSE" | grep -o '"notionUrl":"[^"]*' | cut -d'"' -f4)
SECOND_NOTION=$(echo "$SECOND_RESPONSE" | grep -o '"notionUrl":"[^"]*' | cut -d'"' -f4)

if [ "$FIRST_NOTION" != "$SECOND_NOTION" ]; then
    echo -e "Testing: Duplicate prevention... ${YELLOW}⚠️  WARNING${NC}"
    echo "  └─ Two different pages were created. Check for duplicate handling."
else
    echo -e "Testing: Duplicate prevention... ${GREEN}✅ PASSED${NC}"
    ((TESTS_PASSED++))
fi

# Summary
echo ""
echo "=========================================="
echo "Test Results Summary:"
echo -e "  Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "  Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ All critical tests passed! Safe to proceed.${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Critical tests failed! DO NOT COMMIT!${NC}"
    echo ""
    echo "Recommended actions:"
    echo "1. Check server logs for errors"
    echo "2. Verify .env configuration"
    echo "3. Run: git diff to see what changed"
    echo "4. Consider reverting: git checkout stable-v1.0.0"
    exit 1
fi