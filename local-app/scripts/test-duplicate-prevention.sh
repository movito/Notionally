#!/bin/bash

# Test Script for TASK-006: Duplicate Page Prevention
# This script tests the duplicate prevention mechanism

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_URL="http://localhost:8765"
TEST_RESULTS_FILE="/tmp/duplicate_test_results.json"

echo "🧪 Duplicate Prevention Test Suite"
echo "=================================="

# Function to check if server is running
check_server() {
    if ! curl -s "${SERVER_URL}/health" > /dev/null 2>&1; then
        echo -e "${RED}❌ Server is not running at ${SERVER_URL}${NC}"
        echo "Please start the server with: npm start"
        exit 1
    fi
    echo -e "${GREEN}✅ Server is running${NC}"
}

# Function to create test post data
create_test_data() {
    local url="$1"
    local title="$2"
    cat <<EOF
{
    "url": "${url}",
    "text": "${title}",
    "author": "Test Author",
    "authorProfileUrl": "https://linkedin.com/in/test",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "media": {
        "videos": [],
        "images": []
    }
}
EOF
}

# Test 1: Rapid duplicate requests (same URL within cache window)
test_rapid_duplicates() {
    echo ""
    echo "📋 Test 1: Rapid Duplicate Prevention"
    echo "--------------------------------------"
    
    local test_url="https://linkedin.com/test-duplicate-$(date +%s)"
    local test_data=$(create_test_data "$test_url" "Test Duplicate Post")
    
    echo "Sending two rapid requests with same URL..."
    
    # Send first request
    response1=$(curl -s -X POST "${SERVER_URL}/save-post" \
        -H "Content-Type: application/json" \
        -H "Origin: https://www.linkedin.com" \
        -d "$test_data")
    
    # Send second request immediately
    response2=$(curl -s -X POST "${SERVER_URL}/save-post" \
        -H "Content-Type: application/json" \
        -H "Origin: https://www.linkedin.com" \
        -d "$test_data")
    
    # Extract Notion URLs
    notion_url1=$(echo "$response1" | grep -o '"notionUrl":"[^"]*' | cut -d'"' -f4)
    notion_url2=$(echo "$response2" | grep -o '"notionUrl":"[^"]*' | cut -d'"' -f4)
    
    if [ "$notion_url1" = "$notion_url2" ] && [ -n "$notion_url1" ]; then
        echo -e "${GREEN}✅ PASS: Both requests returned same Notion page${NC}"
        echo "   URL: $notion_url1"
        return 0
    else
        echo -e "${RED}❌ FAIL: Different pages created${NC}"
        echo "   URL 1: $notion_url1"
        echo "   URL 2: $notion_url2"
        return 1
    fi
}

# Test 2: Different URLs should create different pages
test_different_urls() {
    echo ""
    echo "📋 Test 2: Different URLs Create Different Pages"
    echo "-------------------------------------------------"
    
    local test_url1="https://linkedin.com/test-unique1-$(date +%s)"
    local test_url2="https://linkedin.com/test-unique2-$(date +%s)"
    local test_data1=$(create_test_data "$test_url1" "First Unique Post")
    local test_data2=$(create_test_data "$test_url2" "Second Unique Post")
    
    echo "Sending requests with different URLs..."
    
    # Send both requests
    response1=$(curl -s -X POST "${SERVER_URL}/save-post" \
        -H "Content-Type: application/json" \
        -H "Origin: https://www.linkedin.com" \
        -d "$test_data1")
    
    response2=$(curl -s -X POST "${SERVER_URL}/save-post" \
        -H "Content-Type: application/json" \
        -H "Origin: https://www.linkedin.com" \
        -d "$test_data2")
    
    # Extract Notion URLs
    notion_url1=$(echo "$response1" | grep -o '"notionUrl":"[^"]*' | cut -d'"' -f4)
    notion_url2=$(echo "$response2" | grep -o '"notionUrl":"[^"]*' | cut -d'"' -f4)
    
    if [ "$notion_url1" != "$notion_url2" ] && [ -n "$notion_url1" ] && [ -n "$notion_url2" ]; then
        echo -e "${GREEN}✅ PASS: Different pages created for different URLs${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL: Same page returned for different URLs${NC}"
        echo "   URL 1: $notion_url1"
        echo "   URL 2: $notion_url2"
        return 1
    fi
}

