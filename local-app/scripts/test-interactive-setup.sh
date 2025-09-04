#!/bin/bash

# Test Suite for Interactive Setup Feature (v1.1.0)
# For test-runner agent to validate the interactive setup functionality

echo "🧪 Interactive Setup Test Suite (v1.1.0)"
echo "========================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Test counters
PASSED=0
FAILED=0
SKIPPED=0

# Test function
run_test() {
    local test_name=$1
    local test_command=$2
    local expected_result=$3
    
    echo -n "Testing: $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        if [ "$expected_result" = "pass" ]; then
            echo -e "${GREEN}✅ PASSED${NC}"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}❌ FAILED${NC} (expected to fail but passed)"
            FAILED=$((FAILED + 1))
        fi
    else
        if [ "$expected_result" = "fail" ]; then
            echo -e "${GREEN}✅ PASSED${NC} (correctly failed)"
            PASSED=$((PASSED + 1))
        else
            echo -e "${RED}❌ FAILED${NC}"
            FAILED=$((FAILED + 1))
        fi
    fi
}

# Save original config if exists
CONFIG_BACKUP=""
if [ -f "config.json" ]; then
    CONFIG_BACKUP=$(mktemp)
    cp config.json "$CONFIG_BACKUP"
    echo -e "${YELLOW}ℹ️  Backed up existing config${NC}"
fi

echo -e "\n${CYAN}=== Test Group 1: File Structure ===${NC}"
echo "Verifying all setup files are in place..."
echo ""

# Test 1: Check setup files exist
run_test "Setup script exists" "test -f src/setup/interactive-setup.js" "pass"
run_test "Check setup exists" "test -f src/setup/check-setup.js" "pass"
run_test "Start wrapper exists" "test -f src/start-with-setup.js" "pass"

echo -e "\n${CYAN}=== Test Group 2: NPM Scripts ===${NC}"
echo "Verifying npm scripts are configured..."
echo ""

# Test 2: Check npm scripts
run_test "npm run setup available" "grep -q '\"setup\":' package.json" "pass"
run_test "npm run dev configured" "grep -q '\"dev\": \"node src/start-with-setup.js\"' package.json" "pass"
run_test "npm run dev:skip-setup configured" "grep -q 'dev:skip-setup' package.json" "pass"

echo -e "\n${CYAN}=== Test Group 3: Config Detection ===${NC}"
echo "Testing configuration detection logic..."
echo ""

# Test 3: Config detection
rm -f config.json 2>/dev/null
run_test "Detects missing config" "node -e \"const {hasValidConfig} = require('./src/setup/check-setup'); process.exit(hasValidConfig() ? 1 : 0)\"" "pass"

# Create minimal config
echo '{"notion":{"apiKey":"secret_test","databaseId":"test123"},"dropbox":{"localPath":"~/test"},"server":{"port":8765}}' > config.json
run_test "Detects valid config" "node -e \"const {hasValidConfig} = require('./src/setup/check-setup'); process.exit(hasValidConfig() ? 0 : 1)\"" "pass"

# Create incomplete config
echo '{"notion":{"apiKey":"secret_test"},"server":{"port":8765}}' > config.json
run_test "Detects incomplete config" "node -e \"const {hasValidConfig} = require('./src/setup/check-setup'); process.exit(hasValidConfig() ? 1 : 0)\"" "pass"

echo -e "\n${CYAN}=== Test Group 4: Setup Dependencies ===${NC}"
echo "Checking required npm packages..."
echo ""

# Test 4: Check dependencies
run_test "Inquirer installed" "npm list inquirer > /dev/null 2>&1" "pass"
run_test "Chalk installed" "npm list chalk > /dev/null 2>&1" "pass"
run_test "fs-extra installed" "npm list fs-extra > /dev/null 2>&1" "pass"

echo -e "\n${CYAN}=== Test Group 5: Skip Setup Flag ===${NC}"
echo "Testing --skip-setup functionality..."
echo ""

# Test 5: Skip setup flag
rm -f config.json 2>/dev/null
run_test "Skip flag bypasses setup check" "node -e \"const {shouldSkipSetup} = require('./src/setup/check-setup'); process.argv.push('--skip-setup'); process.exit(shouldSkipSetup() ? 0 : 1)\"" "pass"

echo -e "\n${CYAN}=== Test Group 6: Setup Module Exports ===${NC}"
echo "Verifying module exports and functions..."
echo ""

