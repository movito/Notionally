/**
 * Test script for URL resolution
 */

const URLResolutionService = require('./src/services/URLResolutionService');

async function testUrlResolution() {
    console.log('🧪 Testing URL Resolution Service\n');
    
    const urlResolver = new URLResolutionService();
    
    // Test URLs
    const testUrls = [
        'https://lnkd.in/test123',  // LinkedIn shortened URL
        'https://www.google.com',   // Direct URL
        'https://github.com/movito/Notionally'  // Another direct URL
    ];
    
    console.log('Testing URLs:', testUrls);
    console.log('=' .repeat(50));
    
    try {
        const results = await urlResolver.processUrls(testUrls);
        
        console.log('\n📊 Results:');
        results.forEach((result, index) => {
            console.log(`\nURL ${index + 1}:`);
            console.log('  Original:', result.original);
            console.log('  Resolved:', result.resolved);
            console.log('  Was Shortened:', result.wasShortened);
            console.log('  Was Resolved:', result.resolved !== result.original);
            if (result.method) {
                console.log('  Method:', result.method);
            }
            if (result.error) {
                console.log('  Error:', result.error);
            }
        });
        
        console.log('\n✅ Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testUrlResolution();