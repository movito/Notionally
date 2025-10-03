---
title: Comment Extraction Investigation Plan
version: 1.2.0
last_updated: 2025-01-10
category: development
status: active
---

# Comment Extraction Investigation Plan

## Purpose
Establish debugging and tracing infrastructure to understand LinkedIn's comment structure and develop reliable comment extraction for the v1.2.0 links-from-comments feature.

## Investigation Objectives

1. **DOM Structure Discovery**
   - Comment container hierarchy
   - Author identification elements
   - Comment text and link storage
   - Dynamic loading behavior

2. **Event Timing**
   - When comments load
   - Lazy loading triggers
   - "Show more" mechanics
   - DOM mutation patterns

3. **Data Reliability**
   - Consistent selectors across post types
   - Author verification methods
   - Link format variations
   - Edge cases and failures

## Debug Infrastructure Requirements

### 1. Logging System

```javascript
// Enhanced logging with categories
const DEBUG_CONFIG = {
    enabled: true,
    categories: {
        COMMENT_DISCOVERY: true,
        AUTHOR_MATCHING: true,
        LINK_EXTRACTION: true,
        DOM_STRUCTURE: true,
        TIMING: true,
        ERRORS: true
    },
    verbosity: 3 // 1=errors, 2=warnings, 3=info, 4=debug, 5=trace
};

function debugLog(category, level, message, data = null) {
    if (!DEBUG_CONFIG.enabled) return;
    if (!DEBUG_CONFIG.categories[category]) return;
    if (level > DEBUG_CONFIG.verbosity) return;
    
    const prefix = `[notionally:${category}]`;
    const levelIcon = ['❌', '⚠️', 'ℹ️', '🔍', '📝'][level - 1];
    
    console.log(`${prefix} ${levelIcon} ${message}`);
    if (data) {
        console.log(`${prefix} Data:`, data);
    }
    
    // Store in session for later analysis
    const debugData = {
        timestamp: new Date().toISOString(),
        category,
        level,
        message,
        data,
        url: window.location.href
    };
    
    const stored = JSON.parse(sessionStorage.getItem('notionally_debug') || '[]');
    stored.push(debugData);
    sessionStorage.setItem('notionally_debug', JSON.stringify(stored));
}
```

### 2. DOM Inspector

```javascript
// DOM structure analyzer
function analyzeCommentStructure(postElement) {
    const analysis = {
        postId: postElement.getAttribute('data-id') || 'unknown',
        timestamp: new Date().toISOString(),
        selectors: {},
        attributes: {},
        hierarchy: {}
    };
    
    // Test various comment selectors
    const selectorTests = [
        // Common patterns to test
        '[aria-label*="comment"]',
        '[data-test-id*="comment"]',
        '.comments-container',
        '.feed-shared-social-actions',
        '.social-details-social-activity',
        '.comments-comments-list',
        '[class*="comments"]',
        '[id*="comment"]'
    ];
    
    selectorTests.forEach(selector => {
        const elements = postElement.querySelectorAll(selector);
        if (elements.length > 0) {
            analysis.selectors[selector] = {
                count: elements.length,
                firstElement: {
                    tagName: elements[0].tagName,
                    className: elements[0].className,
                    attributes: Array.from(elements[0].attributes).map(attr => ({
                        name: attr.name,
                        value: attr.value.substring(0, 100) // Truncate long values
                    }))
                }
            };
        }
    });
    
    // Analyze hierarchy
    const findCommentContainers = (element, depth = 0, maxDepth = 5) => {
        if (depth > maxDepth) return null;
        
        const info = {
            tag: element.tagName,
            id: element.id,
            classes: Array.from(element.classList),
            children: []
        };
        
        // Look for comment-related children
        const children = element.children;
        for (let child of children) {
            const childText = child.textContent.toLowerCase();
            if (childText.includes('comment') || 
                child.className.toLowerCase().includes('comment') ||
                child.getAttribute('aria-label')?.toLowerCase().includes('comment')) {
                info.children.push(findCommentContainers(child, depth + 1, maxDepth));
            }
        }
        
        return info;
    };
    
    analysis.hierarchy = findCommentContainers(postElement);
    
    return analysis;
}
```

