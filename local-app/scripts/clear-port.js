#!/usr/bin/env node

/**
 * Clear port utility for notionally
 * Automatically kills any process using the specified port
 */

const { execSync } = require('child_process');
const chalk = require('chalk');

const PORT = process.argv[2] || '8765';

function clearPort(port) {
    try {
        // Check if port is in use
        const command = process.platform === 'darwin' 
            ? `lsof -i :${port} | grep LISTEN | awk '{print $2}'`
            : `netstat -tulpn 2>/dev/null | grep :${port} | awk '{print $7}' | cut -d'/' -f1`;
        
        const result = execSync(command, { encoding: 'utf8' }).trim();
        
        if (result) {
            const pids = result.split('\n').filter(Boolean);
            
            if (pids.length > 0) {
                console.log(chalk.yellow(`⚠️  Port ${port} is in use by process(es): ${pids.join(', ')}`));
                
                pids.forEach(pid => {
                    try {
                        process.kill(pid, 'SIGTERM');
                        console.log(chalk.green(`✅ Killed process ${pid}`));
                    } catch (err) {
                        if (err.code === 'ESRCH') {
                            console.log(chalk.gray(`Process ${pid} already terminated`));
                        } else if (err.code === 'EPERM') {
                            console.log(chalk.red(`❌ Permission denied to kill process ${pid}`));
                        } else {
                            console.log(chalk.red(`❌ Failed to kill process ${pid}: ${err.message}`));
                        }
                    }
                });
                
                console.log(chalk.green(`✅ Port ${port} cleared`));
            }
        } else {
            console.log(chalk.gray(`Port ${port} is already free`));
        }
    } catch (err) {
        // Port is likely free if command fails
        console.log(chalk.gray(`Port ${port} appears to be free`));
    }
}

// Clear the port
clearPort(PORT);