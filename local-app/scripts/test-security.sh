#!/bin/bash

# Test security improvements
# Tests XSS prevention, error sanitization, and security headers

echo "🔒 Starting Security Tests..."
echo "=========================================="

PORT=8765
BASE_URL="http://localhost:$PORT"
PASSED=0
FAILED=0

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to test and report
test_case() {
    local test_name="$1"
    local result="$2"
    
    echo -n "Testing: $test_name... "
    
    if [ "$result" = "true" ]; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((FAILED++))
    fi
}

# Check if server is running
echo -n "Checking server status... "
HEALTH_RESPONSE=$(curl -s "$BASE_URL/health")
if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
    echo -e "${GREEN}✅ Server is running${NC}"
else
    echo -e "${RED}❌ Server is not running on port $PORT${NC}"
    echo "Please start the server with: npm start"
    exit 1
fi

echo ""
echo "1️⃣ Testing Security Headers..."
echo "----------------------------------"

# Test for security headers
HEADERS=$(curl -s -I "$BASE_URL/health")

# Check X-Content-Type-Options
if echo "$HEADERS" | grep -qi "X-Content-Type-Options: nosniff"; then
    test_case "X-Content-Type-Options header" "true"
else
    test_case "X-Content-Type-Options header" "false"
fi

# Check X-Frame-Options
if echo "$HEADERS" | grep -qi "X-Frame-Options: SAMEORIGIN"; then
    test_case "X-Frame-Options header" "true"
else
    test_case "X-Frame-Options header" "false"
fi

# Check X-XSS-Protection
if echo "$HEADERS" | grep -qi "X-XSS-Protection: 1; mode=block"; then
    test_case "X-XSS-Protection header" "true"
else
    test_case "X-XSS-Protection header" "false"
fi

# Check Referrer-Policy
if echo "$HEADERS" | grep -qi "Referrer-Policy: strict-origin-when-cross-origin"; then
    test_case "Referrer-Policy header" "true"
else
    test_case "Referrer-Policy header" "false"
fi

echo ""
echo "2️⃣ Testing XSS Prevention..."
echo "----------------------------------"

# Test XSS in text field
XSS_RESPONSE=$(curl -s -X POST "$BASE_URL/save-post" \
    -H "Content-Type: application/json" \
    -H "Origin: https://www.linkedin.com" \
    -d '{
        "text": "<script>alert(\"XSS\")</script>Regular text",
        "author": "Test<script>alert(1)</script>User",
        "url": "https://linkedin.com/posts/123"
    }')

# Check if script tags were sanitized
if echo "$XSS_RESPONSE" | grep -q "<script>"; then
    test_case "XSS prevention in text" "false"
else
    test_case "XSS prevention in text" "true"
fi

# Test javascript: protocol in URL
JS_URL_RESPONSE=$(curl -s -X POST "$BASE_URL/save-post" \
    -H "Content-Type: application/json" \
    -H "Origin: https://www.linkedin.com" \
    -d '{
        "text": "Test post",
        "author": "Test User",
        "url": "javascript:alert(1)"
    }')

# Check if javascript: URL was blocked
if echo "$JS_URL_RESPONSE" | grep -q "Missing required field: url"; then
    test_case "javascript: URL blocking" "true"
else
    test_case "javascript: URL blocking" "false"
fi

echo ""
echo "3️⃣ Testing Error Message Sanitization..."
echo "----------------------------------"

# Test that error messages don't leak paths
ERROR_RESPONSE=$(curl -s "$BASE_URL/test-error")

# Check if file paths are sanitized
if echo "$ERROR_RESPONSE" | grep -q "/Users/\|/home/\|C:\\\\"; then
    test_case "File path sanitization" "false"
else
    test_case "File path sanitization" "true"
fi

# Check if API keys would be sanitized
if echo "$ERROR_RESPONSE" | grep -q "secret_\|api_key\|token"; then
    test_case "API key sanitization" "false"
else
    test_case "API key sanitization" "true"
fi

echo ""
echo "4️⃣ Testing Request Size Limits..."
echo "----------------------------------"

# Test small request to health endpoint
SMALL_RESPONSE=$(curl -s -X POST "$BASE_URL/health" \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}' \
    -w "\n%{http_code}")

HTTP_CODE=$(echo "$SMALL_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "200" ]; then
    test_case "Small request to health endpoint" "true"
else
    test_case "Small request to health endpoint" "false"
fi

# Test that save-post can handle moderate size
LARGE_TEXT=$(printf 'x%.0s' {1..10000})  # 10KB of text
MODERATE_RESPONSE=$(curl -s -X POST "$BASE_URL/save-post" \
    -H "Content-Type: application/json" \
    -H "Origin: https://www.linkedin.com" \
    -d "{
        \"text\": \"$LARGE_TEXT\",
        \"author\": \"Test User\",
        \"url\": \"https://linkedin.com/posts/123\"
    }" \
    -w "\n%{http_code}")

HTTP_CODE=$(echo "$MODERATE_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
    test_case "Moderate size request handling" "true"
else
    test_case "Moderate size request handling" "false"
fi

echo ""
echo "5️⃣ Testing Input Validation..."
echo "----------------------------------"

# Test missing required fields
MISSING_FIELD_RESPONSE=$(curl -s -X POST "$BASE_URL/save-post" \
    -H "Content-Type: application/json" \
    -H "Origin: https://www.linkedin.com" \
    -d '{
        "text": "Test post"
    }')

if echo "$MISSING_FIELD_RESPONSE" | grep -q "Missing required field: author"; then
    test_case "Required field validation" "true"
else
    test_case "Required field validation" "false"
fi

# Test field size limits
LONG_AUTHOR=$(printf 'x%.0s' {1..300})  # 300 chars (over 200 limit)
SIZE_LIMIT_RESPONSE=$(curl -s -X POST "$BASE_URL/save-post" \
    -H "Content-Type: application/json" \
    -H "Origin: https://www.linkedin.com" \
    -d "{
        \"text\": \"Test\",
        \"author\": \"$LONG_AUTHOR\",
        \"url\": \"https://linkedin.com/posts/123\"
    }")

if echo "$SIZE_LIMIT_RESPONSE" | grep -q "exceeds maximum length"; then
    test_case "Field size limit enforcement" "true"
else
    test_case "Field size limit enforcement" "false"
fi

echo ""
echo "=========================================="
echo "Security Test Results Summary:"
echo "  Passed: ${GREEN}$PASSED${NC}"
echo "  Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All security tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some security tests failed. Please review the output above.${NC}"
    exit 1
fi