### 3. Author Identification Tracer

```javascript
// Author matching investigation
function traceAuthorIdentification(postElement) {
    const trace = {
        mainPost: {},
        comments: []
    };
    
    // Extract main post author info
    const authorSelectors = [
        '.update-components-actor__name',
        '.feed-shared-actor__name',
        '[data-control-name="actor"]',
        '.update-components-actor__title'
    ];
    
    for (const selector of authorSelectors) {
        const elem = postElement.querySelector(selector);
        if (elem) {
            trace.mainPost = {
                selector,
                text: elem.textContent.trim(),
                href: elem.href || elem.closest('a')?.href,
                dataAttributes: Object.keys(elem.dataset)
            };
            break;
        }
    }
    
    // Find all comment authors
    const commentAuthors = postElement.querySelectorAll(
        '[class*="comment"] [class*="author"], ' +
        '[class*="comment"] [class*="actor"], ' +
        '[class*="comment"] [class*="name"]'
    );
    
    commentAuthors.forEach(author => {
        trace.comments.push({
            text: author.textContent.trim(),
            href: author.href || author.closest('a')?.href,
            parentClasses: author.parentElement?.className,
            matchesMainAuthor: null // To be calculated
        });
    });
    
    // Calculate matches
    trace.comments.forEach(comment => {
        comment.matchesMainAuthor = 
            comment.text === trace.mainPost.text ||
            comment.href === trace.mainPost.href;
    });
    
    return trace;
}
```

### 4. Comment Loading Observer

```javascript
// Monitor comment loading behavior
function observeCommentLoading(postElement) {
    const observations = {
        initialState: null,
        mutations: [],
        loadTriggers: []
    };
    
    // Capture initial state
    observations.initialState = {
        timestamp: Date.now(),
        commentCount: postElement.querySelectorAll('[class*="comment"]').length,
        hasShowMoreButton: !!postElement.querySelector('[aria-label*="more comments"]'),
        scrollHeight: postElement.scrollHeight
    };
    
    // Set up mutation observer
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            // Filter for comment-related mutations
            const isCommentRelated = 
                mutation.target.className?.includes('comment') ||
                mutation.target.getAttribute('aria-label')?.includes('comment') ||
                Array.from(mutation.addedNodes).some(node => 
                    node.className?.includes('comment') ||
                    node.textContent?.includes('comment')
                );
            
            if (isCommentRelated) {
                observations.mutations.push({
                    timestamp: Date.now(),
                    type: mutation.type,
                    target: mutation.target.className,
                    addedNodes: mutation.addedNodes.length,
                    removedNodes: mutation.removedNodes.length
                });
                
                debugLog('DOM_STRUCTURE', 4, 'Comment mutation detected', {
                    type: mutation.type,
                    target: mutation.target
                });
            }
        });
    });
    
    observer.observe(postElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'aria-expanded', 'aria-label']
    });
    
    // Monitor for load triggers
    const showMoreButton = postElement.querySelector('[aria-label*="more comments"]');
    if (showMoreButton) {
        showMoreButton.addEventListener('click', () => {
            observations.loadTriggers.push({
                timestamp: Date.now(),
                trigger: 'show_more_click',
                commentCountBefore: postElement.querySelectorAll('[class*="comment"]').length
            });
        });
    }
    
    // Return observer handle for cleanup
    return {
        observations,
        observer,
        stop: () => observer.disconnect()
    };
}
```

### 5. Link Extraction Analyzer

