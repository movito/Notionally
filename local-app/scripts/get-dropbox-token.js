#!/usr/bin/env node

/**
 * Helper script to get Dropbox refresh token
 * Run with: node scripts/get-dropbox-token.js
 */

const readline = require('readline');
const https = require('https');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n🔐 Dropbox OAuth Token Generator\n');
console.log('This script will help you get a refresh token for Dropbox API access.\n');

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function getRefreshToken() {
    try {
        // Ask if using custom app
        const useCustom = await question('Are you using your own Dropbox app? (y/n): ');
        
        let clientId, clientSecret;
        
        if (useCustom.toLowerCase() === 'y') {
            clientId = await question('Enter your App Key (client_id): ');
            clientSecret = await question('Enter your App Secret: ');
        } else {
            clientId = 'lxx59je81bsuya4';
            console.log('\n⚠️  Note: You\'ll need the app secret for the default Notionally app.');
            console.log('Contact the maintainer or create your own Dropbox app.\n');
            clientSecret = await question('Enter the App Secret: ');
        }
        
        // Generate authorization URL
        const authUrl = `https://www.dropbox.com/oauth2/authorize?client_id=${clientId}&response_type=code&token_access_type=offline`;
        
        console.log('\n📋 Step 1: Authorize the app\n');
        console.log('Open this URL in your browser:');
        console.log(`\n${authUrl}\n`);
        
        const authCode = await question('Enter the authorization code from Dropbox: ');
        
        console.log('\n🔄 Step 2: Exchanging code for refresh token...\n');
        
        // Exchange auth code for refresh token
        const tokenData = `code=${authCode}&grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}`;
        
        const options = {
            hostname: 'api.dropbox.com',
            path: '/oauth2/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': tokenData.length
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    
                    if (response.refresh_token) {
                        console.log('✅ Success! Here\'s your configuration:\n');
                        console.log('Add this to your config.json:');
                        console.log('\n```json');
                        console.log('"dropbox": {');
                        console.log('  "localPath": "~/Dropbox (Personal)/LinkedIn_Videos",');
                        console.log(`  "refreshToken": "${response.refresh_token}",`);
                        if (useCustom.toLowerCase() === 'y') {
                            console.log(`  "appKey": "${clientId}",`);
                        }
                        console.log(`  "appSecret": "${clientSecret}"`);
                        console.log('}');
                        console.log('```\n');
                        
                        if (response.access_token) {
                            console.log('📝 Note: You also received an access token, but the refresh token is what you need for long-term access.\n');
                        }
                    } else if (response.error) {
                        console.error('❌ Error from Dropbox:', response.error_description || response.error);
                        if (response.error === 'invalid_grant') {
                            console.log('\n💡 Tip: The authorization code can only be used once and expires quickly.');
                            console.log('Please start over and use the code immediately after authorization.');
                        }
                    } else {
                        console.error('❌ Unexpected response:', data);
                    }
                } catch (e) {
                    console.error('❌ Failed to parse response:', e.message);
                    console.error('Response:', data);
                }
                
                rl.close();
            });
        });
        
        req.on('error', (e) => {
            console.error('❌ Request failed:', e.message);
            rl.close();
        });
        
        req.write(tokenData);
        req.end();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        rl.close();
    }
}

getRefreshToken();