# Testing Framework for v1.8.0

**Philosophy:** Build slowly and carefully, testing at every turn. Quality over speed.

**Status:** In Progress
**Branch:** `feature/v1.8.0-notion-api-prep`
**Date:** 2025-09-30

---

## Testing Principles

1. **No merge without passing tests**
2. **Test every change before committing**
3. **Document all test results**
4. **Maintain test evidence**
5. **Quality over completion speed**

---

## Testing Phases

### Phase 1: Current State Assessment ✅
**Status:** COMPLETE

**What we know:**
- ✅ Modules load without errors
- ✅ Dependencies installed correctly
- ❌ No integration tests run
- ❌ No real API calls tested
- ❌ Version sync incomplete

---

### Phase 2: Pre-Fix Testing (Establish Baseline)

**Goal:** Document current working state before making any fixes

#### Test 2.1: Version Inventory
**Status:** PENDING

```bash
# Check all version numbers
npm run check-versions

# Expected output: Document current state
# - local-app/package.json: ?
# - greasemonkey scripts: ?
# - Any mismatches?
```

**Test Results:**
```
[ ] Executed
[ ] Results documented
[ ] Mismatches identified
```

#### Test 2.2: Module Loading (Re-verify)
**Status:** PENDING

```bash
# Verify all modules load
cd local-app
node -e "const NC = require('./src/notion-client.js'); console.log('✅ NotionClient loaded');"
node -e "const CM = require('./src/config/ConfigManager.js'); console.log('✅ ConfigManager loaded');"
```

**Test Results:**
```
[ ] NotionClient loads: PASS/FAIL
[ ] ConfigManager loads: PASS/FAIL
[ ] Errors encountered: None/List
```

#### Test 2.3: SDK Version Verification
**Status:** PENDING

```bash
# Check installed SDK version
npm list @notionhq/client
```

**Expected:** `@notionhq/client@5.1.0`

**Test Results:**
```
[ ] Executed
[ ] Version matches: YES/NO
[ ] Actual version: ________
```

---

### Phase 3: Integration Testing (No Real API Calls Yet)

**Goal:** Test new code paths without hitting Notion API

#### Test 3.1: Data Source ID Detection (Mocked)
**Status:** PENDING

**Create test file:** `local-app/tests/test-data-source-mock.js`

```javascript
// Mock test - no real API calls
const NotionClient = require('../src/notion-client.js');

// Mock config
const mockConfig = {
    notion: {
        apiKey: 'secret_mock_key_for_testing',
        databaseId: 'mock-database-id-12345',
        dataSourceId: null,
        apiVersion: undefined
    }
};

console.log('Testing NotionClient with mock config...\n');

// Test 1: Constructor with no dataSourceId
console.log('Test 1: Constructor without dataSourceId');
try {
    const client = new NotionClient(mockConfig);
    console.log('✅ Client created');
    console.log('   - dataSourceId:', client.dataSourceId);
    console.log('   - apiVersion:', client.apiVersion);
    console.log('   - Warning shown: (check console output above)');
} catch (error) {
    console.log('❌ Error:', error.message);
}

// Test 2: Constructor with dataSourceId
console.log('\nTest 2: Constructor with dataSourceId');
try {
    const configWithDS = {
        ...mockConfig,
        notion: {
            ...mockConfig.notion,
            dataSourceId: 'mock-data-source-id-67890'
        }
    };
    const client = new NotionClient(configWithDS);
    console.log('✅ Client created');
    console.log('   - dataSourceId:', client.dataSourceId);
    console.log('   - No warning expected');
} catch (error) {
    console.log('❌ Error:', error.message);
}

// Test 3: Constructor with API version
console.log('\nTest 3: Constructor with apiVersion');
try {
    const configWithVersion = {
        ...mockConfig,
        notion: {
            ...mockConfig.notion,
            apiVersion: '2025-09-03'
        }
    };
    const client = new NotionClient(configWithVersion);
    console.log('✅ Client created');
    console.log('   - apiVersion:', client.apiVersion);
} catch (error) {
    console.log('❌ Error:', error.message);
}

console.log('\n✅ All mock tests completed');
```

**Test Results:**
```
[ ] Test created
[ ] Test executed
[ ] Test 1: PASS/FAIL
[ ] Test 2: PASS/FAIL
[ ] Test 3: PASS/FAIL
[ ] Warnings appear as expected: YES/NO
[ ] No crashes: YES/NO
```

#### Test 3.2: Config Manager Environment Variables
**Status:** PENDING

**Create test file:** `local-app/tests/test-config-env.js`

