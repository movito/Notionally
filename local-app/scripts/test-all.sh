#!/bin/bash

# Comprehensive Test Suite for notionally
# Runs all available tests for test-runner agent

echo "🧪 notionally Comprehensive Test Suite"
echo "======================================="
echo "Version: v1.1.0"
echo "Date: $(date)"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Result tracking
declare -A TEST_RESULTS
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

# Function to run a test suite
run_test_suite() {
    local suite_name=$1
    local script_path=$2
    local must_pass=$3  # "critical" or "optional"
    
    TOTAL_SUITES=$((TOTAL_SUITES + 1))
    
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}Running: $suite_name${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if [ ! -f "$script_path" ]; then
        echo -e "${YELLOW}⚠️  Test script not found: $script_path${NC}"
        TEST_RESULTS["$suite_name"]="NOT_FOUND"
        FAILED_SUITES=$((FAILED_SUITES + 1))
        return
    fi
    
    # Run the test
    if bash "$script_path"; then
        echo -e "${GREEN}✅ $suite_name PASSED${NC}"
        TEST_RESULTS["$suite_name"]="PASSED"
        PASSED_SUITES=$((PASSED_SUITES + 1))
    else
        if [ "$must_pass" = "critical" ]; then
            echo -e "${RED}❌ $suite_name FAILED (CRITICAL)${NC}"
        else
            echo -e "${YELLOW}⚠️  $suite_name FAILED (non-critical)${NC}"
        fi
        TEST_RESULTS["$suite_name"]="FAILED"
        FAILED_SUITES=$((FAILED_SUITES + 1))
    fi
}

# Start time
START_TIME=$(date +%s)

echo -e "${BOLD}Starting comprehensive test run...${NC}"

# Core Functionality Tests (MUST PASS)
run_test_suite "Critical Functionality" "scripts/test-critical.sh" "critical"

# Feature Tests
run_test_suite "Interactive Setup (v1.1.0)" "scripts/test-interactive-setup.sh" "critical"
run_test_suite "Duplicate Prevention" "scripts/test-duplicate-prevention.sh" "optional"
run_test_suite "Rate Limiting" "scripts/test-rate-limiting.sh" "optional"
run_test_suite "Security" "scripts/test-security.sh" "optional"

# Documentation Tests
echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Running: Documentation Tests${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ -f "../scripts/test-doc-references.sh" ]; then
    cd .. && bash scripts/test-doc-references.sh && cd local-app
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Documentation Tests PASSED${NC}"
        TEST_RESULTS["Documentation"]="PASSED"
        PASSED_SUITES=$((PASSED_SUITES + 1))
    else
        echo -e "${YELLOW}⚠️  Documentation Tests FAILED${NC}"
        TEST_RESULTS["Documentation"]="FAILED"
        FAILED_SUITES=$((FAILED_SUITES + 1))
    fi
    TOTAL_SUITES=$((TOTAL_SUITES + 1))
else
    echo -e "${YELLOW}⚠️  Documentation test script not found${NC}"
fi

# Calculate runtime
END_TIME=$(date +%s)
RUNTIME=$((END_TIME - START_TIME))

# Generate Test Report
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}📊 TEST RESULTS SUMMARY${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Table header
printf "%-30s | %-10s | %s\n" "Test Suite" "Result" "Status"
printf "%-30s-+-%-10s-+-%s\n" "------------------------------" "----------" "--------"

# Results table
for suite in "Critical Functionality" "Interactive Setup (v1.1.0)" "Duplicate Prevention" "Rate Limiting" "Security" "Documentation"; do
    result="${TEST_RESULTS[$suite]:-SKIPPED}"
    
    if [ "$result" = "PASSED" ]; then
        status_color="${GREEN}"
        status_icon="✅"
    elif [ "$result" = "FAILED" ]; then
        if [[ "$suite" == "Critical"* ]] || [[ "$suite" == "Interactive"* ]]; then
            status_color="${RED}"
            status_icon="❌"
        else
            status_color="${YELLOW}"
            status_icon="⚠️"
        fi
    elif [ "$result" = "NOT_FOUND" ]; then
        status_color="${YELLOW}"
        status_icon="❓"
    else
        status_color="${YELLOW}"
        status_icon="⏭️"
    fi
    
    printf "%-30s | ${status_color}%-10s${NC} | %s\n" "$suite" "$result" "$status_icon"
done

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Summary stats
echo -e "${BOLD}Summary:${NC}"
echo -e "  Total Test Suites: $TOTAL_SUITES"
echo -e "  Passed: ${GREEN}$PASSED_SUITES${NC}"
echo -e "  Failed: ${RED}$FAILED_SUITES${NC}"
echo -e "  Runtime: ${RUNTIME} seconds"
echo ""

# Known Issues (from TEST-RUNNER-GUIDE.md)
echo -e "${BOLD}Known Issues:${NC}"
echo "  • Rate Limiting: Headers test false positive (6/8 expected)"
echo "  • Security: Moderate size test fails (11/12 expected)"
echo ""

# Recommendation
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}RECOMMENDATION:${NC}"

# Check if critical tests passed
CRITICAL_PASSED=true
if [ "${TEST_RESULTS['Critical Functionality']}" != "PASSED" ]; then
    CRITICAL_PASSED=false
fi
if [ "${TEST_RESULTS['Interactive Setup (v1.1.0)']}" != "PASSED" ]; then
    CRITICAL_PASSED=false
fi

if [ "$CRITICAL_PASSED" = true ] && [ $FAILED_SUITES -le 2 ]; then
    echo -e "${GREEN}✅ APPROVED FOR MERGE${NC}"
    echo ""
    echo "All critical tests passed. Non-critical failures are within acceptable range."
    EXIT_CODE=0
elif [ "$CRITICAL_PASSED" = true ]; then
    echo -e "${YELLOW}⚠️  CONDITIONAL APPROVAL${NC}"
    echo ""
    echo "Critical tests passed but several non-critical tests failed."
    echo "Review failures before merging."
    EXIT_CODE=0
else
    echo -e "${RED}❌ BLOCKED - DO NOT MERGE${NC}"
    echo ""
    echo "Critical tests failed. The build is not stable."
    echo "Fix critical issues before proceeding."
    EXIT_CODE=1
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Version information
echo -e "${BOLD}Test Environment:${NC}"
echo "  Node Version: $(node -v)"
echo "  NPM Version: $(npm -v)"
echo "  Branch: $(git branch --show-current)"
echo "  Commit: $(git rev-parse --short HEAD)"
echo ""

exit $EXIT_CODE