```javascript
// Analyze link patterns in comments
function analyzeLinkPatterns(commentElement) {
    const patterns = {
        directLinks: [],
        textUrls: [],
        redirectLinks: [],
        mentions: []
    };
    
    // Direct anchor links
    const anchors = commentElement.querySelectorAll('a[href]');
    anchors.forEach(anchor => {
        const href = anchor.href;
        const linkData = {
            href,
            text: anchor.textContent.trim(),
            isExternal: !href.includes('linkedin.com'),
            isRedirect: href.includes('linkedin.com/redir'),
            dataAttributes: Object.keys(anchor.dataset)
        };
        
        if (linkData.isRedirect) {
            patterns.redirectLinks.push(linkData);
        } else if (linkData.isExternal) {
            patterns.directLinks.push(linkData);
        }
    });
    
    // URLs in text content
    const textContent = commentElement.textContent;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = textContent.match(urlRegex);
    if (matches) {
        patterns.textUrls = matches.map(url => ({
            url,
            isLinkedInShortened: url.includes('lnkd.in')
        }));
    }
    
    // LinkedIn mentions (might contain profile links)
    const mentions = commentElement.querySelectorAll('[data-attribute-index]');
    mentions.forEach(mention => {
        patterns.mentions.push({
            text: mention.textContent,
            href: mention.closest('a')?.href
        });
    });
    
    return patterns;
}
```

## Testing Scenarios

### 1. Manual Test Cases

```javascript
// Test scenario executor
const TEST_SCENARIOS = {
    'standard_link_in_comments': {
        description: 'Post with "link in comments" and single author comment',
        steps: [
            'Find post with "link in comments" text',
            'Expand comments if needed',
            'Verify author comment is first',
            'Extract link from comment'
        ],
        validate: (result) => {
            return result.authorComments.length === 1 &&
                   result.authorComments[0].links.length > 0;
        }
    },
    
    'multiple_author_comments': {
        description: 'Post where author has multiple comments',
        steps: [
            'Find post with multiple author comments',
            'Verify all author comments captured',
            'Check comment ordering preserved'
        ],
        validate: (result) => {
            return result.authorComments.length > 1 &&
                   result.authorComments.every(c => c.position > 0);
        }
    },
    
    'author_replies': {
        description: 'Author replying to other comments',
        steps: [
            'Find post with author replies',
            'Distinguish replies from top-level comments',
            'Capture reply context if needed'
        ],
        validate: (result) => {
            return result.authorComments.some(c => c.isReply);
        }
    },
    
    'lazy_loaded_comments': {
        description: 'Comments that load on scroll or click',
        steps: [
            'Find post with "Show more comments"',
            'Trigger load',
            'Wait for DOM update',
            'Extract newly loaded comments'
        ],
        validate: (result) => {
            return result.loadTriggered && result.authorComments.length > 0;
        }
    },
    
    'no_comments': {
        description: 'Post without any comments',
        steps: [
            'Find post with no comments',
            'Verify graceful handling',
            'No errors thrown'
        ],
        validate: (result) => {
            return result.authorComments.length === 0 && !result.error;
        }
    }
};
```

### 2. Automated Collection Script

```javascript
// Data collection for analysis
function collectCommentData() {
    const collectedData = {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        posts: []
    };
    
    // Find all posts on current page
    const posts = document.querySelectorAll('[data-id][class*="feed-shared-update"]');
    
    posts.forEach((post, index) => {
        if (index >= 10) return; // Limit to first 10 posts
        
        const postData = {
            index,
            structure: analyzeCommentStructure(post),
            authors: traceAuthorIdentification(post),
            hasComments: post.querySelector('[class*="comment"]') !== null,
            commentCount: post.querySelectorAll('[class*="comment"]').length
        };
        
        // If has comments, do deeper analysis
        if (postData.hasComments) {
            const firstComment = post.querySelector('[class*="comment"]');
            postData.linkPatterns = analyzeLinkPatterns(firstComment);
        }
        
        collectedData.posts.push(postData);
    });
    
    // Save to clipboard for analysis
    const dataStr = JSON.stringify(collectedData, null, 2);
    navigator.clipboard.writeText(dataStr).then(() => {
        console.log('[notionally] Comment data copied to clipboard!');
        console.log('[notionally] Paste into a file for analysis');
    });
    
    return collectedData;
}
```

## Implementation Guide

### Phase 1: Investigation (Developer Tasks)