```javascript
// Test ConfigManager with environment variables
console.log('Testing ConfigManager environment variable support...\n');

// Set test environment variables
process.env.NOTION_DATA_SOURCE_ID = 'test-data-source-from-env';
process.env.NOTION_API_VERSION = '2025-09-03';

// Create minimal config.json for testing
const fs = require('fs');
const path = require('path');

const testConfig = {
    notion: {
        apiKey: 'test-key',
        databaseId: 'test-db'
    },
    dropbox: {
        localPath: '~/test'
    },
    server: {
        port: 8765,
        host: 'localhost'
    }
};

const configPath = path.join(__dirname, '..', 'config-test.json');
fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2));

try {
    // Load ConfigManager (will fail if config.json doesn't exist)
    // We'll need to temporarily copy config.json or adjust the test
    console.log('⚠️  This test requires manual verification');
    console.log('   Check that ConfigManager loads env vars correctly');

    // Clean up
    fs.unlinkSync(configPath);

} catch (error) {
    console.log('❌ Error:', error.message);
}
```

**Test Results:**
```
[ ] Test created
[ ] Environment variables loaded: YES/NO
[ ] Config overrides work: YES/NO
[ ] No crashes: YES/NO
```

---

### Phase 4: Real API Testing (With User's Permission)

**IMPORTANT:** These tests will make actual API calls to Notion. Only run with:
- Valid Notion API credentials configured
- User's explicit permission
- Test database that can be modified

#### Test 4.1: Connection Test with Old SDK Pattern
**Status:** PENDING

**Pre-requisites:**
- [ ] Valid config.json with real credentials
- [ ] User permission to make API calls
- [ ] Test database configured

**Create test file:** `local-app/tests/test-notion-connection.js`

```javascript
#!/usr/bin/env node
/**
 * Test Notion API connection with SDK v5.1.0
 * Uses OLD API patterns (database_id) to verify backward compatibility
 */

const ConfigManager = require('../src/config/ConfigManager');
const NotionClient = require('../src/notion-client');

async function testNotionConnection() {
    console.log('🧪 Testing Notion API Connection with SDK v5.1.0\n');
    console.log('⚠️  This will make REAL API calls to your Notion workspace\n');

    try {
        // Load config
        console.log('Step 1: Loading configuration...');
        const configManager = new ConfigManager();
        const config = configManager.config;
        console.log('✅ Configuration loaded\n');

        // Create Notion client
        console.log('Step 2: Creating Notion client...');
        const notion = new NotionClient(config);

        if (!notion.isConfigured()) {
            throw new Error('Notion client not properly configured');
        }
        console.log('✅ Notion client created\n');

        // Test connection
        console.log('Step 3: Testing API connection...');
        const connectionResult = await notion.testConnection();
        console.log('✅ Connection successful!');
        console.log('   User:', connectionResult.user.name || connectionResult.user.id);
        console.log('   Database:', connectionResult.database.title);
        console.log('   Properties:', connectionResult.database.properties.length, 'properties');
        console.log();

        // Test data source fetching (new feature)
        console.log('Step 4: Testing data source ID fetching...');
        const dataSourceId = await notion.fetchDataSourceId();
        console.log('✅ Data source ID retrieved:', dataSourceId);
        console.log();

        // Success summary
        console.log('═══════════════════════════════════════════');
        console.log('✅ ALL TESTS PASSED');
        console.log('═══════════════════════════════════════════');
        console.log('SDK v5.1.0 is working correctly with old API patterns');
        console.log('Backward compatibility: CONFIRMED');
        console.log('New features: WORKING');

    } catch (error) {
        console.error('═══════════════════════════════════════════');
        console.error('❌ TEST FAILED');
        console.error('═══════════════════════════════════════════');
        console.error('Error:', error.message);
        console.error('\nStack trace:', error.stack);
        process.exit(1);
    }
}

// Run tests
testNotionConnection().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
```

**Test Results:**
```
[ ] User permission granted
[ ] Test executed
[ ] Connection successful: YES/NO
[ ] Data source ID retrieved: YES/NO
[ ] Errors encountered: None/List
[ ] SDK v5.1.0 backward compatible: YES/NO
```

#### Test 4.2: Page Creation Test (Optional)
**Status:** PENDING

**WARNING:** Creates a real page in your Notion database

**Create test file:** `local-app/tests/test-page-creation.js`

```javascript
#!/usr/bin/env node
/**
 * Test page creation with SDK v5.1.0
 * WARNING: Creates a real test page in your database
 */

const ConfigManager = require('../src/config/ConfigManager');
const NotionClient = require('../src/notion-client');

async function testPageCreation() {
    console.log('🧪 Testing Page Creation with SDK v5.1.0\n');
    console.log('⚠️  WARNING: This will create a TEST PAGE in your Notion database\n');

    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Ask for confirmation
    await new Promise((resolve) => {
        rl.question('Continue? (yes/no): ', (answer) => {
            rl.close();
            if (answer.toLowerCase() !== 'yes') {
                console.log('Test cancelled');
                process.exit(0);
            }
            resolve();
        });
    });

    try {
        // Load config and create client
        const configManager = new ConfigManager();
        const notion = new NotionClient(configManager.config);

        // Create test page
        console.log('\nCreating test page...');
        const result = await notion.createTestPage();

        console.log('✅ Test page created successfully!');
        console.log('   Page ID:', result.id);
        console.log('   Page URL:', result.url);
        console.log('\nPlease verify the page was created correctly in Notion');
        console.log('Then manually delete it if desired');

    } catch (error) {
        console.error('❌ Page creation failed:', error.message);
        process.exit(1);
    }
}

testPageCreation();
```