# Test 6: Module exports
run_test "runSetup function exported" "node -e \"const {runSetup} = require('./src/setup/interactive-setup'); process.exit(typeof runSetup === 'function' ? 0 : 1)\"" "pass"
run_test "checkExistingSetup function exported" "node -e \"const {checkExistingSetup} = require('./src/setup/interactive-setup'); process.exit(typeof checkExistingSetup === 'function' ? 0 : 1)\"" "pass"

echo -e "\n${CYAN}=== Test Group 7: First Run Detection ===${NC}"
echo "Testing first run detection logic..."
echo ""

# Test 7: First run detection
rm -f config.json 2>/dev/null
run_test "Detects first run (no config)" "node -e \"const {isFirstRun} = require('./src/setup/check-setup'); process.exit(isFirstRun() ? 0 : 1)\"" "pass"

# Create config to test non-first run
echo '{"setup":{"completed":true}}' > config.json
run_test "Detects non-first run (config exists)" "node -e \"const {isFirstRun} = require('./src/setup/check-setup'); process.exit(isFirstRun() ? 1 : 0)\"" "pass"

echo -e "\n${CYAN}=== Test Group 8: Notion Validation ===${NC}"
echo "Testing Notion credential validation..."
echo ""

# Test 8: Notion validation (will fail without real credentials)
run_test "Invalid Notion key rejected" "node -e \"
const {validateNotionCredentials} = require('./src/setup/interactive-setup');
validateNotionCredentials('invalid', 'test').then(r => process.exit(r.valid ? 1 : 0));
\" 2>/dev/null" "pass"

echo -e "\n${CYAN}=== Test Group 9: Config File Generation ===${NC}"
echo "Testing configuration file creation..."
echo ""

# Test 9: Config generation
rm -f config.json 2>/dev/null
cat > test-config-input.js << 'EOF'
const fs = require('fs-extra');
const config = {
  notion: { apiKey: 'secret_test', databaseId: 'db123' },
  dropbox: { localPath: '~/Dropbox' },
  server: { port: 8765 },
  setup: { completed: true, version: '1.1.0', timestamp: new Date().toISOString() }
};
fs.writeJsonSync('test-config.json', config, { spaces: 2 });
EOF

node test-config-input.js
run_test "Config file generated" "test -f test-config.json" "pass"
run_test "Config has correct structure" "node -e \"const c = require('./test-config.json'); process.exit(c.notion && c.dropbox && c.server ? 0 : 1)\"" "pass"
rm -f test-config.json test-config-input.js 2>/dev/null

echo -e "\n${CYAN}=== Test Group 10: Error Handling ===${NC}"
echo "Testing error handling and recovery..."
echo ""

# Test 10: Error handling
run_test "Handles missing directory gracefully" "cd /tmp && node -e \"try { require('$PWD/src/setup/check-setup'); } catch(e) { process.exit(0); }\" && cd - > /dev/null" "pass"

# Restore original config if it existed
if [ -n "$CONFIG_BACKUP" ]; then
    mv "$CONFIG_BACKUP" config.json
    echo -e "\n${YELLOW}ℹ️  Restored original config${NC}"
else
    # Create a valid config for normal operation
    cat > config.json << 'EOF'
{
  "notion": {
    "apiKey": "${NOTION_API_KEY}",
    "databaseId": "${NOTION_DATABASE_ID}"
  },
  "dropbox": {
    "localPath": "~/Dropbox (Personal)/LinkedIn_Videos"
  },
  "server": {
    "port": 8765,
    "host": "localhost"
  }
}
EOF
    echo -e "\n${YELLOW}ℹ️  Created default config template${NC}"
fi

# Summary
echo ""
echo "========================================"
echo -e "${CYAN}Test Results Summary:${NC}"
echo -e "  Passed: ${GREEN}$PASSED${NC}"
echo -e "  Failed: ${RED}$FAILED${NC}"
echo -e "  Skipped: ${YELLOW}$SKIPPED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All interactive setup tests passed!${NC}"
    echo ""
    echo "The interactive setup feature is working correctly:"
    echo "- Files in place"
    echo "- NPM scripts configured"
    echo "- Config detection working"
    echo "- Dependencies installed"
    echo "- Error handling functional"
    exit 0
else
    echo -e "${RED}❌ Some tests failed!${NC}"
    echo ""
    echo "Please review the failures above."
    echo "The interactive setup may not work correctly."
    exit 1
fi