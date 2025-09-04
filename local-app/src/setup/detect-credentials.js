/**
 * Smart credential detection for Notionally
 * Checks multiple sources for existing configuration
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
require('dotenv').config();

const configPath = path.join(__dirname, '..', '..', 'config.json');
const envPath = path.join(__dirname, '..', '..', '.env');

/**
 * Check if credentials exist in environment variables
 */
function hasEnvCredentials() {
  // Check for Notion API key (database ID might be in config.example.json or elsewhere)
  const hasNotionKey = process.env.NOTION_API_KEY;
  const hasNotionDb = process.env.NOTION_DATABASE_ID;
  
  if (hasNotionKey && hasNotionDb) {
    console.log(chalk.green('✅ Found complete credentials in environment variables'));
    return true;
  } else if (hasNotionKey) {
    console.log(chalk.yellow('⚠️  Found NOTION_API_KEY but missing NOTION_DATABASE_ID'));
    // Check if we can get database ID from config.example.json
    const examplePath = path.join(__dirname, '..', '..', 'config.example.json');
    if (fs.existsSync(examplePath)) {
      try {
        const example = fs.readJsonSync(examplePath);
        if (example.notion?.databaseId && example.notion.databaseId !== 'YOUR_DATABASE_ID') {
          console.log(chalk.green('✅ Found database ID in config.example.json'));
          // Set it in process.env for this session
          process.env.NOTION_DATABASE_ID = example.notion.databaseId;
          return true;
        }
      } catch (err) {
        // Ignore
      }
    }
    return false; // Has key but no database ID
  }
  
  return false;
}

/**
 * Check if .env file exists with credentials
 */
function hasEnvFile() {
  if (!fs.existsSync(envPath)) {
    return false;
  }
  
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const hasNotion = envContent.includes('NOTION_API_KEY') && 
                     envContent.includes('NOTION_DATABASE_ID');
    
    if (hasNotion) {
      console.log(chalk.green('✅ Found .env file with credentials'));
      return true;
    }
  } catch (err) {
    // .env exists but can't read it
    return false;
  }
  
  return false;
}

/**
 * Check if config.json exists and is valid
 */
function hasConfigFile() {
  if (!fs.existsSync(configPath)) {
    return false;
  }
  
  try {
    const config = fs.readJsonSync(configPath);
    const hasNotion = config.notion?.apiKey && config.notion?.databaseId;
    const hasDropbox = config.dropbox?.localPath || config.dropbox?.accessToken;
    const hasServer = config.server?.port;
    
    if (hasNotion && hasDropbox && hasServer) {
      console.log(chalk.green('✅ Found valid config.json'));
      return true;
    }
  } catch (err) {
    // config.json exists but is invalid
    return false;
  }
  
  return false;
}

/**
 * Generate config.json from environment variables
 */
async function generateConfigFromEnv() {
  console.log(chalk.cyan('📝 Generating config.json from environment variables...'));
  
  const config = {
    notion: {
      apiKey: process.env.NOTION_API_KEY || '${NOTION_API_KEY}',
      databaseId: process.env.NOTION_DATABASE_ID || '${NOTION_DATABASE_ID}'
    },
    dropbox: {
      localPath: process.env.DROPBOX_LOCAL_PATH || '~/Dropbox (Personal)/LinkedIn_Videos',
      appKey: process.env.DROPBOX_APP_KEY,
      appSecret: process.env.DROPBOX_APP_SECRET,
      refreshToken: process.env.DROPBOX_REFRESH_TOKEN,
      accessToken: process.env.DROPBOX_ACCESS_TOKEN
    },
    server: {
      port: parseInt(process.env.PORT) || 8765,
      host: process.env.HOST || 'localhost'
    },
    setup: {
      completed: true,
      source: 'environment',
      version: '1.1.0',
      timestamp: new Date().toISOString()
    }
  };
  
  // Clean up undefined values
  Object.keys(config.dropbox).forEach(key => {
    if (config.dropbox[key] === undefined) {
      delete config.dropbox[key];
    }
  });
  
  await fs.writeJson(configPath, config, { spaces: 2 });
  console.log(chalk.green('✅ Generated config.json from environment'));
  
  return true;
}

/**
 * Check if any valid credentials exist
 */
function hasAnyCredentials() {
  // Check in order of preference
  if (hasConfigFile()) {
    return { source: 'config', valid: true };
  }
  
  if (hasEnvCredentials()) {
    return { source: 'env', valid: true };
  }
  
  if (hasEnvFile()) {
    // Load the .env file if not already loaded
    require('dotenv').config();
    if (hasEnvCredentials()) {
      return { source: 'env', valid: true };
    }
  }
  
  return { source: null, valid: false };
}

/**
 * Smart setup check that respects existing credentials
 */
async function smartSetupCheck() {
  console.log(chalk.cyan('🔍 Checking for existing configuration...'));
  
  const credentials = hasAnyCredentials();
  
  if (credentials.valid) {
    if (credentials.source === 'config') {
      // Config exists, we're good
      return true;
    } else if (credentials.source === 'env') {
      // Environment variables exist, generate config
      await generateConfigFromEnv();
      return true;
    }
  }
  
  // Check for partial credentials
  if (process.env.NOTION_API_KEY && !process.env.NOTION_DATABASE_ID) {
    console.log(chalk.yellow('\n⚠️  Partial configuration detected!'));
    console.log(chalk.cyan('You have NOTION_API_KEY but missing NOTION_DATABASE_ID'));
    console.log(chalk.cyan('\nTo complete setup, add to your .env file:'));
    console.log(chalk.white('NOTION_DATABASE_ID=your_database_id_here\n'));
    console.log(chalk.yellow('Or run the setup wizard to configure it interactively.\n'));
  } else {
    // No credentials found anywhere
    console.log(chalk.yellow('\n⚠️  No configuration found in:'));
    console.log('  • config.json');
    console.log('  • Environment variables');
    console.log('  • .env file\n');
  }
  
  return false;
}

/**
 * Check if this is a true first run (no credentials anywhere)
 */
function isTrueFirstRun() {
  const credentials = hasAnyCredentials();
  return !credentials.valid;
}

module.exports = {
  hasEnvCredentials,
  hasEnvFile,
  hasConfigFile,
  hasAnyCredentials,
  generateConfigFromEnv,
  smartSetupCheck,
  isTrueFirstRun
};