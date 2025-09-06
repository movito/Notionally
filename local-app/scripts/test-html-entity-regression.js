#!/usr/bin/env node

/**
 * Regression Test Suite for HTML Entity Decoding
 * 
 * Purpose: Prevent future regressions in HTML entity handling
 * Created: In response to v1.8.0 HTML entity re-encoding issue
 * 
 * This test MUST pass before any commits affecting:
 * - sanitization.js
 * - LinkedIn post processing
 * - Text content handling
 */

const { sanitizePostData, sanitizeLinkedInPostContent } = require('../src/utils/sanitization');

console.log('🛡️  HTML Entity Regression Prevention Test');
console.log('===========================================');
console.log('Testing to prevent re-introduction of HTML entity encoding bugs\n');

let failures = [];

// Critical test cases that MUST always pass
const criticalTests = [
    {
        id: 'REGRESSION-001',
        description: 'Single quotes must NOT be encoded as &#39;',
        input: { text: "Here's a test with 'quotes'", author: "Test" },
        assertion: (result) => {
            if (result.text.includes('&#39;') || result.text.includes('&#x27;')) {
                return `FAILED: Text contains HTML entity for single quote: ${result.text}`;
            }
            if (!result.text.includes("'")) {
                return `FAILED: Single quotes were removed or modified: ${result.text}`;
            }
            return null;
        }
    },
    {
        id: 'REGRESSION-002',
        description: 'Double quotes must NOT be encoded as &quot;',
        input: { text: 'He said "Hello World"', author: "Test" },
        assertion: (result) => {
            if (result.text.includes('&quot;') || result.text.includes('&#x22;')) {
                return `FAILED: Text contains HTML entity for double quote: ${result.text}`;
            }
            if (!result.text.includes('"')) {
                return `FAILED: Double quotes were removed or modified: ${result.text}`;
            }
            return null;
        }
    },
    {
        id: 'REGRESSION-003',
        description: 'Forward slashes must NOT be encoded as &#x2F;',
        input: { text: 'Visit https://example.com/path/to/page', author: "Test" },
        assertion: (result) => {
            if (result.text.includes('&#x2F;') || result.text.includes('&#47;')) {
                return `FAILED: Text contains HTML entity for forward slash: ${result.text}`;
            }
            if (!result.text.includes('/')) {
                return `FAILED: Forward slashes were removed or modified: ${result.text}`;
            }
            return null;
        }
    },
    {
        id: 'REGRESSION-004',
        description: 'Ampersands must be properly handled',
        input: { text: 'Research & Development', author: "Test" },
        assertion: (result) => {
            // Allow & or &amp; but not double-encoding like &amp;amp;
            if (result.text.includes('&amp;amp;')) {
                return `FAILED: Ampersand was double-encoded: ${result.text}`;
            }
            if (!result.text.includes('&')) {
                return `FAILED: Ampersand was completely removed: ${result.text}`;
            }
            return null;
        }
    },
    {
        id: 'REGRESSION-005',
        description: 'Complex LinkedIn post with multiple entities',
        input: { 
            text: "📢 Just out! Our position piece: Against the Uncritical Adoption of 'AI' Technologies in Academia: https://lnkd.in/eACUAnTi",
            author: "Academic Institution"
        },
        assertion: (result) => {
            const encodedEntities = ['&#39;', '&#x27;', '&quot;', '&#x22;', '&#x2F;', '&#47;'];
            for (const entity of encodedEntities) {
                if (result.text.includes(entity)) {
                    return `FAILED: Text contains HTML entity ${entity}: ${result.text}`;
                }
            }
            return null;
        }
    },
    {
        id: 'REGRESSION-006',
        description: 'Security: Script tags must still be removed',
        input: { text: "Normal text <script>alert('xss')</script> more text", author: "Test" },
        assertion: (result) => {
            if (result.text.includes('<script>') || result.text.includes('</script>')) {
                return `FAILED: Script tags were not removed: ${result.text}`;
            }
            if (result.text.includes('alert(')) {
                return `FAILED: Script content was not removed: ${result.text}`;
            }
            return null;
        }
    }
];

// Run all critical tests
console.log('Running Critical Regression Tests:\n');

criticalTests.forEach(test => {
    console.log(`[${test.id}] ${test.description}`);
    console.log(`  Input: "${test.input.text}"`);
    
    try {
        const result = sanitizePostData(test.input);
        console.log(`  Output: "${result.text}"`);
        
        const error = test.assertion(result);
        if (error) {
            console.log(`  ❌ ${error}`);
            failures.push({ id: test.id, error });
        } else {
            console.log(`  ✅ PASSED`);
        }
    } catch (err) {
        const error = `EXCEPTION: ${err.message}`;
        console.log(`  ❌ ${error}`);
        failures.push({ id: test.id, error });
    }
    console.log('');
});

// Test the new sanitizeLinkedInPostContent function specifically
console.log('Testing sanitizeLinkedInPostContent function:\n');

const linkedInContentTests = [
    {
        input: "Test with 'quotes' and \"double quotes\" and /slashes/",
        expectedToContain: ["'", '"', '/'],
        expectedNotToContain: ['&#39;', '&quot;', '&#x2F;']
    }
];

linkedInContentTests.forEach((test, index) => {
    console.log(`LinkedIn Content Test ${index + 1}:`);
    console.log(`  Input: "${test.input}"`);
    
    const result = sanitizeLinkedInPostContent(test.input);
    console.log(`  Output: "${result}"`);
    
    let passed = true;
    test.expectedToContain.forEach(char => {
        if (!result.includes(char)) {
            console.log(`  ❌ Missing expected character: ${char}`);
            passed = false;
        }
    });
    
    test.expectedNotToContain.forEach(entity => {
        if (result.includes(entity)) {
            console.log(`  ❌ Contains unwanted HTML entity: ${entity}`);
            passed = false;
        }
    });
    
    if (passed) {
        console.log(`  ✅ PASSED`);
    } else {
        failures.push({ id: `LINKEDIN-${index + 1}`, error: 'LinkedIn content test failed' });
    }
    console.log('');
});

// Summary and exit code
console.log('\n' + '='.repeat(50));
console.log('REGRESSION TEST SUMMARY');
console.log('='.repeat(50));

if (failures.length === 0) {
    console.log('✅ ALL REGRESSION TESTS PASSED');
    console.log('\nHTML entity handling is working correctly.');
    console.log('No regressions detected.');
    process.exit(0);
} else {
    console.log(`❌ ${failures.length} REGRESSION TEST(S) FAILED`);
    console.log('\n⚠️  CRITICAL: HTML entity regression detected!');
    console.log('DO NOT COMMIT these changes until fixed.\n');
    console.log('Failed tests:');
    failures.forEach(f => {
        console.log(`  - [${f.id}] ${f.error}`);
    });
    process.exit(1);
}