#!/usr/bin/env node

/**
 * Interactive Setup Wizard for Notionally
 * For technical users comfortable with CLI
 */

const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const { Client } = require('@notionhq/client');

// Check if running from correct directory
const configPath = path.join(process.cwd(), 'config.json');
const packagePath = path.join(process.cwd(), 'package.json');

// Colors for better CLI experience
const success = chalk.green;
const info = chalk.blue;
const warning = chalk.yellow;
const bold = chalk.bold;

/**
 * Check if setup has already been completed
 */
async function checkExistingSetup() {
  if (fs.existsSync(configPath)) {
    const config = await fs.readJson(configPath);
    if (config.notion?.apiKey && config.notion?.databaseId) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: warning('Config already exists. Run setup again?'),
          default: false
        }
      ]);
      
      if (!overwrite) {
        console.log(info('Setup cancelled. Run npm run dev to start the server.'));
        process.exit(0);
      }
    }
  }
}

/**
 * Display welcome message
 */
function showWelcome() {
  console.clear();
  console.log(bold.cyan(`
╔══════════════════════════════════════════╗
║                                          ║
║        Welcome to Notionally Setup       ║
║                                          ║
║    Save LinkedIn posts to Notion 🚀      ║
║                                          ║
╚══════════════════════════════════════════╝
`));
  
  console.log('This wizard will help you configure:');
  console.log('  • Notion API connection');
  console.log('  • Database integration');
  console.log('  • Dropbox folder setup');
  console.log('  • Greasemonkey script installation\n');
}

/**
 * Test Notion API connection
 */
async function validateNotionCredentials(apiKey, databaseId) {
  try {
    const notion = new Client({ auth: apiKey });
    
    // Test API key by getting user info
    await notion.users.me();
    
    // Test database access
    await notion.databases.retrieve({ database_id: databaseId });
    
    return { valid: true };
  } catch (err) {
    if (err.code === 'unauthorized') {
      return { valid: false, error: 'Invalid API key' };
    } else if (err.code === 'object_not_found') {
      return { valid: false, error: 'Database not found or not shared with integration' };
    } else {
      return { valid: false, error: err.message };
    }
  }
}

/**
 * Setup Notion configuration
 */
async function setupNotion() {
  console.log(bold('\n📝 Step 1: Notion Configuration\n'));
  
  console.log('First, create a Notion integration:');
  console.log(info('1. Open: https://www.notion.so/my-integrations'));
  console.log(info('2. Click "New Integration"'));
  console.log(info('3. Name it "Notionally" and copy the API key\n'));
  
  const notionAnswers = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: 'Paste your Notion API key:',
      mask: '*',
      validate: input => input.startsWith('secret_') || 'API key should start with "secret_"'
    },
    {
      type: 'input', 
      name: 'databaseId',
      message: 'Enter your Notion database ID (32 chars):',
      validate: input => {
        // Remove any hyphens and check length
        const cleaned = input.replace(/-/g, '');
        return cleaned.length === 32 || 'Database ID should be 32 characters';
      },
      filter: input => input.replace(/-/g, '') // Clean the ID
    }
  ]);
  
  // Validate credentials
  console.log(info('\n🔄 Validating Notion credentials...'));
  const validation = await validateNotionCredentials(notionAnswers.apiKey, notionAnswers.databaseId);
  
  if (validation.valid) {
    console.log(success('✅ Notion connection successful!\n'));
    return notionAnswers;
  } else {
    console.log(chalk.red(`❌ Validation failed: ${validation.error}`));
    
    const { retry } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'retry',
        message: 'Try again?',
        default: true
      }
    ]);
    
    if (retry) {
      return setupNotion();
    } else {
      throw new Error('Notion setup cancelled');
    }
  }
}

/**
 * Setup Dropbox configuration
 */
async function setupDropbox() {
  console.log(bold('\n📁 Step 2: Dropbox Configuration\n'));
  
  const { dropboxMode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'dropboxMode',
      message: 'Choose Dropbox setup mode:',
      choices: [
        { name: 'Simple (Local folder only)', value: 'simple' },
        { name: 'Advanced (API access for share links)', value: 'api' }
      ]
    }
  ]);
  
  let dropboxConfig = {};
  
  if (dropboxMode === 'simple') {
    // Check if Dropbox folder exists
    const defaultPath = path.join(process.env.HOME, 'Dropbox (Personal)', 'LinkedIn_Videos');
    const dropboxExists = fs.existsSync(path.dirname(defaultPath));
    
    if (!dropboxExists) {
      console.log(warning('\n⚠️  Dropbox folder not found. Make sure Dropbox desktop is installed.\n'));
    }
    
    const { localPath } = await inquirer.prompt([
      {
        type: 'input',
        name: 'localPath',
        message: 'Dropbox folder path for videos:',
        default: '~/Dropbox (Personal)/LinkedIn_Videos'
      }
    ]);
    
    dropboxConfig.localPath = localPath;
    
  } else {
    // API setup
    console.log('\nFor API access, you need a Dropbox app:');
    console.log(info('1. Go to: https://www.dropbox.com/developers/apps'));
    console.log(info('2. Create a new app (Scoped access, Full Dropbox)'));
    console.log(info('3. Generate an access token\n'));
    
    const dropboxAnswers = await inquirer.prompt([
      {
        type: 'password',
        name: 'accessToken',
        message: 'Dropbox access token:',
        mask: '*'
      },
      {
        type: 'password',
        name: 'refreshToken',
        message: 'Dropbox refresh token (optional):',
        mask: '*'
      },
      {
        type: 'input',
        name: 'appKey',
        message: 'Dropbox app key:'
      },
      {
        type: 'password',
        name: 'appSecret',
        message: 'Dropbox app secret:',
        mask: '*'
      }
    ]);
    
    dropboxConfig = {
      ...dropboxAnswers,
      localPath: '~/Dropbox (Personal)/LinkedIn_Videos'
    };
  }
  
  console.log(success('✅ Dropbox configuration saved!\n'));
  return dropboxConfig;
}

