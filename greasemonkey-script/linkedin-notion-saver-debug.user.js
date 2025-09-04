// ==UserScript==
// @name         Notionally - LinkedIn to Notion Saver (DEBUG)
// @namespace    http://tampermonkey.net/
// @version      1.6.1-debug
// @description  Debug version for comment extraction investigation
// @author       Fredrik Matheson
// @match        https://www.linkedin.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
// @grant        none
// ==/UserScript==

/**
 * Debug Version 1.6.1-debug - Investigation for Comment Extraction Feature
 * This version includes extensive debugging and tracing for discovering LinkedIn's comment structure
 */

(function() {
    'use strict';
    
    // =========================
    // DEBUG CONFIGURATION
    // =========================
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
        verbosity: 5 // 1=errors, 2=warnings, 3=info, 4=debug, 5=trace
    };

    function debugLog(category, level, message, data = null) {
        if (!DEBUG_CONFIG.enabled) return;
        if (!DEBUG_CONFIG.categories[category]) return;
        if (level > DEBUG_CONFIG.verbosity) return;
        
        const prefix = `[Notionally:${category}]`;
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

    // =========================
    // DOM STRUCTURE ANALYZER
    // =========================
    function analyzeCommentStructure(postElement) {
        debugLog('DOM_STRUCTURE', 3, 'Starting comment structure analysis');
        
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
            '[id*="comment"]',
            '.update-components-comments-list',
            '.comments-comment-list',
            '.comments-comment-item',
            '.social-details-social-counts',
            '.feed-shared-inline-show-more-text',
            '[data-finite-scroll-hotkey-item]'
        ];
        
        selectorTests.forEach(selector => {
            try {
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
            } catch (e) {
                debugLog('ERRORS', 2, `Error testing selector ${selector}`, e.message);
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
                const childClass = (child.className || '').toLowerCase();
                const ariaLabel = (child.getAttribute('aria-label') || '').toLowerCase();
                
                if (childText.includes('comment') || 
                    childClass.includes('comment') ||
                    ariaLabel.includes('comment')) {
                    const childInfo = findCommentContainers(child, depth + 1, maxDepth);
                    if (childInfo) {
                        info.children.push(childInfo);
                    }
                }
            }
            
            return info.children.length > 0 || depth === 0 ? info : null;
        };
        
        analysis.hierarchy = findCommentContainers(postElement);
        
        debugLog('DOM_STRUCTURE', 4, 'Comment structure analysis complete', analysis);
        return analysis;
    }

    // =========================
    // AUTHOR IDENTIFICATION TRACER
    // =========================
    function traceAuthorIdentification(postElement) {
        debugLog('AUTHOR_MATCHING', 3, 'Starting author identification trace');
        
        const trace = {
            mainPost: {},
            comments: []
        };
        
        // Extract main post author info
        const authorSelectors = [
            '.update-components-actor__name',
            '.feed-shared-actor__name',
            '[data-control-name="actor"]',
            '.update-components-actor__title',
            '.feed-shared-actor__title',
            '.update-components-actor__link',
            '.feed-shared-actor__link'
        ];
        
        for (const selector of authorSelectors) {
            const elem = postElement.querySelector(selector);
            if (elem) {
                trace.mainPost = {
                    selector,
                    text: elem.textContent.trim(),
                    href: elem.href || elem.closest('a')?.href,
                    dataAttributes: Object.keys(elem.dataset || {})
                };
                debugLog('AUTHOR_MATCHING', 4, `Found main post author with selector: ${selector}`, trace.mainPost);
                break;
            }
        }
        
        // Find all comment authors - expanded selectors
        const commentAuthorSelectors = [
            '.comments-comment-item__author',
            '.comments-comment-item [class*="author"]',
            '.comments-comment-item [class*="actor"]',
            '.comments-comment-item [class*="name"]',
            '[class*="comment"] [class*="author"]',
            '[class*="comment"] [class*="actor"]',
            '[class*="comment"] [class*="name"]',
            '.comments-post-meta__name-text',
            '.comments-post-meta__profile-link'
        ];
        
        const foundAuthors = new Set();
        
        commentAuthorSelectors.forEach(selector => {
            postElement.querySelectorAll(selector).forEach(author => {
                const authorKey = author.textContent.trim() + (author.href || '');
                if (!foundAuthors.has(authorKey)) {
                    foundAuthors.add(authorKey);
                    
                    const authorData = {
                        selector,
                        text: author.textContent.trim(),
                        href: author.href || author.closest('a')?.href,
                        parentClasses: author.parentElement?.className,
                        matchesMainAuthor: null // To be calculated
                    };
                    
                    // Calculate matches
                    authorData.matchesMainAuthor = 
                        authorData.text === trace.mainPost.text ||
                        (authorData.href && authorData.href === trace.mainPost.href);
                    
                    trace.comments.push(authorData);
                }
            });
        });
        
        debugLog('AUTHOR_MATCHING', 4, 'Author identification trace complete', trace);
        return trace;
    }

    // =========================
    // COMMENT LOADING OBSERVER
    // =========================
    function observeCommentLoading(postElement) {
        debugLog('TIMING', 3, 'Starting comment loading observation');
        
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
        
        debugLog('TIMING', 4, 'Initial comment state captured', observations.initialState);
        
        // Set up mutation observer
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                // Filter for comment-related mutations
                const targetClass = (mutation.target.className || '').toString();
                const targetAriaLabel = mutation.target.getAttribute('aria-label') || '';
                
                const isCommentRelated = 
                    targetClass.includes('comment') ||
                    targetAriaLabel.includes('comment') ||
                    Array.from(mutation.addedNodes).some(node => {
                        if (node.nodeType === 1) { // Element node
                            const nodeClass = (node.className || '').toString();
                            const nodeText = node.textContent || '';
                            return nodeClass.includes('comment') || nodeText.includes('comment');
                        }
                        return false;
                    });
                
                if (isCommentRelated) {
                    observations.mutations.push({
                        timestamp: Date.now(),
                        type: mutation.type,
                        target: targetClass.substring(0, 100),
                        addedNodes: mutation.addedNodes.length,
                        removedNodes: mutation.removedNodes.length
                    });
                    
                    debugLog('DOM_STRUCTURE', 5, 'Comment mutation detected', {
                        type: mutation.type,
                        target: targetClass
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
        const showMoreSelectors = [
            '[aria-label*="more comments"]',
            '[aria-label*="Load more"]',
            '.comments-comments-list__show-more',
            '.show-more-comments',
            'button[class*="show-more"]'
        ];
        
        showMoreSelectors.forEach(selector => {
            const showMoreButton = postElement.querySelector(selector);
            if (showMoreButton) {
                debugLog('TIMING', 4, `Found show more button with selector: ${selector}`);
                
                showMoreButton.addEventListener('click', () => {
                    observations.loadTriggers.push({
                        timestamp: Date.now(),
                        trigger: 'show_more_click',
                        selector,
                        commentCountBefore: postElement.querySelectorAll('[class*="comment"]').length
                    });
                    debugLog('TIMING', 3, 'Show more button clicked', observations.loadTriggers[observations.loadTriggers.length - 1]);
                });
            }
        });
        
        // Return observer handle for cleanup
        return {
            observations,
            observer,
            stop: () => {
                observer.disconnect();
                debugLog('TIMING', 4, 'Comment observer stopped', observations);
            }
        };
    }

    // =========================
    // LINK EXTRACTION ANALYZER
    // =========================
    function analyzeLinkPatterns(commentElement) {
        debugLog('LINK_EXTRACTION', 3, 'Starting link pattern analysis');
        
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
                isRedirect: href.includes('linkedin.com/redir') || href.includes('linkedin.com/safety/go'),
                isShortened: href.includes('lnkd.in'),
                dataAttributes: Object.keys(anchor.dataset || {})
            };
            
            if (linkData.isRedirect) {
                patterns.redirectLinks.push(linkData);
            } else if (linkData.isExternal) {
                patterns.directLinks.push(linkData);
            }
        });
        
        // URLs in text content (but not in anchor tags)
        const textContent = commentElement.textContent;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = textContent.match(urlRegex) || [];
        
        matches.forEach(url => {
            // Check if this URL is not already in an anchor
            const isInAnchor = Array.from(anchors).some(a => a.href === url);
            if (!isInAnchor) {
                patterns.textUrls.push({
                    url,
                    isLinkedInShortened: url.includes('lnkd.in')
                });
            }
        });
        
        // LinkedIn mentions (might contain profile links)
        const mentions = commentElement.querySelectorAll('[data-attribute-index]');
        mentions.forEach(mention => {
            patterns.mentions.push({
                text: mention.textContent,
                href: mention.closest('a')?.href
            });
        });
        
        debugLog('LINK_EXTRACTION', 4, 'Link pattern analysis complete', patterns);
        return patterns;
    }

    // =========================
    // DATA COLLECTION
    // =========================
    function collectCommentData() {
        console.log('[Notionally Debug] Starting comment data collection...');
        debugLog('COMMENT_DISCOVERY', 3, 'Starting data collection');
        
        const collectedData = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            posts: []
        };
        
        // Find all posts on current page
        const postSelectors = [
            '[data-id][class*="feed-shared-update"]',
            '[data-id][class*="occludable-update"]',
            '.feed-shared-update-v2'
        ];
        
        let posts = [];
        postSelectors.forEach(selector => {
            const found = document.querySelectorAll(selector);
            if (found.length > 0) {
                posts = found;
                debugLog('COMMENT_DISCOVERY', 4, `Found ${found.length} posts with selector: ${selector}`);
            }
        });
        
        posts.forEach((post, index) => {
            if (index >= 10) return; // Limit to first 10 posts
            
            debugLog('COMMENT_DISCOVERY', 4, `Analyzing post ${index + 1}`);
            
            const postData = {
                index,
                structure: analyzeCommentStructure(post),
                authors: traceAuthorIdentification(post),
                hasComments: post.querySelector('[class*="comment"]') !== null,
                commentCount: post.querySelectorAll('[class*="comment"]').length
            };
            
            // Check for "link in comments" pattern
            const postText = post.textContent.toLowerCase();
            postData.hasLinkInCommentsPattern = 
                postText.includes('link in comment') ||
                postText.includes('links in comment') ||
                postText.includes('link below') ||
                postText.includes('link 👇') ||
                postText.includes('link ⬇');
            
            // If has comments, do deeper analysis
            if (postData.hasComments) {
                const firstComment = post.querySelector('[class*="comment"]');
                if (firstComment) {
                    postData.linkPatterns = analyzeLinkPatterns(firstComment);
                }
                
                // Try to observe loading
                const loadObserver = observeCommentLoading(post);
                
                // Stop after 2 seconds to capture initial data
                setTimeout(() => {
                    postData.loadingObservations = loadObserver.observations;
                    loadObserver.stop();
                }, 2000);
            }
            
            collectedData.posts.push(postData);
        });
        
        // Save to clipboard for analysis
        const dataStr = JSON.stringify(collectedData, null, 2);
        navigator.clipboard.writeText(dataStr).then(() => {
            console.log('[Notionally Debug] ✅ Comment data copied to clipboard!');
            console.log('[Notionally Debug] Paste into a file for analysis');
            alert('Notionally Debug: Comment data collected and copied to clipboard!\nPaste into a JSON file for analysis.');
        }).catch(err => {
            console.error('[Notionally Debug] Failed to copy to clipboard:', err);
            console.log('[Notionally Debug] Data:', collectedData);
        });
        
        debugLog('COMMENT_DISCOVERY', 3, 'Data collection complete', {
            postCount: collectedData.posts.length,
            withComments: collectedData.posts.filter(p => p.hasComments).length
        });
        
        return collectedData;
    }

    // =========================
    // TEST SCENARIO EXECUTOR
    // =========================
    function runTestScenario(scenarioName) {
        const TEST_SCENARIOS = {
            'standard_link_in_comments': {
                description: 'Post with "link in comments" and single author comment',
                test: () => {
                    const posts = document.querySelectorAll('[data-id][class*="feed-shared-update"]');
                    for (const post of posts) {
                        if (post.textContent.toLowerCase().includes('link in comment')) {
                            console.log('[Test] Found post with "link in comments"');
                            return {
                                structure: analyzeCommentStructure(post),
                                authors: traceAuthorIdentification(post)
                            };
                        }
                    }
                    return null;
                }
            },
            
            'multiple_comments': {
                description: 'Post with multiple comments',
                test: () => {
                    const posts = document.querySelectorAll('[data-id][class*="feed-shared-update"]');
                    for (const post of posts) {
                        const comments = post.querySelectorAll('[class*="comment"]');
                        if (comments.length > 3) {
                            console.log(`[Test] Found post with ${comments.length} comments`);
                            return {
                                structure: analyzeCommentStructure(post),
                                authors: traceAuthorIdentification(post)
                            };
                        }
                    }
                    return null;
                }
            }
        };
        
        const scenario = TEST_SCENARIOS[scenarioName];
        if (scenario) {
            console.log(`[Test] Running scenario: ${scenario.description}`);
            const result = scenario.test();
            console.log('[Test] Result:', result);
            return result;
        }
        
        console.log('[Test] Available scenarios:', Object.keys(TEST_SCENARIOS));
        return null;
    }

    // =========================
    // EXPORT DEBUG DATA
    // =========================
    function exportDebugLog() {
        const data = sessionStorage.getItem('notionally_debug');
        const blob = new Blob([data], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `notionally-debug-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        console.log('[Notionally Debug] Debug log exported');
    }

    // =========================
    // KEYBOARD SHORTCUTS
    // =========================
    document.addEventListener('keydown', function(event) {
        // Ctrl+Shift+D - Collect comment data
        if (event.ctrlKey && event.shiftKey && event.key === 'D') {
            event.preventDefault();
            console.log('[Notionally Debug] Keyboard shortcut triggered: Collect data');
            collectCommentData();
        }
        
        // Ctrl+Shift+E - Export debug log
        if (event.ctrlKey && event.shiftKey && event.key === 'E') {
            event.preventDefault();
            console.log('[Notionally Debug] Keyboard shortcut triggered: Export debug log');
            exportDebugLog();
        }
        
        // Ctrl+Shift+T - Run test scenario
        if (event.ctrlKey && event.shiftKey && event.key === 'T') {
            event.preventDefault();
            const scenario = prompt('Enter test scenario name (or leave empty for list):');
            runTestScenario(scenario);
        }
    });

    // =========================
    // CONSOLE API
    // =========================
    window.notionally_debug = {
        collectData: collectCommentData,
        analyzePost: (index = 0) => {
            const posts = document.querySelectorAll('[data-id][class*="feed-shared-update"]');
            if (posts[index]) {
                return analyzeCommentStructure(posts[index]);
            }
            console.log(`[Notionally Debug] Post ${index} not found. Found ${posts.length} posts.`);
            return null;
        },
        traceAuthors: (index = 0) => {
            const posts = document.querySelectorAll('[data-id][class*="feed-shared-update"]');
            if (posts[index]) {
                return traceAuthorIdentification(posts[index]);
            }
            console.log(`[Notionally Debug] Post ${index} not found. Found ${posts.length} posts.`);
            return null;
        },
        analyzeLinkInPost: (index = 0) => {
            const posts = document.querySelectorAll('[data-id][class*="feed-shared-update"]');
            if (posts[index]) {
                const comments = posts[index].querySelectorAll('[class*="comment"]');
                if (comments.length > 0) {
                    return analyzeLinkPatterns(comments[0]);
                }
                console.log('[Notionally Debug] No comments found in post');
            }
            console.log(`[Notionally Debug] Post ${index} not found`);
            return null;
        },
        observePost: (index = 0) => {
            const posts = document.querySelectorAll('[data-id][class*="feed-shared-update"]');
            if (posts[index]) {
                return observeCommentLoading(posts[index]);
            }
            console.log(`[Notionally Debug] Post ${index} not found`);
            return null;
        },
        exportDebugLog: exportDebugLog,
        runTest: runTestScenario,
        config: DEBUG_CONFIG,
        clearDebug: () => {
            sessionStorage.removeItem('notionally_debug');
            console.log('[Notionally Debug] Debug log cleared');
        }
    };

    // =========================
    // STARTUP MESSAGE
    // =========================
    console.log('%c🔍 Notionally Debug Mode Active', 'background: #4CAF50; color: white; font-size: 16px; padding: 5px;');
    console.log('📋 Keyboard Shortcuts:');
    console.log('  • Ctrl+Shift+D - Collect comment data from current page');
    console.log('  • Ctrl+Shift+E - Export debug log as JSON');
    console.log('  • Ctrl+Shift+T - Run test scenario');
    console.log('');
    console.log('🛠️ Console Commands:');
    console.log('  • notionally_debug.collectData() - Collect data from all posts');
    console.log('  • notionally_debug.analyzePost(index) - Analyze specific post structure');
    console.log('  • notionally_debug.traceAuthors(index) - Trace authors in specific post');
    console.log('  • notionally_debug.analyzeLinkInPost(index) - Analyze links in post comments');
    console.log('  • notionally_debug.observePost(index) - Start observing post for changes');
    console.log('  • notionally_debug.exportDebugLog() - Export debug log');
    console.log('  • notionally_debug.clearDebug() - Clear debug log');
    console.log('');
    console.log('📊 Debug categories:', Object.keys(DEBUG_CONFIG.categories).join(', '));
    console.log('📈 Verbosity level:', DEBUG_CONFIG.verbosity);

})();