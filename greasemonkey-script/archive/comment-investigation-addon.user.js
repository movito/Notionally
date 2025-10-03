// ==UserScript==
// @name         notionally - Comment Investigation Add-on
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Add-on for investigating LinkedIn comments - works alongside main Notionally script
// @author       Fredrik Matheson
// @match        https://www.linkedin.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/**
 * INVESTIGATION ADD-ON ONLY
 * This script ONLY adds investigation features.
 * It does NOT modify or interfere with the main Notionally script.
 * Both scripts can run simultaneously.
 */

(function() {
    'use strict';
    
    const INVESTIGATION_VERSION = '1.0.0';
    const SERVER_URL = 'http://localhost:8765';
    
    // Unique namespace to avoid conflicts
    const NAMESPACE = 'notionally_investigation_addon';
    
    // Debug logging with unique prefix
    function log(...args) {
        console.log(`[notionally Investigation v${INVESTIGATION_VERSION}]`, ...args);
    }
    
    log('Investigation add-on loaded');
    
    // ============================================
    // COMMENT ANALYSIS FUNCTIONS
    // ============================================
    
    function analyzeCommentStructure(postElement) {
        const analysis = {
            postId: postElement.getAttribute('data-id') || 'unknown',
            timestamp: new Date().toISOString(),
            hasComments: false,
            hasLinkInCommentsPattern: false,
            selectors: {},
            commentData: [],
            authorInfo: null
        };
        
        // Check for "link in comments" pattern in post text
        const postText = postElement.textContent.toLowerCase();
        analysis.hasLinkInCommentsPattern = 
            postText.includes('link in comment') || 
            postText.includes('links in comment') ||
            postText.includes('link below') ||
            postText.includes('link 👇') ||
            postText.includes('link ⬇') ||
            postText.includes('see comments');
        
        // Extract author info from main post
        const authorSelectors = [
            '.update-components-actor__name',
            '.feed-shared-actor__name',
            '.update-components-actor__title strong',
            '[data-control-name="actor"] span[aria-hidden="true"]',
            '.update-components-actor__meta-link span[aria-hidden="true"]'
        ];
        
        for (const selector of authorSelectors) {
            const elem = postElement.querySelector(selector);
            if (elem) {
                const linkElem = elem.closest('a');
                analysis.authorInfo = {
                    selector: selector,
                    name: elem.textContent.trim(),
                    profileUrl: linkElem?.href || null
                };
                log('Found author:', analysis.authorInfo);
                break;
            }
        }
        
        // Test various comment container selectors
        const commentSelectors = [
            '.comments-comments-list',
            '.comments-comment-list__comment-item',
            '[class*="comments-comment-item"]',
            'article[class*="comments"]',
            '[data-test-id*="comments-comment-item"]',
            '.social-details-social-activity__comments-list'
        ];
        
        commentSelectors.forEach(selector => {
            const elements = postElement.querySelectorAll(selector);
            if (elements.length > 0) {
                analysis.hasComments = true;
                if (!analysis.selectors[selector]) {
                    analysis.selectors[selector] = {
                        count: elements.length,
                        type: 'comment_container'
                    };
                }
                
                // Try to extract comment data
                elements.forEach((elem, index) => {
                    const commentInfo = extractCommentInfo(elem, analysis.authorInfo);
                    if (commentInfo && commentInfo.text) {
                        analysis.commentData.push({
                            index,
                            ...commentInfo
                        });
                    }
                });
            }
        });
        
        return analysis;
    }
    
    function extractCommentInfo(commentElement, postAuthor) {
        const info = {
            text: '',
            authorName: '',
            authorProfileUrl: '',
            isPostAuthor: false,
            links: [],
            timestamp: null
        };
        
        // Extract comment text - look for the actual text content
        const textSelectors = [
            '.comments-comment-item__main-content',
            '.comments-comment-item .feed-shared-text',
            '[class*="comments-comment-texteditor"]',
            '.comments-comment-item__content-body'
        ];
        
        for (const selector of textSelectors) {
            const textElem = commentElement.querySelector(selector);
            if (textElem) {
                info.text = textElem.textContent.trim();
                break;
            }
        }
        
        // If no text found with specific selectors, get all text
        if (!info.text) {
            // Remove author name and timestamp, keep just comment text
            const clone = commentElement.cloneNode(true);
            const removeSelectors = [
                '.comments-post-meta',
                '.comments-comment-item__timestamp',
                '.comments-comment-social-bar'
            ];
            removeSelectors.forEach(sel => {
                clone.querySelectorAll(sel).forEach(el => el.remove());
            });
            info.text = clone.textContent.trim();
        }
        
        // Extract comment author
        const authorSelectors = [
            '.comments-post-meta__name-text',
            '.comments-comment-item__author',
            '.comments-post-meta__profile-link span[aria-hidden="true"]'
        ];
        
        for (const selector of authorSelectors) {
            const authorElem = commentElement.querySelector(selector);
            if (authorElem) {
                info.authorName = authorElem.textContent.trim();
                const linkElem = authorElem.closest('a');
                info.authorProfileUrl = linkElem?.href || '';
                break;
            }
        }
        
        // Check if comment is from post author
        if (postAuthor && info.authorName) {
            // Name match
            const nameMatch = info.authorName === postAuthor.name;
            // URL match (normalize URLs for comparison)
            const urlMatch = info.authorProfileUrl && postAuthor.profileUrl && 
                           info.authorProfileUrl.split('?')[0] === postAuthor.profileUrl.split('?')[0];
            
            info.isPostAuthor = nameMatch || urlMatch;
            
            if (info.isPostAuthor) {
                log('Found author comment:', info.authorName);
            }
        }
        
        // Extract links from comment
        const linkElements = commentElement.querySelectorAll('a[href]');
        linkElements.forEach(link => {
            const href = link.href;
            // Filter out profile links and hash links
            if (href && !href.includes('linkedin.com/in/') && !href.includes('linkedin.com/company/') && href !== '#') {
                info.links.push({
                    url: href,
                    text: link.textContent.trim(),
                    isExternal: !href.includes('linkedin.com')
                });
            }
        });
        
        // Also look for URLs in text
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const textUrls = info.text.match(urlRegex) || [];
        textUrls.forEach(url => {
            if (!info.links.find(l => l.url === url)) {
                info.links.push({
                    url: url,
                    text: url,
                    isExternal: !url.includes('linkedin.com'),
                    fromText: true
                });
            }
        });
        
        return info;
    }
    
    // ============================================
    // FLOATING INVESTIGATION BUTTON
    // ============================================
    
    function createFloatingInvestigationButton(postElement) {
        // Check if we already added a button to this post
        if (postElement.querySelector(`.${NAMESPACE}-btn`)) {
            return;
        }
        
        const button = document.createElement('button');
        button.className = `${NAMESPACE}-btn`;
        button.innerHTML = '🔍 Check Comments';
        button.title = 'Analyze comments for links (Investigation Mode)';
        
        // Floating button style
        button.style.cssText = `
            position: absolute;
            top: 60px;
            right: 16px;
            z-index: 999;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
            transition: all 0.2s ease;
            font-family: -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
        `;
        
        // Hover effect
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.6)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.4)';
        });
        
        // Click handler
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            await handleInvestigationClick(button, postElement);
        });
        
        // Make post relative positioned if not already
        const currentPosition = window.getComputedStyle(postElement).position;
        if (currentPosition === 'static') {
            postElement.style.position = 'relative';
        }
        
        postElement.appendChild(button);
    }
    
    async function handleInvestigationClick(button, postElement) {
        log('Investigation button clicked');
        
        // Update button state
        button.innerHTML = '⏳ Analyzing...';
        button.disabled = true;
        button.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        
        try {
            // Analyze comment structure
            const analysis = analyzeCommentStructure(postElement);
            
            log('Analysis complete:', analysis);
            
            // Find author comments with links
            const authorComments = analysis.commentData.filter(c => c.isPostAuthor);
            const authorLinks = authorComments.reduce((total, comment) => total + comment.links.length, 0);
            
            // Prepare investigation data
            const investigationData = {
                posts: [{
                    ...analysis,
                    metadata: {
                        url: window.location.href,
                        timestamp: new Date().toISOString()
                    }
                }],
                metadata: {
                    scriptVersion: INVESTIGATION_VERSION,
                    mode: 'single',
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                }
            };
            
            // Send to investigation endpoint
            const response = await fetch(`${SERVER_URL}/investigation/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(investigationData)
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }
            
            const result = await response.json();
            log('Investigation data sent:', result);
            
            // Update button based on findings
            if (authorLinks > 0) {
                button.innerHTML = `✨ Found ${authorLinks} link${authorLinks > 1 ? 's' : ''}!`;
                button.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
                button.title = `Found ${authorComments.length} author comment(s) with ${authorLinks} link(s)`;
            } else if (analysis.hasComments) {
                button.innerHTML = '📊 No author links';
                button.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
                button.title = `${analysis.commentData.length} comments analyzed, no author links found`;
            } else {
                button.innerHTML = '💭 No comments';
                button.style.background = 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
                button.title = 'No comments found on this post';
            }
            
            // Log summary to console
            console.group(`%c📊 Comment Analysis Results`, 'color: #667eea; font-weight: bold; font-size: 14px');
            console.log(`Total comments: ${analysis.commentData.length}`);
            console.log(`Author comments: ${authorComments.length}`);
            console.log(`Links in author comments: ${authorLinks}`);
            if (authorComments.length > 0) {
                console.log('Author comments:', authorComments);
            }
            console.log('Full analysis:', analysis);
            console.groupEnd();
            
        } catch (error) {
            log('Error during investigation:', error);
            button.innerHTML = '❌ Error';
            button.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)';
            button.title = error.message;
        } finally {
            // Reset button after delay
            setTimeout(() => {
                button.disabled = false;
                button.innerHTML = '🔍 Check Comments';
                button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                button.title = 'Analyze comments for links (Investigation Mode)';
            }, 3000);
        }
    }
    
    // ============================================
    // OBSERVATION AND INITIALIZATION
    // ============================================
    
    function addInvestigationButtons() {
        // Find all posts that don't have our button yet
        const posts = document.querySelectorAll(`[data-id][class*="feed-shared-update"]:not(.${NAMESPACE}-processed)`);
        
        posts.forEach(post => {
            post.classList.add(`${NAMESPACE}-processed`);
            createFloatingInvestigationButton(post);
        });
        
        if (posts.length > 0) {
            log(`Added investigation buttons to ${posts.length} posts`);
        }
    }
    
    function initializeInvestigation() {
        log('Initializing investigation mode...');
        
        // Add buttons to existing posts
        setTimeout(addInvestigationButtons, 1500);
        
        // Watch for new posts
        const observer = new MutationObserver((mutations) => {
            // Debounce to avoid too many calls
            clearTimeout(window[`${NAMESPACE}_timeout`]);
            window[`${NAMESPACE}_timeout`] = setTimeout(addInvestigationButtons, 500);
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Console helpers
        window.notionally_investigate = {
            version: INVESTIGATION_VERSION,
            analyzeCurrentPost: (index = 0) => {
                const posts = document.querySelectorAll('[data-id][class*="feed-shared-update"]');
                if (posts[index]) {
                    const analysis = analyzeCommentStructure(posts[index]);
                    console.log('Analysis:', analysis);
                    return analysis;
                }
                return null;
            },
            findAllAuthorComments: () => {
                const posts = document.querySelectorAll('[data-id][class*="feed-shared-update"]');
                const results = [];
                posts.forEach((post, i) => {
                    const analysis = analyzeCommentStructure(post);
                    const authorComments = analysis.commentData.filter(c => c.isPostAuthor);
                    if (authorComments.length > 0) {
                        results.push({
                            postIndex: i,
                            author: analysis.authorInfo?.name,
                            comments: authorComments
                        });
                    }
                });
                return results;
            },
            collectBulkData: async () => {
                const posts = document.querySelectorAll('[data-id][class*="feed-shared-update"]');
                const data = [];
                posts.forEach((post, i) => {
                    if (i < 20) {
                        data.push(analyzeCommentStructure(post));
                    }
                });
                
                const investigationData = {
                    posts: data,
                    metadata: {
                        scriptVersion: INVESTIGATION_VERSION,
                        mode: 'bulk',
                        url: window.location.href,
                        timestamp: new Date().toISOString(),
                        postCount: data.length
                    }
                };
                
                try {
                    const response = await fetch(`${SERVER_URL}/investigation/comments`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(investigationData)
                    });
                    
                    const result = await response.json();
                    console.log('Bulk data sent:', result);
                    return result;
                } catch (error) {
                    console.error('Error sending bulk data:', error);
                    throw error;
                }
            }
        };
        
        // Keyboard shortcut for bulk collection
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'I') {
                log('Bulk investigation triggered');
                window.notionally_investigate.collectBulkData()
                    .then(result => {
                        alert(`Investigation complete! Analyzed ${result.summary.postsAnalyzed} posts. Check console for details.`);
                    })
                    .catch(error => {
                        alert(`Investigation failed: ${error.message}`);
                    });
            }
        });
        
        log('Investigation mode ready!');
        log('🎯 Purple floating buttons added to posts');
        log('⌨️  Press Ctrl+Shift+I for bulk collection');
        log('📊 Console helpers available: window.notionally_investigate');
    }
    
    // Start when page is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeInvestigation);
    } else {
        initializeInvestigation();
    }
    
})();