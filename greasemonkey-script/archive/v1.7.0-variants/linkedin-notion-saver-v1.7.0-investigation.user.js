// ==UserScript==
// @name         notionally - Investigation Mode
// @namespace    http://tampermonkey.net/
// @version      1.7.0-investigation
// @description  Investigation version with comment extraction debugging
// @author       Fredrik Matheson
// @match        https://www.linkedin.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
// @grant        none
// ==/UserScript==

/**
 * Version 1.7.0-investigation - Adds "Save and check comments" button for v1.2.0 feature development
 * 
 * This version maintains all existing functionality and adds investigation features
 * for comment extraction development.
 */

(function() {
    'use strict';
    
    // ============================================
    // INVESTIGATION CONFIGURATION
    // ============================================
    const INVESTIGATION_MODE = true;
    const SERVER_URL = 'http://localhost:8765';
    
    // Debug logging
    function log(...args) {
        console.log('[notionally Investigation]', ...args);
    }
    
    // ============================================
    // COPY ALL EXISTING CODE FROM MAIN SCRIPT
    // ============================================
    // [Copy the entire content of linkedin-notion-saver.user.js here]
    // This ensures all existing functionality continues to work
    
    // ... [EXISTING CODE WILL BE HERE] ...
    
    // ============================================
    // INVESTIGATION FEATURES - ADDED FOR v1.2.0
    // ============================================
    
    /**
     * Analyze comment structure for a post
     */
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
            postText.includes('link ⬇');
        
        // Extract author info from main post
        const authorSelectors = [
            '.update-components-actor__name',
            '.feed-shared-actor__name',
            '.update-components-actor__title strong',
            '[data-control-name="actor"] span[aria-hidden="true"]'
        ];
        
        for (const selector of authorSelectors) {
            const elem = postElement.querySelector(selector);
            if (elem) {
                analysis.authorInfo = {
                    selector: selector,
                    name: elem.textContent.trim(),
                    profileUrl: elem.closest('a')?.href || null
                };
                log('Found author:', analysis.authorInfo);
                break;
            }
        }
        
        // Test various comment container selectors
        const commentSelectors = [
            '.comments-comments-list',
            '[aria-label*="comment" i]',
            '.feed-shared-comments-container',
            '.social-details-social-activity',
            'div[data-test-id*="comments-module"]',
            '.comments-comment-list',
            '[class*="comments-comment-item"]',
            'article[class*="comment"]'
        ];
        
        commentSelectors.forEach(selector => {
            const elements = postElement.querySelectorAll(selector);
            if (elements.length > 0) {
                analysis.hasComments = true;
                analysis.selectors[selector] = {
                    count: elements.length,
                    firstElement: {
                        tagName: elements[0].tagName,
                        className: elements[0].className,
                        innerHTML: elements[0].innerHTML.substring(0, 200)
                    }
                };
                
                // Try to extract comment data
                elements.forEach((elem, index) => {
                    const commentInfo = extractCommentInfo(elem, analysis.authorInfo);
                    if (commentInfo) {
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
    
    /**
     * Extract information from a comment element
     */
    function extractCommentInfo(commentElement, postAuthor) {
        const info = {
            text: '',
            authorName: '',
            authorProfileUrl: '',
            isPostAuthor: false,
            links: [],
            timestamp: null
        };
        
        // Extract comment text
        const textSelectors = [
            '.comments-comment-item__main-content',
            '.comments-comment-texteditor',
            '[data-test-id="comments-comment-texteditor"]',
            '.feed-shared-inline-show-more-text'
        ];
        
        for (const selector of textSelectors) {
            const textElem = commentElement.querySelector(selector);
            if (textElem) {
                info.text = textElem.textContent.trim();
                break;
            }
        }
        
        // Extract comment author
        const authorSelectors = [
            '.comments-post-meta__name',
            '.comments-comment-item__author',
            'span.comments-post-meta__name-text',
            '[class*="comment"] [class*="author"]'
        ];
        
        for (const selector of authorSelectors) {
            const authorElem = commentElement.querySelector(selector);
            if (authorElem) {
                info.authorName = authorElem.textContent.trim();
                info.authorProfileUrl = authorElem.closest('a')?.href || '';
                break;
            }
        }
        
        // Check if comment is from post author
        if (postAuthor && info.authorName) {
            info.isPostAuthor = 
                info.authorName === postAuthor.name ||
                info.authorProfileUrl === postAuthor.profileUrl;
        }
        
        // Extract links from comment
        const linkElements = commentElement.querySelectorAll('a[href]');
        linkElements.forEach(link => {
            const href = link.href;
            if (href && !href.includes('linkedin.com/in/') && href !== '#') {
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
    
    /**
     * Create the investigation button
     */
    function createInvestigationButton() {
        const button = document.createElement('button');
        button.textContent = '🔍 Save and check comments';
        button.className = 'save-to-notion-btn investigation-mode';
        button.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 1000;
            background-color: #ff6b35;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = '#e55a2b';
            button.style.transform = 'translateY(-1px)';
            button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = '#ff6b35';
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });
        
        return button;
    }
    
    /**
     * Handle investigation button click
     */
    async function handleInvestigationClick(button, postElement) {
        log('Investigation button clicked');
        
        // Update button state
        button.textContent = '🔄 Analyzing...';
        button.disabled = true;
        button.style.backgroundColor = '#ffa500';
        
        try {
            // Extract regular post data first
            const postData = extractPostData(postElement);
            
            // Analyze comment structure
            const commentAnalysis = analyzeCommentStructure(postElement);
            
            // Combine data
            const investigationData = {
                postData,
                commentAnalysis,
                metadata: {
                    scriptVersion: '1.7.0-investigation',
                    timestamp: new Date().toISOString(),
                    url: window.location.href
                }
            };
            
            log('Investigation data collected:', investigationData);
            
            // Try to save the post normally first
            const saveResponse = await fetch(`${SERVER_URL}/save-post`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(postData)
            });
            
            if (!saveResponse.ok) {
                throw new Error(`Save failed: ${saveResponse.statusText}`);
            }
            
            const saveResult = await saveResponse.json();
            log('Post saved:', saveResult);
            
            // Send investigation data to special endpoint
            const investigationResponse = await fetch(`${SERVER_URL}/investigation/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    posts: [investigationData],
                    metadata: {
                        url: window.location.href,
                        timestamp: new Date().toISOString(),
                        mode: 'single'
                    }
                })
            });
            
            if (!investigationResponse.ok) {
                throw new Error(`Investigation failed: ${investigationResponse.statusText}`);
            }
            
            const investigationResult = await investigationResponse.json();
            log('Investigation data sent:', investigationResult);
            
            // Update button to show success
            button.textContent = '✅ Saved & Analyzed';
            button.style.backgroundColor = '#4caf50';
            
            // Show analysis summary
            if (commentAnalysis.hasComments) {
                const authorComments = commentAnalysis.commentData.filter(c => c.isPostAuthor);
                const summary = `
Found ${commentAnalysis.commentData.length} comments
Author comments: ${authorComments.length}
Links found: ${authorComments.reduce((sum, c) => sum + c.links.length, 0)}
                `.trim();
                
                button.title = summary;
                log('Analysis summary:', summary);
                
                // If we found author comments with links, highlight them
                if (authorComments.some(c => c.links.length > 0)) {
                    button.textContent = '✅ Found author links!';
                    button.style.backgroundColor = '#9c27b0';
                }
            }
            
        } catch (error) {
            log('Error during investigation:', error);
            button.textContent = '❌ Investigation failed';
            button.style.backgroundColor = '#f44336';
            button.title = error.message;
        } finally {
            // Reset button after delay
            setTimeout(() => {
                button.disabled = false;
                button.textContent = '🔍 Save and check comments';
                button.style.backgroundColor = '#ff6b35';
                button.title = '';
            }, 3000);
        }
    }
    
    /**
     * Add investigation buttons to posts
     */
    function addInvestigationButtons() {
        const posts = document.querySelectorAll('[data-id][class*="feed-shared-update"]:not(.investigation-processed)');
        
        posts.forEach(post => {
            post.classList.add('investigation-processed');
            
            // Check if post already has a regular button
            const existingButton = post.querySelector('.save-to-notion-btn:not(.investigation-mode)');
            
            if (existingButton) {
                // Add investigation button next to existing button
                const investigationBtn = createInvestigationButton();
                investigationBtn.style.right = '150px'; // Position to the left of regular button
                
                investigationBtn.addEventListener('click', () => {
                    handleInvestigationClick(investigationBtn, post);
                });
                
                post.style.position = 'relative';
                post.appendChild(investigationBtn);
            }
        });
    }
    
    // ============================================
    // BULK COLLECTION MODE
    // ============================================
    
    /**
     * Collect data from all visible posts
     */
    async function collectAllVisiblePosts() {
        log('Starting bulk collection...');
        
        const posts = document.querySelectorAll('[data-id][class*="feed-shared-update"]');
        const investigationData = {
            posts: [],
            metadata: {
                url: window.location.href,
                timestamp: new Date().toISOString(),
                postCount: posts.length,
                mode: 'bulk'
            }
        };
        
        posts.forEach((post, index) => {
            if (index < 20) { // Limit to first 20 posts
                const analysis = analyzeCommentStructure(post);
                investigationData.posts.push({
                    index,
                    ...analysis
                });
            }
        });
        
        log('Collected data from', investigationData.posts.length, 'posts');
        
        // Send to server
        try {
            const response = await fetch(`${SERVER_URL}/investigation/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(investigationData)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to send: ${response.statusText}`);
            }
            
            const result = await response.json();
            log('Bulk data sent successfully:', result);
            
            // Copy summary to clipboard
            const summary = JSON.stringify(result.summary, null, 2);
            navigator.clipboard.writeText(summary).then(() => {
                log('Summary copied to clipboard');
            });
            
            return result;
        } catch (error) {
            log('Error sending bulk data:', error);
            throw error;
        }
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    function init() {
        log('Investigation mode initializing...');
        
        // Add investigation buttons on initial load
        setTimeout(() => {
            addInvestigationButtons();
        }, 2000);
        
        // Watch for new posts
        const observer = new MutationObserver(() => {
            addInvestigationButtons();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Add keyboard shortcut for bulk collection
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                log('Bulk collection triggered');
                collectAllVisiblePosts().then(result => {
                    alert(`Collected data from ${result.summary.postsAnalyzed} posts. Check console for details.`);
                }).catch(error => {
                    alert(`Collection failed: ${error.message}`);
                });
            }
        });
        
        // Console helpers
        window.notionally_investigation = {
            collectAll: collectAllVisiblePosts,
            analyzePost: (index = 0) => {
                const posts = document.querySelectorAll('[data-id][class*="feed-shared-update"]');
                if (posts[index]) {
                    return analyzeCommentStructure(posts[index]);
                }
                return null;
            },
            findAuthorComments: () => {
                const results = [];
                const posts = document.querySelectorAll('[data-id][class*="feed-shared-update"]');
                posts.forEach((post, index) => {
                    const analysis = analyzeCommentStructure(post);
                    if (analysis.commentData) {
                        const authorComments = analysis.commentData.filter(c => c.isPostAuthor);
                        if (authorComments.length > 0) {
                            results.push({
                                postIndex: index,
                                authorComments
                            });
                        }
                    }
                });
                return results;
            }
        };
        
        log('Investigation mode ready!');
        log('Keyboard shortcut: Ctrl+Shift+D for bulk collection');
        log('Console commands available:');
        log('- notionally_investigation.collectAll()');
        log('- notionally_investigation.analyzePost(index)');
        log('- notionally_investigation.findAuthorComments()');
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();