1. **Install Debug Version**
   ```javascript
   // Add to Greasemonkey script header
   // @version      1.6.1-debug
   // @description  Debug version for comment extraction investigation
   ```

2. **Enable Debug Mode**
   - Add debug configuration to script
   - Include all investigation functions
   - Add keyboard shortcut for data collection (e.g., Ctrl+Shift+D)

3. **Collect Data**
   - Navigate to LinkedIn feed
   - Run collection script on various post types
   - Document findings in structured format

4. **Analyze Patterns**
   - Identify consistent selectors
   - Document DOM structure variations
   - Note timing and loading patterns

### Phase 2: Implementation

Based on investigation findings:

1. **Core Functions**
   ```javascript
   function extractAuthorComments(postElement, authorInfo) {
       // Implementation based on discovered selectors
   }
   
   function waitForComments(postElement, timeout = 3000) {
       // Handle lazy loading based on timing observations
   }
   
   function extractLinksFromComment(commentElement) {
       // Link extraction based on pattern analysis
   }
   ```

2. **Integration Points**
   - Modify `extractPostData()` function
   - Add comment extraction after main content
   - Handle async comment loading

3. **Error Handling**
   - Graceful degradation if comments fail
   - Timeout for lazy loading
   - Validation of author matching

## Data Collection Output Format

```json
{
  "investigation": {
    "version": "1.2.0-debug",
    "date": "2025-01-10",
    "findings": {
      "selectors": {
        "commentContainer": "[class*='comments-comments-list']",
        "authorName": ".comments-comment-item__author-name",
        "commentText": ".comments-comment-item__main-content",
        "showMoreButton": "button[aria-label*='Load more comments']"
      },
      "timing": {
        "averageLoadTime": 250,
        "requiresInteraction": true,
        "lazyLoadThreshold": 3
      },
      "patterns": {
        "authorCommentPosition": "usually_first",
        "linkFormats": ["direct", "lnkd.in", "text_only"],
        "authorIdentifiers": ["name_match", "profile_url_match"]
      }
    },
    "recommendations": {
      "primary_approach": "description of recommended method",
      "fallback_approach": "alternative if primary fails",
      "edge_cases": ["list", "of", "edge", "cases"]
    }
  }
}
```

## Success Criteria

1. **Selector Identification**
   - ✅ Found reliable comment container selector
   - ✅ Can identify author in comments
   - ✅ Can extract comment text and links

2. **Loading Behavior**
   - ✅ Understand lazy loading mechanism
   - ✅ Know how to trigger "show more"
   - ✅ Can wait for comments to appear

3. **Data Quality**
   - ✅ 95%+ accuracy in author matching
   - ✅ Captures all author comments
   - ✅ Preserves comment order

## Debugging Commands

Add these to browser console for quick testing:

```javascript
// Quick test commands
window.notionally_debug = {
    collectData: collectCommentData,
    analyzePost: (index = 0) => {
        const post = document.querySelectorAll('[data-id][class*="feed-shared-update"]')[index];
        return analyzeCommentStructure(post);
    },
    traceAuthors: (index = 0) => {
        const post = document.querySelectorAll('[data-id][class*="feed-shared-update"]')[index];
        return traceAuthorIdentification(post);
    },
    exportDebugLog: () => {
        const data = sessionStorage.getItem('notionally_debug');
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notionally-debug-${Date.now()}.json`;
        a.click();
    }
};

console.log('[notionally Debug] Commands available:');
console.log('- notionally_debug.collectData()');
console.log('- notionally_debug.analyzePost(index)');
console.log('- notionally_debug.traceAuthors(index)');
console.log('- notionally_debug.exportDebugLog()');
```

## Next Steps for Feature Developer

1. Install debug version of Greasemonkey script
2. Run investigation functions on LinkedIn feed
3. Collect data from at least 20 different posts
4. Document findings in investigation results file
5. Update implementation plan based on discoveries
6. Begin implementation with discovered selectors

## Notes

- LinkedIn DOM may vary between users/regions
- Consider A/B testing variations
- Mobile vs Desktop differences not covered here
- Focus on English language interface initially