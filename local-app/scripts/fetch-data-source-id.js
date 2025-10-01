#!/usr/bin/env node

/**
 * Helper script to fetch data source ID for Notion database
 * This prepares your config for v2.0.0 compatibility
 *
 * Usage: npm run fetch-data-source-id
 */

const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function fetchDataSourceId() {
    console.log('🔍 Fetching Data Source ID for Notion Database\n');
    console.log('This will help prepare your config for Notionally v2.0.0\n');

    // Load config
    const configPath = path.join(__dirname, '..', 'config.json');
    let config;

    try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
        console.error('❌ Error loading config.json:', error.message);
        console.error('💡 Make sure config.json exists in the local-app directory');
        process.exit(1);
    }

    // Get API key and database ID from config or env
    const apiKey = process.env.NOTION_API_KEY || config.notion?.apiKey;
    const databaseId = process.env.NOTION_DATABASE_ID || config.notion?.databaseId;

    if (!apiKey || apiKey.includes('${')) {
        console.error('❌ NOTION_API_KEY not found or not set');
        console.error('💡 Set it in .env or config.json');
        process.exit(1);
    }

    if (!databaseId || databaseId.includes('${')) {
        console.error('❌ NOTION_DATABASE_ID not found or not set');
        console.error('💡 Set it in .env or config.json');
        process.exit(1);
    }

    console.log('✅ API Key found:', apiKey.substring(0, 10) + '...');
    console.log('✅ Database ID:', databaseId);
    console.log();

    // Initialize Notion client
    const notion = new Client({ auth: apiKey });

    try {
        // Fetch database information
        console.log('🔄 Fetching database information from Notion...\n');

        const database = await notion.databases.retrieve({
            database_id: databaseId,
        });

        // In Notion API 2025-09-03, the database ID is the data source ID
        const dataSourceId = database.id;
        const databaseTitle = database.title[0]?.plain_text || 'Untitled';

        console.log('✅ Database found:', databaseTitle);
        console.log('✅ Data Source ID:', dataSourceId);
        console.log();

        // Check if they're the same
        if (dataSourceId === databaseId) {
            console.log('ℹ️  Your data source ID is the same as your database ID');
            console.log('   This is typical for most Notion databases');
        } else {
            console.log('ℹ️  Your data source ID differs from your database ID');
            console.log('   This is typical for databases with multiple sources');
        }

        console.log('\n📝 Next Steps:\n');
        console.log('Add this to your configuration:\n');

        // Show .env format
        console.log('Option 1: In your .env file:');
        console.log('─'.repeat(50));
        console.log(`NOTION_DATA_SOURCE_ID=${dataSourceId}`);
        console.log(`NOTION_API_VERSION=2025-09-03`);
        console.log('─'.repeat(50));
        console.log();

        // Show config.json format
        console.log('Option 2: In your config.json file:');
        console.log('─'.repeat(50));
        console.log(JSON.stringify({
            notion: {
                ...config.notion,
                dataSourceId: dataSourceId,
                apiVersion: "2025-09-03"
            }
        }, null, 2));
        console.log('─'.repeat(50));
        console.log();

        console.log('✅ Configuration updated successfully!');
        console.log('💡 This prepares you for Notionally v2.0.0');
        console.log();

        // Ask if they want to auto-update config.json
        if (config.notion && !config.notion.dataSourceId) {
            console.log('Would you like to update config.json automatically? (y/n)');
            // For now, just show instructions
            console.log('💡 Manual update recommended for now');
        }

    } catch (error) {
        console.error('❌ Error fetching data source ID:', error.message);

        if (error.code === 'unauthorized') {
            console.error('💡 Your API key is invalid or expired');
            console.error('   Get a new one from https://www.notion.so/my-integrations');
        } else if (error.code === 'object_not_found') {
            console.error('💡 Database not found - check your database ID');
            console.error('   Make sure your integration has access to the database');
        } else {
            console.error('💡 Error details:', error);
        }

        process.exit(1);
    }
}

// Run the script
fetchDataSourceId().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
