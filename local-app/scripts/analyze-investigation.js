#!/usr/bin/env node

/**
 * Analysis script for comment investigation data
 * Run with: npm run analyze-investigation
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const investigationDir = path.join(__dirname, '../../investigation-data');

function analyzeInvestigationData() {
    console.log(chalk.cyan('📊 Analyzing Comment Investigation Data'));
    console.log(chalk.gray('=' .repeat(50)));
    
    // Check if investigation directory exists
    if (!fs.existsSync(investigationDir)) {
        console.log(chalk.yellow('⚠️  No investigation data found.'));
        console.log(chalk.gray('Run the investigation script in LinkedIn first.'));
        return;
    }
    
    // Get all JSON files
    const files = fs.readdirSync(investigationDir)
        .filter(f => f.endsWith('.json'))
        .sort();
    
    if (files.length === 0) {
        console.log(chalk.yellow('⚠️  No investigation files found.'));
        return;
    }
    
    console.log(chalk.green(`✅ Found ${files.length} investigation file(s)\n`));
    
    // Aggregate data from all files
    const aggregated = {
        totalPosts: 0,
        postsWithComments: 0,
        postsWithLinkPattern: 0,
        authorCommentsFound: 0,
        linksInAuthorComments: 0,
        selectors: {},
        authorPatterns: new Set(),
        linkPatterns: [],
        examplePosts: []
    };
    
    files.forEach(filename => {
        console.log(chalk.blue(`\n📄 Analyzing: ${filename}`));
        const filepath = path.join(investigationDir, filename);
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        
        if (data.raw && data.raw.posts) {
            const posts = data.raw.posts;
            aggregated.totalPosts += posts.length;
            
            posts.forEach(post => {
                // Count posts with comments
                if (post.hasComments || (post.commentAnalysis && post.commentAnalysis.hasComments)) {
                    aggregated.postsWithComments++;
                }
                
                // Count posts with "link in comments" pattern
                if (post.hasLinkInCommentsPattern || 
                    (post.commentAnalysis && post.commentAnalysis.hasLinkInCommentsPattern)) {
                    aggregated.postsWithLinkPattern++;
                }
                
                // Analyze comment data
                const commentAnalysis = post.commentAnalysis || post;
                if (commentAnalysis.commentData && Array.isArray(commentAnalysis.commentData)) {
                    const authorComments = commentAnalysis.commentData.filter(c => c.isPostAuthor);
                    
                    if (authorComments.length > 0) {
                        aggregated.authorCommentsFound++;
                        
                        // Count links in author comments
                        authorComments.forEach(comment => {
                            if (comment.links && comment.links.length > 0) {
                                aggregated.linksInAuthorComments += comment.links.length;
                                
                                // Save example for reference
                                if (aggregated.examplePosts.length < 5) {
                                    aggregated.examplePosts.push({
                                        postIndex: post.index,
                                        authorName: commentAnalysis.authorInfo?.name,
                                        commentText: comment.text.substring(0, 100),
                                        links: comment.links
                                    });
                                }
                            }
                        });
                    }
                }
                
                // Aggregate selectors
                if (commentAnalysis.selectors) {
                    Object.keys(commentAnalysis.selectors).forEach(selector => {
                        if (!aggregated.selectors[selector]) {
                            aggregated.selectors[selector] = 0;
                        }
                        aggregated.selectors[selector]++;
                    });
                }
                
                // Collect author patterns
                if (commentAnalysis.authorInfo) {
                    aggregated.authorPatterns.add(commentAnalysis.authorInfo.selector);
                }
            });
        }
        
        // Show file summary
        if (data.analysis) {
            console.log(chalk.gray(`  Posts analyzed: ${data.analysis.metadata.postCount}`));
            console.log(chalk.gray(`  With comments: ${data.analysis.metadata.postsWithComments}`));
            console.log(chalk.gray(`  With link pattern: ${data.analysis.metadata.postsWithLinkPattern}`));
        }
    });
    
    // Display aggregated results
    console.log(chalk.cyan('\n📈 Aggregated Results'));
    console.log(chalk.gray('=' .repeat(50)));
    
    console.log(chalk.white('\n📊 Statistics:'));
    console.log(`  Total posts analyzed: ${chalk.yellow(aggregated.totalPosts)}`);
    console.log(`  Posts with comments: ${chalk.yellow(aggregated.postsWithComments)} (${Math.round(aggregated.postsWithComments / aggregated.totalPosts * 100)}%)`);
    console.log(`  Posts with "link in comments" pattern: ${chalk.yellow(aggregated.postsWithLinkPattern)}`);
    console.log(`  Posts with author comments: ${chalk.yellow(aggregated.authorCommentsFound)}`);
    console.log(`  Total links in author comments: ${chalk.yellow(aggregated.linksInAuthorComments)}`);
    
    console.log(chalk.white('\n🎯 Most Common Selectors:'));
    const sortedSelectors = Object.entries(aggregated.selectors)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    sortedSelectors.forEach(([selector, count]) => {
        const percentage = Math.round(count / aggregated.totalPosts * 100);
        console.log(`  ${chalk.green(selector)}`);
        console.log(`    Found in ${count} posts (${percentage}%)`);
    });
    
    console.log(chalk.white('\n🔍 Author Selectors Found:'));
    aggregated.authorPatterns.forEach(selector => {
        console.log(`  ${chalk.green(selector)}`);
    });
    
    if (aggregated.examplePosts.length > 0) {
        console.log(chalk.white('\n📝 Example Posts with Author Links:'));
        aggregated.examplePosts.forEach((example, i) => {
            console.log(chalk.yellow(`\n  Example ${i + 1}:`));
            console.log(`    Author: ${example.authorName}`);
            console.log(`    Comment: "${example.commentText}..."`);
            console.log(`    Links found:`);
            example.links.forEach(link => {
                console.log(`      - ${chalk.blue(link.url)}`);
                if (link.fromText) {
                    console.log(`        (extracted from text)`);
                }
            });
        });
    }
    
    // Recommendations
    console.log(chalk.cyan('\n💡 Recommendations'));
    console.log(chalk.gray('=' .repeat(50)));
    
    if (sortedSelectors.length > 0) {
        const topSelector = sortedSelectors[0][0];
        console.log(chalk.green(`\n✅ Primary comment selector: "${topSelector}"`));
        console.log(`   Reliability: ${Math.round(sortedSelectors[0][1] / aggregated.totalPosts * 100)}%`);
    }
    
    if (aggregated.authorPatterns.size > 0) {
        const authorSelector = Array.from(aggregated.authorPatterns)[0];
        console.log(chalk.green(`\n✅ Primary author selector: "${authorSelector}"`));
    }
    
    if (aggregated.postsWithComments > 0) {
        const successRate = Math.round(aggregated.authorCommentsFound / aggregated.postsWithComments * 100);
        console.log(chalk.yellow(`\n📊 Author comment detection rate: ${successRate}%`));
        
        if (successRate < 50) {
            console.log(chalk.red('⚠️  Low detection rate - selectors may need improvement'));
        }
    }
    
    // Save summary
    const summaryPath = path.join(investigationDir, 'ANALYSIS_SUMMARY.md');
    const summary = `# Comment Investigation Analysis Summary

Generated: ${new Date().toISOString()}

## Statistics
- Total posts analyzed: ${aggregated.totalPosts}
- Posts with comments: ${aggregated.postsWithComments} (${Math.round(aggregated.postsWithComments / aggregated.totalPosts * 100)}%)
- Posts with "link in comments" pattern: ${aggregated.postsWithLinkPattern}
- Posts with author comments: ${aggregated.authorCommentsFound}
- Total links in author comments: ${aggregated.linksInAuthorComments}

## Recommended Selectors

### Comment Container
\`\`\`javascript
const commentSelector = '${sortedSelectors[0] ? sortedSelectors[0][0] : 'Not found'}';
\`\`\`

### Author Identification  
\`\`\`javascript
const authorSelector = '${Array.from(aggregated.authorPatterns)[0] || 'Not found'}';
\`\`\`

## Top Selectors Found
${sortedSelectors.map(([sel, count]) => `- \`${sel}\` - ${count} posts`).join('\n')}

## Next Steps
1. Implement using the recommended selectors
2. Add fallback selectors for reliability
3. Test with edge cases
4. Monitor for LinkedIn DOM changes
`;
    
    fs.writeFileSync(summaryPath, summary);
    console.log(chalk.green(`\n✅ Analysis summary saved to: ${summaryPath}`));
    
    console.log(chalk.cyan('\n🎯 Next Steps:'));
    console.log('1. Review the ANALYSIS_SUMMARY.md file');
    console.log('2. Update the Greasemonkey script with discovered selectors');
    console.log('3. Test on posts with known author comments');
    console.log('4. Iterate based on results\n');
}

// Run analysis
analyzeInvestigationData();