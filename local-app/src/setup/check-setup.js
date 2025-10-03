/**
 * Setup Detection for notionally
 * Checks if configuration exists before starting server
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

const configPath = path.join(__dirname, '..', '..', 'config.json');

/**
 * Check if valid configuration exists
 */
function hasValidConfig() {
  try {
    if (!fs.existsSync(configPath)) {
      return false;
    }
    
    const config = fs.readJsonSync(configPath);
    
    // Check required fields
    const hasNotion = config.notion?.apiKey && config.notion?.databaseId;
    const hasDropbox = config.dropbox?.localPath || config.dropbox?.accessToken;
    const hasServer = config.server?.port;
    
    return hasNotion && hasDropbox && hasServer;
  } catch (err) {
    return false;
  }
}

/**
 * Check if this is the first run
 */
function isFirstRun() {
  // Check for various indicators of first run
  const noConfig = !fs.existsSync(configPath);
  const noNodeModules = !fs.existsSync(path.join(__dirname, '..', '..', 'node_modules'));
  
  return noConfig;
}

/**
 * Check if setup should be skipped
 */
function shouldSkipSetup() {
  return process.env.SKIP_SETUP === 'true' || 
         process.argv.includes('--skip-setup');
}

/**
 * Export check function for server.js
 */
async function checkAndRunSetup() {
  // Skip if explicitly requested
  if (shouldSkipSetup()) {
    console.log(chalk.yellow('⚠️  Skipping setup check (SKIP_SETUP=true)'));
    return true;
  }
  
  // Check if config exists and is valid
  if (hasValidConfig()) {
    return true; // Config exists, proceed normally
  }
  
  // No valid config, need setup
  console.log(chalk.yellow('\n⚠️  No configuration found!\n'));
  console.log(chalk.cyan('Starting interactive setup wizard...\n'));
  
  // Run interactive setup
  const { runSetup } = require('./interactive-setup');
  await runSetup();
  
  // After setup, check again
  if (hasValidConfig()) {
    console.log(chalk.green('\n✅ Configuration created successfully!'));
    console.log(chalk.cyan('Starting server...\n'));
    return true;
  } else {
    console.log(chalk.red('\n❌ Setup did not complete successfully.'));
    console.log(chalk.yellow('Run `npm run setup` to try again.\n'));
    return false;
  }
}

module.exports = {
  hasValidConfig,
  isFirstRun,
  shouldSkipSetup,
  checkAndRunSetup
};