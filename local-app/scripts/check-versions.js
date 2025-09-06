#!/usr/bin/env node

/**
 * Version Checker Script
 * Ensures version consistency across all project files
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Files that must have matching versions
const VERSION_FILES = {
    package: {
        path: path.join(__dirname, '../package.json'),
        extract: (content) => JSON.parse(content).version,
        name: 'package.json'
    },
    greasemonkey: {
        path: (() => {
            // Find the main script file (with version number)
            const scriptDir = path.join(__dirname, '../../greasemonkey-script');
            const fs = require('fs');
            const files = fs.readdirSync(scriptDir);
            const mainScript = files.find(f => f.match(/^linkedin-notion-saver-v\d+\.\d+\.\d+\.user\.js$/));
            return mainScript ? path.join(scriptDir, mainScript) : null;
        })(),
        extract: (content) => {
            const match = content.match(/@version\s+(\d+\.\d+\.\d+)/);
            return match ? match[1] : null;
        },
        name: 'Greasemonkey script'
    }
};

// Check for deprecated filename patterns
const DEPRECATED_PATTERNS = [
    // Now we allow one versioned file as the main script
    /linkedin-notion-saver-v\d+\.\d+\.\d+-.*\.user\.js/ // Only variants with suffixes are deprecated
];

function checkVersions() {
    console.log(chalk.blue.bold('\n📋 Checking version consistency...\n'));
    
    const versions = {};
    let hasErrors = false;
    
    // Extract versions from each file
    for (const [key, file] of Object.entries(VERSION_FILES)) {
        try {
            if (!fs.existsSync(file.path)) {
                console.log(chalk.red(`❌ ${file.name} not found at: ${file.path}`));
                hasErrors = true;
                continue;
            }
            
            const content = fs.readFileSync(file.path, 'utf8');
            const version = file.extract(content);
            
            if (!version) {
                console.log(chalk.red(`❌ Could not extract version from ${file.name}`));
                hasErrors = true;
                continue;
            }
            
            versions[key] = version;
            console.log(chalk.gray(`   ${file.name}: ${chalk.white(version)}`));
        } catch (error) {
            console.log(chalk.red(`❌ Error reading ${file.name}: ${error.message}`));
            hasErrors = true;
        }
    }
    
    // Check if all versions match
    const uniqueVersions = [...new Set(Object.values(versions))];
    
    if (uniqueVersions.length > 1) {
        console.log(chalk.red('\n❌ Version mismatch detected!'));
        console.log(chalk.yellow('   Found versions: ' + uniqueVersions.join(', ')));
        hasErrors = true;
    } else if (uniqueVersions.length === 1) {
        console.log(chalk.green(`\n✅ All files are at version ${uniqueVersions[0]}`));
    }
    
    // Check for deprecated filenames
    console.log(chalk.blue.bold('\n📋 Checking for deprecated filenames...\n'));
    
    const scriptDir = path.join(__dirname, '../../greasemonkey-script');
    const files = fs.readdirSync(scriptDir);
    
    const deprecatedFiles = files.filter(file => 
        DEPRECATED_PATTERNS.some(pattern => pattern.test(file))
    );
    
    if (deprecatedFiles.length > 0) {
        console.log(chalk.red('❌ Found deprecated filename patterns:'));
        deprecatedFiles.forEach(file => {
            console.log(chalk.yellow(`   - ${file}`));
        });
        console.log(chalk.gray('\n   These should be renamed according to VERSIONING_STANDARDS.md'));
        hasErrors = true;
    } else {
        console.log(chalk.green('✅ No deprecated filenames found'));
    }
    
    // Final status
    console.log('\n' + chalk.blue('─'.repeat(50)));
    if (hasErrors) {
        console.log(chalk.red.bold('\n❌ Version check failed! Please fix the issues above.\n'));
        process.exit(1);
    } else {
        console.log(chalk.green.bold('\n✅ All version checks passed!\n'));
        
        // Show current version
        if (uniqueVersions.length === 1) {
            console.log(chalk.cyan(`Current project version: ${chalk.bold(uniqueVersions[0])}\n`));
        }
    }
}

// Version update helper
function updateVersion(newVersion) {
    if (!newVersion.match(/^\d+\.\d+\.\d+$/)) {
        console.log(chalk.red('❌ Invalid version format. Use semantic versioning (e.g., 1.7.0)'));
        process.exit(1);
    }
    
    console.log(chalk.blue.bold(`\n📝 Updating all files to version ${newVersion}...\n`));
    
    // Update package.json
    try {
        const packagePath = VERSION_FILES.package.path;
        const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        packageData.version = newVersion;
        fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');
        console.log(chalk.green(`✅ Updated package.json`));
    } catch (error) {
        console.log(chalk.red(`❌ Failed to update package.json: ${error.message}`));
        process.exit(1);
    }
    
    // Update Greasemonkey script
    try {
        const scriptDir = path.join(__dirname, '../../greasemonkey-script');
        const files = fs.readdirSync(scriptDir);
        const oldScript = files.find(f => f.match(/^linkedin-notion-saver-v\d+\.\d+\.\d+\.user\.js$/));
        
        if (oldScript) {
            const oldPath = path.join(scriptDir, oldScript);
            const newPath = path.join(scriptDir, `linkedin-notion-saver-v${newVersion}.user.js`);
            
            // Read and update content
            let scriptContent = fs.readFileSync(oldPath, 'utf8');
            scriptContent = scriptContent.replace(
                /@version\s+\d+\.\d+\.\d+/,
                `@version      ${newVersion}`
            );
            
            // Write to new file
            fs.writeFileSync(newPath, scriptContent);
            
            // Delete old file if different
            if (oldPath !== newPath) {
                fs.unlinkSync(oldPath);
                console.log(chalk.green(`✅ Updated Greasemonkey script and renamed to v${newVersion}`));
            } else {
                console.log(chalk.green(`✅ Updated Greasemonkey script`));
            }
        } else {
            console.log(chalk.red(`❌ Could not find Greasemonkey script`));
            process.exit(1);
        }
    } catch (error) {
        console.log(chalk.red(`❌ Failed to update Greasemonkey script: ${error.message}`));
        process.exit(1);
    }
    
    console.log(chalk.green.bold(`\n✅ All files updated to version ${newVersion}\n`));
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
    // Just check versions
    checkVersions();
} else if (args[0] === '--update' && args[1]) {
    // Update to new version
    updateVersion(args[1]);
    checkVersions();
} else {
    console.log(chalk.cyan('\nUsage:'));
    console.log('  npm run check-versions           Check version consistency');
    console.log('  npm run check-versions -- --update 1.7.1   Update all files to version 1.7.1\n');
}