# Test 3: Cache expiration (requests after TTL should create new page)
test_cache_expiration() {
    echo ""
    echo "📋 Test 3: Cache Expiration (61 second TTL)"
    echo "--------------------------------------------"
    echo -e "${YELLOW}Note: This test takes 61 seconds to complete${NC}"
    
    local test_url="https://linkedin.com/test-expiry-$(date +%s)"
    local test_data=$(create_test_data "$test_url" "Cache Expiry Test Post")
    
    echo "Sending first request..."
    response1=$(curl -s -X POST "${SERVER_URL}/save-post" \
        -H "Content-Type: application/json" \
        -H "Origin: https://www.linkedin.com" \
        -d "$test_data")
    
    notion_url1=$(echo "$response1" | grep -o '"notionUrl":"[^"]*' | cut -d'"' -f4)
    echo "First page created: $notion_url1"
    
    echo "Waiting 61 seconds for cache to expire..."
    sleep 61
    
    echo "Sending second request after cache expiry..."
    response2=$(curl -s -X POST "${SERVER_URL}/save-post" \
        -H "Content-Type: application/json" \
        -H "Origin: https://www.linkedin.com" \
        -d "$test_data")
    
    notion_url2=$(echo "$response2" | grep -o '"notionUrl":"[^"]*' | cut -d'"' -f4)
    
    if [ "$notion_url1" != "$notion_url2" ] && [ -n "$notion_url1" ] && [ -n "$notion_url2" ]; then
        echo -e "${GREEN}✅ PASS: New page created after cache expiry${NC}"
        echo "   New URL: $notion_url2"
        return 0
    else
        echo -e "${RED}❌ FAIL: Same page returned after cache should have expired${NC}"
        return 1
    fi
}

# Test 4: Concurrent requests (stress test)
test_concurrent_requests() {
    echo ""
    echo "📋 Test 4: Concurrent Request Handling"
    echo "---------------------------------------"
    
    local test_url="https://linkedin.com/test-concurrent-$(date +%s)"
    local test_data=$(create_test_data "$test_url" "Concurrent Test Post")
    local temp_dir="/tmp/concurrent_test_$$"
    mkdir -p "$temp_dir"
    
    echo "Sending 5 concurrent requests with same URL..."
    
    # Launch 5 concurrent requests
    for i in {1..5}; do
        (
            curl -s -X POST "${SERVER_URL}/save-post" \
                -H "Content-Type: application/json" \
                -H "Origin: https://www.linkedin.com" \
                -d "$test_data" > "$temp_dir/response_$i.json"
        ) &
    done
    
    # Wait for all requests to complete
    wait
    
    # Extract and compare URLs
    local urls=()
    for i in {1..5}; do
        url=$(grep -o '"notionUrl":"[^"]*' "$temp_dir/response_$i.json" | cut -d'"' -f4)
        urls+=("$url")
    done
    
    # Check if all URLs are the same
    local first_url="${urls[0]}"
    local all_same=true
    for url in "${urls[@]}"; do
        if [ "$url" != "$first_url" ]; then
            all_same=false
            break
        fi
    done
    
    # Cleanup
    rm -rf "$temp_dir"
    
    if [ "$all_same" = true ] && [ -n "$first_url" ]; then
        echo -e "${GREEN}✅ PASS: All 5 concurrent requests returned same page${NC}"
        echo "   URL: $first_url"
        return 0
    else
        echo -e "${RED}❌ FAIL: Concurrent requests created different pages${NC}"
        for i in "${!urls[@]}"; do
            echo "   Request $((i+1)): ${urls[$i]}"
        done
        return 1
    fi
}

# Test 5: Missing URL validation
test_missing_url() {
    echo ""
    echo "📋 Test 5: Posts Without URL (Validation)"
    echo "------------------------------------------"
    
    local test_data='{
        "text": "Post without URL",
        "author": "Test Author",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
    }'
    
    echo "Sending request without URL (should be rejected)..."
    
    response=$(curl -s -X POST "${SERVER_URL}/save-post" \
        -H "Content-Type: application/json" \
        -H "Origin: https://www.linkedin.com" \
        -d "$test_data")
    
    # Check if error message contains expected validation error
    if echo "$response" | grep -q "Missing required field: url"; then
        echo -e "${GREEN}✅ PASS: URL validation working correctly${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL: Expected validation error for missing URL${NC}"
        echo "   Response: $response"
        return 1
    fi
}

# Main test runner
main() {
    local total_tests=5
    local passed_tests=0
    local failed_tests=0
    local skipped_tests=0
    
    # Check server is running
    check_server
    
    # Run tests
    tests=(
        "test_rapid_duplicates"
        "test_different_urls"
        "test_concurrent_requests"
        "test_missing_url"
        "test_cache_expiration"  # Run this last as it takes time
    )
    
    for test in "${tests[@]}"; do
        if $test; then
            ((passed_tests++))
        else
            ((failed_tests++))
        fi
    done
    
    # Print summary
    echo ""
    echo "=================================="
    echo "📊 Test Summary"
    echo "=================================="
    echo -e "${GREEN}Passed: $passed_tests${NC}"
    echo -e "${RED}Failed: $failed_tests${NC}"
    echo -e "${YELLOW}Skipped: $skipped_tests${NC}"
    echo "----------------------------------"
    echo "Total: $total_tests"
    
    if [ $failed_tests -eq 0 ]; then
        echo ""
        echo -e "${GREEN}🎉 All tests passed!${NC}"
        exit 0
    else
        echo ""
        echo -e "${RED}⚠️  Some tests failed${NC}"
        exit 1
    fi
}

# Handle script arguments
if [ "$1" = "--quick" ]; then
    echo "Running quick tests only (skipping cache expiration test)..."
    # Remove the cache expiration test from the list
    tests=(
        "test_rapid_duplicates"
        "test_different_urls"
        "test_concurrent_requests"
        "test_missing_url"
    )
fi

# Run main
main