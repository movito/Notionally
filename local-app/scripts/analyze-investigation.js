#!/usr/bin/env node

/**
 * Investigation Data Analyzer
 * Analyzes collected comment investigation data to find patterns
 */

const fs = require('fs');
const path = require('path');

const investigationDir = path.join(__dirname, '../../investigation-data');

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function analyzeInvestigationData() {
    console.log(`${colors.bright}${colors.blue}🔍 Notionally Investigation Data Analyzer${colors.reset}\n`);
    
    // Check if investigation directory exists
    if (!fs.existsSync(investigationDir)) {
        console.log(`${colors.yellow}No investigation data found yet.${colors.reset}`);
        console.log('Run the debug script on LinkedIn first to collect data.\n');
        return;
    }
    
    // Read all investigation files
    const files = fs.readdirSync(investigationDir)
        .filter(f => f.startsWith('comments-') && f.endsWith('.json'))
        .sort();
    
    if (files.length === 0) {
        console.log(`${colors.yellow}No investigation files found.${colors.reset}\n`);
        return;
    }
    
    console.log(`Found ${colors.green}${files.length}${colors.reset} investigation file(s)\n`);
    
    // Aggregate data from all files
    const aggregated = {
        totalPosts: 0,
        postsWithComments: 0,
        postsWithLinkPattern: 0,
        selectors: {},
        authorSelectors: {},
        linkPatterns: {
            direct: 0,
            redirect: 0,
            shortened: 0,
            textOnly: 0
        }
    };
    
    // Process each file
    files.forEach(filename => {
        const filepath = path.join(investigationDir, filename);
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        
        // Count posts
        if (data.raw?.posts) {
            aggregated.totalPosts += data.raw.posts.length;
            aggregated.postsWithComments += data.raw.posts.filter(p => p.hasComments).length;
            aggregated.postsWithLinkPattern += data.raw.posts.filter(p => p.hasLinkInCommentsPattern).length;
            
            // Aggregate selectors
            data.raw.posts.forEach(post => {
                if (post.structure?.selectors) {
                    Object.keys(post.structure.selectors).forEach(selector => {
                        aggregated.selectors[selector] = (aggregated.selectors[selector] || 0) + 1;
                    });
                }
                
                // Track author selectors
                if (post.authors?.comments) {
                    post.authors.comments.forEach(comment => {
                        if (comment.selector) {
                            aggregated.authorSelectors[comment.selector] = 
                                (aggregated.authorSelectors[comment.selector] || 0) + 1;
                        }
                    });
                }
                
                // Track link patterns
                if (post.linkPatterns) {
                    if (post.linkPatterns.directLinks?.length > 0) aggregated.linkPatterns.direct++;
                    if (post.linkPatterns.redirectLinks?.length > 0) aggregated.linkPatterns.redirect++;
                    if (post.linkPatterns.textUrls?.length > 0) aggregated.linkPatterns.textOnly++;
                    post.linkPatterns.directLinks?.forEach(link => {
                        if (link.isShortened) aggregated.linkPatterns.shortened++;
                    });
                }
            });
        }
    });
    
    // Sort selectors by frequency
    const sortedSelectors = Object.entries(aggregated.selectors)
        .sort((a, b) => b[1] - a[1]);
    
    const sortedAuthorSelectors = Object.entries(aggregated.authorSelectors)
        .sort((a, b) => b[1] - a[1]);
    
    // Display results
    console.log(`${colors.bright}📊 Summary${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`Total posts analyzed: ${colors.green}${aggregated.totalPosts}${colors.reset}`);
    console.log(`Posts with comments: ${colors.green}${aggregated.postsWithComments}${colors.reset} (${Math.round(aggregated.postsWithComments/aggregated.totalPosts*100)}%)`);
    console.log(`Posts with "link in comments" pattern: ${colors.green}${aggregated.postsWithLinkPattern}${colors.reset} (${Math.round(aggregated.postsWithLinkPattern/aggregated.totalPosts*100)}%)`);
    console.log();
    
    console.log(`${colors.bright}🎯 Top Comment Container Selectors${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    sortedSelectors.slice(0, 10).forEach(([selector, count]) => {
        const percentage = Math.round(count / aggregated.totalPosts * 100);
        console.log(`${colors.green}${count.toString().padStart(3)}${colors.reset} (${percentage.toString().padStart(3)}%) ${selector}`);
    });
    console.log();
    
    if (sortedAuthorSelectors.length > 0) {
        console.log(`${colors.bright}👤 Top Author Identification Selectors${colors.reset}`);
        console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        sortedAuthorSelectors.slice(0, 5).forEach(([selector, count]) => {
            console.log(`${colors.green}${count.toString().padStart(3)}${colors.reset} ${selector}`);
        });
        console.log();
    }
    
    console.log(`${colors.bright}🔗 Link Pattern Distribution${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`Direct external links: ${colors.green}${aggregated.linkPatterns.direct}${colors.reset}`);
    console.log(`LinkedIn redirects: ${colors.green}${aggregated.linkPatterns.redirect}${colors.reset}`);
    console.log(`Shortened (lnkd.in): ${colors.green}${aggregated.linkPatterns.shortened}${colors.reset}`);
    console.log(`Text-only URLs: ${colors.green}${aggregated.linkPatterns.textOnly}${colors.reset}`);
    console.log();
    
    // Recommendations based on data
    console.log(`${colors.bright}💡 Recommendations${colors.reset}`);
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    
    // Find most reliable selectors
    const reliableSelectors = sortedSelectors.filter(([_, count]) => count >= aggregated.totalPosts * 0.8);
    if (reliableSelectors.length > 0) {
        console.log(`${colors.green}✓${colors.reset} Most reliable comment selector (80%+ coverage):`);
        console.log(`  ${reliableSelectors[0][0]}`);
    } else {
        const bestSelector = sortedSelectors[0];
        if (bestSelector) {
            console.log(`${colors.yellow}⚠${colors.reset} Best comment selector (${Math.round(bestSelector[1]/aggregated.totalPosts*100)}% coverage):`);
            console.log(`  ${bestSelector[0]}`);
            console.log(`  Consider using multiple selectors as fallbacks`);
        }
    }
    
    console.log();
    
    // Save analysis report
    const reportPath = path.join(investigationDir, 'analysis-report.json');
    const report = {
        generatedAt: new Date().toISOString(),
        filesAnalyzed: files.length,
        summary: aggregated,
        topSelectors: sortedSelectors.slice(0, 10),
        topAuthorSelectors: sortedAuthorSelectors.slice(0, 5),
        recommendations: {
            primaryCommentSelector: sortedSelectors[0]?.[0] || null,
            fallbackCommentSelectors: sortedSelectors.slice(1, 4).map(s => s[0]),
            primaryAuthorSelector: sortedAuthorSelectors[0]?.[0] || null,
            coverage: {
                comments: Math.round(aggregated.postsWithComments / aggregated.totalPosts * 100),
                linkPattern: Math.round(aggregated.postsWithLinkPattern / aggregated.totalPosts * 100)
            }
        }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Full analysis report saved to: ${colors.green}investigation-data/analysis-report.json${colors.reset}\n`);
}

// Run analyzer
analyzeInvestigationData();