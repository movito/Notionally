#!/usr/bin/env node

/**
 * Entry point that checks for setup before starting server
 * This runs when user types `npm run dev`
 */

const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const { spawn } = require('child_process');

// Check if config exists
const configPath = path.join(__dirname, '..', 'config.json');

async function main() {
  // Check for --skip-setup flag
  if (process.argv.includes('--skip-setup')) {
    console.log(chalk.yellow('⚠️  Skipping setup check'));
    startServer();
    return;
  }
  
  // Check if config exists
  if (!fs.existsSync(configPath)) {
    console.log(chalk.yellow('\n📋 No configuration found!\n'));
    console.log(chalk.cyan('Welcome to Notionally! Let\'s get you set up.\n'));
    
    // Run interactive setup
    const { runSetup } = require('./setup/interactive-setup');
    
    try {
      await runSetup();
      
      // After successful setup, start the server
      console.log(chalk.cyan('\n🚀 Starting server...\n'));
      startServer();
      
    } catch (err) {
      console.log(chalk.red('\n❌ Setup was not completed.'));
      console.log(chalk.yellow('Run `npm run setup` to configure Notionally.\n'));
      process.exit(1);
    }
  } else {
    // Config exists, validate it quickly
    try {
      const config = require(configPath);
      
      if (!config.notion?.apiKey || !config.notion?.databaseId) {
        console.log(chalk.yellow('\n⚠️  Configuration is incomplete!\n'));
        console.log(chalk.cyan('Running setup to fix configuration...\n'));
        
        const { runSetup } = require('./setup/interactive-setup');
        await runSetup();
      }
      
      // Start server normally
      startServer();
      
    } catch (err) {
      console.log(chalk.red('❌ Error reading config:', err.message));
      console.log(chalk.yellow('Run `npm run setup` to reconfigure.\n'));
      process.exit(1);
    }
  }
}

function startServer() {
  // Use nodemon if available for dev, otherwise use node
  const isDevMode = process.env.NODE_ENV !== 'production';
  const nodemonPath = path.join(__dirname, '..', 'node_modules', '.bin', 'nodemon');
  const command = isDevMode && fs.existsSync(nodemonPath)
    ? nodemonPath
    : 'node';
  
  // Start the server
  const serverProcess = spawn(command, ['src/server.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env },
    shell: true
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    serverProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    serverProcess.kill('SIGTERM');
  });
  
  serverProcess.on('exit', (code) => {
    process.exit(code);
  });
}

// Run the main function
main().catch(err => {
  console.error(chalk.red('Fatal error:', err));
  process.exit(1);
});