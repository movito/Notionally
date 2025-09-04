#!/usr/bin/env node

/**
 * Telemetry Analyzer for Comment Detection Debugging
 * Analyzes why comments aren't being detected
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const investigationDir = path.join(__dirname, '../../investigation-data');

function analyzeTelemetry() {
    console.log(chalk.cyan.bold('\n🔍 LinkedIn Comment Detection Telemetry Analysis'));
    console.log(chalk.gray('='.repeat(60)));
    
    if (!fs.existsSync(investigationDir)) {
        console.log(chalk.yellow('No investigation data found.'));
        return;
    }
    
    const files = fs.readdirSync(investigationDir)
        .filter(f => f.startsWith('comments-') && f.endsWith('.json'))
        .sort()
        .reverse() // Most recent first
        .slice(0, 5); // Analyze last 5 sessions
    
    if (files.length === 0) {
        console.log(chalk.yellow('No telemetry files found.'));
        return;
    }
    
    // Aggregate findings across all files
    const findings = {
        classNamesFound: new Map(),
        selectorsWorking: new Map(),
        potentialContainers: new Map(),
        lazyLoadingPatterns: new Map(),
        domStructures: [],
        noCommentsReasons: []
    };
    
    files.forEach(filename => {
        const filepath = path.join(investigationDir, filename);
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        
        if (data.raw?.posts) {
            data.raw.posts.forEach(post => {
                analyzePost(post, findings);
            });
        }
    });
    
    // Display analysis results
    displayResults(findings);
    
    // Generate recommendations
    generateRecommendations(findings);
}

function analyzePost(post, findings) {
    // Analyze why comments might not be detected
    if (post.commentSearch) {
        // Track class names found
        if (post.commentSearch.byClassName) {
            post.commentSearch.byClassName.forEach(item => {
                const key = `${item.tagName}.${item.className}`;
                findings.classNamesFound.set(key, (findings.classNamesFound.get(key) || 0) + 1);
            });
        }
        
        // Track potential containers
        if (post.commentSearch.potentialContainers) {
            post.commentSearch.potentialContainers.forEach(container => {
                const key = container.selector;
                if (!findings.potentialContainers.has(key)) {
                    findings.potentialContainers.set(key, {
                        count: 0,
                        examples: []
                    });
                }
                const data = findings.potentialContainers.get(key);
                data.count++;
                if (data.examples.length < 3) {
                    data.examples.push(container.textSnippet?.substring(0, 50));
                }
            });
        }
        
        // Analyze lazy loading
        if (post.lazyLoading) {
            if (post.lazyLoading.buttons) {
                post.lazyLoading.buttons.forEach(button => {
                    const key = button.text || button.ariaLabel || 'unknown';
                    findings.lazyLoadingPatterns.set(key, (findings.lazyLoadingPatterns.get(key) || 0) + 1);
                });
            }
        }
        
        // Check if NO comments were found at all
        const hasAnyCommentElements = 
            (post.commentSearch.byClassName?.length > 0) ||
            (post.commentSearch.byAttribute?.length > 0) ||
            (post.commentSearch.byAriaLabel?.length > 0);
        
        if (!hasAnyCommentElements) {
            findings.noCommentsReasons.push({
                postIndex: post.index,
                hasLazyLoading: post.lazyLoading?.hasShowMoreButton,
                totalElements: post.metrics?.totalElements,
                reason: determineNoCommentsReason(post)
            });
        }
    }
    
    // Analyze DOM structure
    if (post.domSnapshot) {
        findings.domStructures.push(analyzeDOMStructure(post.domSnapshot));
    }
    
    // Track working selectors
    if (post.selectors) {
        Object.entries(post.selectors).forEach(([selector, data]) => {
            if (data.count > 0) {
                findings.selectorsWorking.set(selector, (findings.selectorsWorking.get(selector) || 0) + 1);
            }
        });
    }
}

function determineNoCommentsReason(post) {
    if (post.lazyLoading?.hasShowMoreButton) {
        return 'Comments likely behind "Show more" button';
    }
    if (post.metrics?.totalElements < 100) {
        return 'Post has very few elements - might be collapsed';
    }
    if (post.lazyLoading?.hasLoadingSpinner) {
        return 'Comments still loading';
    }
    return 'Comments not present or using unknown structure';
}

function analyzeDOMStructure(snapshot, depth = 0, path = '') {
    const structure = {
        path: path || snapshot.tagName,
        hasCommentClass: snapshot.className?.includes('comment'),
        childrenWithComment: 0
    };
    
    if (snapshot.children) {
        snapshot.children.forEach((child, index) => {
            if (child.className?.includes('comment') || 
                child.attributes?.['aria-label']?.includes('comment')) {
                structure.childrenWithComment++;
            }
        });
    }
    
    return structure;
}

function displayResults(findings) {
    console.log(chalk.white.bold('\n📊 Detection Analysis:'));
    console.log(chalk.gray('-'.repeat(40)));
    
    // Show why comments weren't found
    if (findings.noCommentsReasons.length > 0) {
        console.log(chalk.red.bold('\n❌ Posts where NO comments were detected:'));
        const reasons = {};
        findings.noCommentsReasons.forEach(item => {
            reasons[item.reason] = (reasons[item.reason] || 0) + 1;
        });
        Object.entries(reasons).forEach(([reason, count]) => {
            console.log(`  ${chalk.yellow(count)} posts: ${reason}`);
        });
    }
    
    // Show class names found
    if (findings.classNamesFound.size > 0) {
        console.log(chalk.green.bold('\n✅ Comment-related classes found:'));
        const sorted = Array.from(findings.classNamesFound.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        sorted.forEach(([className, count]) => {
            console.log(`  ${chalk.cyan(className)}`);
            console.log(`    Found ${count} times`);
        });
    }
    
    // Show potential containers
    if (findings.potentialContainers.size > 0) {
        console.log(chalk.yellow.bold('\n🎯 Potential comment containers:'));
        findings.potentialContainers.forEach((data, selector) => {
            console.log(`  ${chalk.cyan(selector)}`);
            console.log(`    Found ${data.count} times`);
            if (data.examples.length > 0) {
                console.log(`    Example text: "${data.examples[0]}..."`);
            }
        });
    }
    
    // Show lazy loading patterns
    if (findings.lazyLoadingPatterns.size > 0) {
        console.log(chalk.blue.bold('\n⏳ Lazy loading indicators:'));
        findings.lazyLoadingPatterns.forEach((count, pattern) => {
            console.log(`  "${chalk.cyan(pattern)}" - ${count} occurrences`);
        });
    }
    
    // Show working selectors
    if (findings.selectorsWorking.size > 0) {
        console.log(chalk.green.bold('\n✓ Selectors that found elements:'));
        const sorted = Array.from(findings.selectorsWorking.entries())
            .sort((a, b) => b[1] - a[1]);
        
        sorted.forEach(([selector, count]) => {
            console.log(`  ${chalk.cyan(selector)} - ${count} posts`);
        });
    }
}

function generateRecommendations(findings) {
    console.log(chalk.magenta.bold('\n💡 Recommendations:'));
    console.log(chalk.gray('-'.repeat(40)));
    
    const recommendations = [];
    
    // Check if lazy loading is the main issue
    if (findings.lazyLoadingPatterns.size > 0) {
        recommendations.push({
            priority: 'HIGH',
            issue: 'Comments are lazy-loaded',
            solution: 'Need to click "Show more" or wait for comments to load before extraction'
        });
    }
    
    // Check if selectors are wrong
    if (findings.selectorsWorking.size === 0 && findings.classNamesFound.size > 0) {
        recommendations.push({
            priority: 'HIGH',
            issue: 'Current selectors not matching LinkedIn DOM',
            solution: 'Update selectors based on classNamesFound data'
        });
    }
    
    // Check if comments are in unexpected containers
    if (findings.potentialContainers.size > 0) {
        const topContainer = Array.from(findings.potentialContainers.entries())[0];
        recommendations.push({
            priority: 'MEDIUM',
            issue: 'Comments might be in different container',
            solution: `Try selector: "${topContainer[0]}"`
        });
    }
    
    // Check if it's a timing issue
    if (findings.noCommentsReasons.filter(r => r.reason.includes('loading')).length > 0) {
        recommendations.push({
            priority: 'MEDIUM',
            issue: 'Comments not loaded when script runs',
            solution: 'Add MutationObserver or setTimeout to wait for comments'
        });
    }
    
    recommendations.forEach(rec => {
        const icon = rec.priority === 'HIGH' ? '🔴' : '🟡';
        console.log(`\n${icon} ${chalk.bold(rec.issue)}`);
        console.log(`   Solution: ${chalk.green(rec.solution)}`);
    });
    
    // Generate code snippet
    console.log(chalk.cyan.bold('\n📝 Suggested Code Update:'));
    console.log(chalk.gray('-'.repeat(40)));
    
    generateCodeSnippet(findings);
}

function generateCodeSnippet(findings) {
    // Find most common selectors
    const classNames = Array.from(findings.classNamesFound.keys());
    const commonClasses = classNames.filter(c => c.includes('comment')).slice(0, 3);
    
    const snippet = `
// Updated selectors based on telemetry
const commentSelectors = [
${commonClasses.map(c => `    '${c.split('.')[1]}'`).join(',\n')}
];

// Check for lazy loading first
const showMoreButton = postElement.querySelector('[aria-label*="show more" i], button:has-text("more")');
if (showMoreButton) {
    showMoreButton.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
}

// Then look for comments
const comments = postElement.querySelectorAll(commentSelectors.join(', '));
`;
    
    console.log(chalk.green(snippet));
    
    // Save detailed report
    const reportPath = path.join(investigationDir, 'telemetry-analysis.json');
    const report = {
        timestamp: new Date().toISOString(),
        findings: {
            classNamesFound: Array.from(findings.classNamesFound.entries()),
            selectorsWorking: Array.from(findings.selectorsWorking.entries()),
            potentialContainers: Array.from(findings.potentialContainers.entries()),
            lazyLoadingPatterns: Array.from(findings.lazyLoadingPatterns.entries()),
            noCommentsReasons: findings.noCommentsReasons
        },
        recommendations
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(chalk.gray(`\nDetailed report saved to: ${reportPath}`));
}

// Run analyzer
analyzeTelemetry();