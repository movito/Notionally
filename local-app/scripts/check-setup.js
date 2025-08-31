#!/usr/bin/env node

/**
 * Setup checker for Notionally
 * Validates configuration and environment variables
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('\n🔍 Notionally Setup Checker\n');
console.log('=' .repeat(50));

let hasErrors = false;
let hasWarnings = false;

// Check config.json
console.log('\n📄 Checking config.json...');
const configPath = path.join(__dirname, '..', 'config.json');
if (fs.existsSync(configPath)) {
    console.log('  ✅ config.json exists');
    
    try {
        const config = require(configPath);
        
        // Check Notion config
        if (config.notion?.apiKey && config.notion.apiKey !== 'YOUR_NOTION_API_KEY') {
            console.log('  ✅ Notion API key configured');
        } else if (process.env.NOTION_API_KEY) {
            console.log('  ✅ Notion API key in .env');
        } else {
            console.log('  ⚠️  Notion API key not configured');
            hasWarnings = true;
        }
        
        // Check Dropbox local path
        if (config.dropbox?.localPath) {
            console.log(`  ✅ Dropbox local path: ${config.dropbox.localPath}`);
        } else {
            console.log('  ❌ Dropbox local path not configured');
            hasErrors = true;
        }
    } catch (error) {
        console.log('  ❌ Invalid config.json:', error.message);
        hasErrors = true;
    }
} else {
    console.log('  ❌ config.json not found');
    console.log('     Run: cp config.example.json config.json');
    hasErrors = true;
}

// Check .env file
console.log('\n🔐 Checking .env file...');
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    console.log('  ✅ .env file exists');
} else {
    console.log('  ⚠️  .env file not found');
    console.log('     Run: cp .env.example .env');
    hasWarnings = true;
}

// Check environment variables
console.log('\n🔑 Checking environment variables...');

const envVars = {
    DROPBOX_APP_KEY: process.env.DROPBOX_APP_KEY,
    DROPBOX_APP_SECRET: process.env.DROPBOX_APP_SECRET,
    DROPBOX_REFRESH_TOKEN: process.env.DROPBOX_REFRESH_TOKEN,
    NOTION_API_KEY: process.env.NOTION_API_KEY
};

let dropboxConfigured = false;

// Check Dropbox configuration
if (envVars.DROPBOX_REFRESH_TOKEN) {
    console.log('  ✅ DROPBOX_REFRESH_TOKEN set');
    dropboxConfigured = true;
    
    if (!envVars.DROPBOX_APP_SECRET) {
        console.log('  ❌ DROPBOX_APP_SECRET missing (required with refresh token)');
        hasErrors = true;
    } else {
        console.log('  ✅ DROPBOX_APP_SECRET set');
    }
    
    if (envVars.DROPBOX_APP_KEY) {
        console.log('  ✅ DROPBOX_APP_KEY set');
    } else {
        console.log('  ⚠️  DROPBOX_APP_KEY not set (will use default app)');
    }
} else {
    console.log('  ⚠️  No Dropbox refresh token configured');
    console.log('     Files will save locally only');
    console.log('     To enable Dropbox API: npm run setup:dropbox');
    hasWarnings = true;
}

// Check Node version
console.log('\n🟢 Checking Node.js version...');
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split('.')[0]);
if (majorVersion >= 22) {
    console.log(`  ✅ Node.js ${nodeVersion} (requires 22+)`);
} else {
    console.log(`  ❌ Node.js ${nodeVersion} (requires 22+)`);
    hasErrors = true;
}

// Summary
console.log('\n' + '=' .repeat(50));
if (hasErrors) {
    console.log('\n❌ Setup has errors that need to be fixed');
    console.log('   Please address the issues above before running the app');
    process.exit(1);
} else if (hasWarnings) {
    console.log('\n⚠️  Setup is functional but has warnings');
    console.log('   The app will work but some features may be limited');
    console.log('\n✅ You can run: npm run dev');
} else {
    console.log('\n✅ Perfect! Your setup is complete');
    console.log('   All features are properly configured');
    console.log('\n✅ You can run: npm run dev');
}

console.log('');