/**
 * Setup Greasemonkey script
 */
async function setupGreasemonkey() {
  console.log(bold('\n🦊 Step 3: Greasemonkey Script\n'));
  
  const scriptPath = path.join(process.cwd(), '..', 'greasemonkey-script', 'linkedin-notion-saver.user.js');
  
  console.log('To install the browser script:');
  console.log(info('1. Make sure Firefox is installed'));
  console.log(info('2. Install Greasemonkey extension'));
  console.log(info('3. The script will open in your browser\n'));
  
  const { openScript } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'openScript',
      message: 'Open the Greasemonkey script in Firefox?',
      default: true
    }
  ]);
  
  if (openScript) {
    try {
      // Try to open with Firefox specifically
      const fileUrl = `file://${scriptPath}`;
      
      if (process.platform === 'darwin') {
        execSync(`open -a Firefox "${fileUrl}"`);
      } else if (process.platform === 'linux') {
        execSync(`firefox "${fileUrl}"`);
      } else {
        execSync(`start firefox "${fileUrl}"`);
      }
      
      console.log(success('✅ Script opened in Firefox!'));
      console.log(info('Click "Install" when Greasemonkey prompts you.\n'));
    } catch (err) {
      console.log(warning('Could not open Firefox automatically.'));
      console.log(info(`Open this file manually:\n${scriptPath}\n`));
    }
  }
  
  // Wait for user confirmation
  const { installed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'installed',
      message: 'Have you installed the Greasemonkey script?',
      default: false
    }
  ]);
  
  if (!installed) {
    console.log(warning('\n⚠️  Remember to install the script later!'));
    console.log(info(`Location: ${scriptPath}\n`));
  }
  
  return { greasemonkeyInstalled: installed };
}

/**
 * Generate and save configuration
 */
async function saveConfiguration(notionConfig, dropboxConfig, greasemonkeyConfig) {
  const config = {
    notion: {
      apiKey: notionConfig.apiKey,
      databaseId: notionConfig.databaseId
    },
    dropbox: dropboxConfig,
    server: {
      port: 8765,
      host: 'localhost'
    },
    setup: {
      completed: true,
      version: '1.1.0',
      timestamp: new Date().toISOString(),
      greasemonkeyInstalled: greasemonkeyConfig.greasemonkeyInstalled
    }
  };
  
  await fs.writeJson(configPath, config, { spaces: 2 });
  console.log(success('\n✅ Configuration saved to config.json'));
}

/**
 * Show next steps
 */
function showNextSteps(greasemonkeyInstalled) {
  console.log(bold.green('\n🎉 Setup Complete!\n'));
  
  console.log('Next steps:');
  console.log(success('1. ✅ Start the server: npm run dev'));
  
  if (!greasemonkeyInstalled) {
    console.log(warning('2. ⚠️  Install the Greasemonkey script'));
  } else {
    console.log(success('2. ✅ Greasemonkey script installed'));
  }
  
  console.log(success('3. ✅ Open LinkedIn in Firefox'));
  console.log(success('4. ✅ Click "Save to Notion" on any post'));
  
  console.log(bold('\n📚 Documentation:'));
  console.log(info('  • Setup Guide: docs/setup/'));
  console.log(info('  • Troubleshooting: docs/INDEX.md'));
  console.log(info('  • Development: docs/development/'));
  
  console.log(bold('\n🚀 Run `npm run dev` to start!\n'));
}

/**
 * Main setup flow
 */
async function runSetup() {
  try {
    // Check we're in the right directory
    if (!fs.existsSync(packagePath)) {
      console.log(chalk.red('❌ Please run this from the local-app directory'));
      process.exit(1);
    }
    
    await checkExistingSetup();
    showWelcome();
    
    // Run setup steps
    const notionConfig = await setupNotion();
    const dropboxConfig = await setupDropbox();
    const greasemonkeyConfig = await setupGreasemonkey();
    
    // Save configuration
    await saveConfiguration(notionConfig, dropboxConfig, greasemonkeyConfig);
    
    // Show success
    showNextSteps(greasemonkeyConfig.greasemonkeyInstalled);
    
  } catch (err) {
    console.log(chalk.red(`\n❌ Setup failed: ${err.message}`));
    process.exit(1);
  }
}

// Export for use in server.js
module.exports = { runSetup, checkExistingSetup };

// Run if called directly
if (require.main === module) {
  runSetup();
}