**Test Results:**
```
[ ] User permission granted
[ ] Test executed
[ ] Page created successfully: YES/NO
[ ] Page visible in Notion: YES/NO
[ ] Old API patterns work: YES/NO
[ ] No errors: YES/NO
```

---

### Phase 5: Fix Implementation & Testing

**Goal:** Fix identified issues one at a time, testing after each fix

#### Fix 5.1: Greasemonkey Version Sync
**Status:** PENDING

**Steps:**
1. Identify current production greasemonkey script
2. Update @version header to 1.8.0
3. Update filename to match version
4. Update SCRIPT_VERSION constant
5. Run `npm run check-versions`
6. Test: Verify version sync
7. Commit fix

**Test Results:**
```
[ ] Current script identified
[ ] Version updated
[ ] Filename updated
[ ] Constant updated
[ ] check-versions passes: YES/NO
[ ] Committed
```

#### Fix 5.2: Create Integration Test Script
**Status:** PENDING

**Steps:**
1. Create `local-app/scripts/test-integration.sh`
2. Include all integration tests
3. Add to package.json as `npm run test:integration`
4. Run and verify all tests pass
5. Document results
6. Commit

**Test Results:**
```
[ ] Script created
[ ] All tests pass: YES/NO
[ ] Added to package.json
[ ] Documentation updated
[ ] Committed
```

---

### Phase 6: Final QA Before Merge

**Goal:** Comprehensive validation before merging to main

#### QA 6.1: Version Synchronization
```bash
npm run check-versions
```

**Checklist:**
- [ ] package.json: v1.8.0
- [ ] greasemonkey script: v1.8.0
- [ ] CHANGELOG: v1.8.0 entry exists
- [ ] All versions match

#### QA 6.2: All Tests Pass
```bash
npm test
npm run test:integration
```

**Checklist:**
- [ ] Unit tests: PASS
- [ ] Integration tests: PASS
- [ ] No warnings or errors

#### QA 6.3: Documentation Review
**Checklist:**
- [ ] CHANGELOG accurate
- [ ] Release notes complete
- [ ] Migration plan current
- [ ] README updated if needed

#### QA 6.4: Manual Testing
**Checklist:**
- [ ] Server starts without errors
- [ ] Configuration loads correctly
- [ ] Warnings appear as expected
- [ ] Migration script works

#### QA 6.5: Code Review
**Checklist:**
- [ ] No debug code left in
- [ ] Comments are clear
- [ ] No TODOs without tickets
- [ ] Error handling appropriate

---

## Test Results Log

### Test Execution History

```
Date: ____________
Tester: ____________
Branch: ____________

Phase 2: Pre-Fix Testing
[ ] Test 2.1: Version Inventory - PASS/FAIL
[ ] Test 2.2: Module Loading - PASS/FAIL
[ ] Test 2.3: SDK Version - PASS/FAIL

Phase 3: Integration Testing
[ ] Test 3.1: Mock Data Source - PASS/FAIL
[ ] Test 3.2: Config Env Vars - PASS/FAIL

Phase 4: Real API Testing
[ ] Test 4.1: Connection - PASS/FAIL
[ ] Test 4.2: Page Creation - PASS/FAIL (optional)

Phase 5: Fix Testing
[ ] Fix 5.1: Version Sync - PASS/FAIL
[ ] Fix 5.2: Integration Tests - PASS/FAIL

Phase 6: Final QA
[ ] QA 6.1: Versions - PASS/FAIL
[ ] QA 6.2: All Tests - PASS/FAIL
[ ] QA 6.3: Documentation - PASS/FAIL
[ ] QA 6.4: Manual Testing - PASS/FAIL
[ ] QA 6.5: Code Review - PASS/FAIL

Overall Status: READY FOR MERGE / NOT READY

Notes:
____________________________________________
____________________________________________
____________________________________________
```

---

## Success Criteria for Merge

ALL of the following must be TRUE:

- ✅ All automated tests pass
- ✅ Version synchronization complete
- ✅ Real API calls tested and working
- ✅ Backward compatibility verified
- ✅ Documentation accurate and complete
- ✅ No known bugs or issues
- ✅ Code review completed
- ✅ Manual testing completed

**If ANY criterion fails, DO NOT MERGE.**

---

## Next Steps

1. **START HERE:** Run Phase 2 tests (baseline)
2. Document all results
3. Create test files for Phase 3
4. Get user permission for Phase 4
5. Proceed slowly, test everything
6. Fix issues one at a time
7. Re-test after each fix
8. Final QA before merge

---

**Testing Status:** READY TO BEGIN
**Estimated Time:** 4-6 hours for complete testing
**Priority:** Quality over speed
