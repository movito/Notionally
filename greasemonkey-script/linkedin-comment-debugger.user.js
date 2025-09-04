// ==UserScript==
// @name         Notionally - LinkedIn Comment Debugger
// @namespace    http://tampermonkey.net/
// @version      1.0.0-debug
// @description  Enhanced debugging for LinkedIn comment detection
// @author       Fredrik Matheson
// @match        https://www.linkedin.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
// @grant        none
// ==/UserScript==

/**
 * Enhanced Comment Debugger
 * This version sends comprehensive telemetry to help identify why comments aren't detected
 */

(function() {
    'use strict';
    
    const SERVER_URL = 'http://localhost:8765';
    
    // Enhanced logging with telemetry
    const telemetryData = [];
    
    function log(message, data = null) {
        console.log(`[Comment Debugger] ${message}`, data || '');
        telemetryData.push({
            timestamp: Date.now(),
            message,
            data
        });
    }
    
    // Send telemetry to server
    async function sendTelemetry(postData) {
        try {
            const response = await fetch(`${SERVER_URL}/investigation/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    posts: [postData],
                    metadata: {
                        timestamp: new Date().toISOString(),
                        url: window.location.href,
                        userAgent: navigator.userAgent,
                        scriptVersion: '1.0.0-debug-telemetry'
                    }
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                log('Telemetry sent successfully', result);
                return result;
            }
        } catch (error) {
            log('Failed to send telemetry', error);
        }
    }
    
    // Capture full DOM snapshot of an element
    function captureDOMSnapshot(element, maxDepth = 3) {
        const snapshot = {
            tagName: element.tagName,
            className: element.className,
            id: element.id,
            attributes: {},
            text: element.textContent?.substring(0, 100),
            children: []
        };
        
        // Capture all attributes
        for (let attr of element.attributes || []) {
            snapshot.attributes[attr.name] = attr.value;
        }
        
        // Recursively capture children (limited depth)
        if (maxDepth > 0 && element.children) {
            for (let child of element.children) {
                // Skip script and style tags
                if (child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE') {
                    snapshot.children.push(captureDOMSnapshot(child, maxDepth - 1));
                }
            }
        }
        
        return snapshot;
    }
    
    // Aggressively search for anything comment-related
    function findAllCommentElements(postElement) {
        const results = {
            byClassName: [],
            byAttribute: [],
            byText: [],
            byAriaLabel: [],
            byDataTestId: [],
            potentialContainers: []
        };
        
        // Search by class name containing 'comment'
        const byClass = postElement.querySelectorAll('[class*="comment" i]');
        byClass.forEach(el => {
            results.byClassName.push({
                className: el.className,
                tagName: el.tagName,
                hasText: el.textContent.length > 0,
                childCount: el.children.length,
                snapshot: captureDOMSnapshot(el, 1)
            });
        });
        
        // Search by any attribute containing 'comment'
        const allElements = postElement.querySelectorAll('*');
        allElements.forEach(el => {
            for (let attr of el.attributes) {
                if (attr.value.toLowerCase().includes('comment')) {
                    results.byAttribute.push({
                        attributeName: attr.name,
                        attributeValue: attr.value,
                        tagName: el.tagName,
                        className: el.className
                    });
                    break;
                }
            }
        });
        
        // Search by aria-label
        const byAria = postElement.querySelectorAll('[aria-label*="comment" i]');
        byAria.forEach(el => {
            results.byAriaLabel.push({
                ariaLabel: el.getAttribute('aria-label'),
                tagName: el.tagName,
                className: el.className
            });
        });
        
        // Search by data-test-id
        const byTestId = postElement.querySelectorAll('[data-test-id*="comment" i]');
        byTestId.forEach(el => {
            results.byDataTestId.push({
                dataTestId: el.getAttribute('data-test-id'),
                tagName: el.tagName,
                className: el.className
            });
        });
        
        // Look for elements that might be comment containers even without 'comment' in the name
        const potentialSelectors = [
            '.social-details-social-activity',
            '.feed-shared-social-actions',
            '[aria-label*="social" i]',
            '[class*="social" i]',
            '.update-v2-social-activity',
            '[data-test-id*="social" i]',
            'section',
            '[role="group"]',
            '[role="article"] > div > div'
        ];
        
        potentialSelectors.forEach(selector => {
            try {
                const elements = postElement.querySelectorAll(selector);
                elements.forEach(el => {
                    // Check if this element or its children contain comment-like text
                    const text = el.textContent.toLowerCase();
                    if (text.includes('comment') || text.includes('reply') || text.includes('response')) {
                        results.potentialContainers.push({
                            selector,
                            className: el.className,
                            tagName: el.tagName,
                            textSnippet: el.textContent.substring(0, 200),
                            childCount: el.children.length,
                            snapshot: captureDOMSnapshot(el, 2)
                        });
                    }
                });
            } catch (e) {
                // Invalid selector, skip
            }
        });
        
        return results;
    }
    
    // Check if comments might be lazy-loaded
    function checkLazyLoading(postElement) {
        const lazyIndicators = {
            hasShowMoreButton: false,
            hasLoadingSpinner: false,
            hasPlaceholder: false,
            buttons: []
        };
        
        // Look for "Show more" or "Load comments" buttons
        const buttonSelectors = [
            'button',
            '[role="button"]',
            '[aria-label*="more" i]',
            '[aria-label*="show" i]',
            '[aria-label*="load" i]',
            '[aria-label*="comment" i]'
        ];
        
        buttonSelectors.forEach(selector => {
            const buttons = postElement.querySelectorAll(selector);
            buttons.forEach(btn => {
                const text = btn.textContent.toLowerCase();
                const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
                
                if (text.includes('more') || text.includes('show') || text.includes('load') ||
                    text.includes('comment') || ariaLabel.includes('comment')) {
                    lazyIndicators.buttons.push({
                        text: btn.textContent.trim(),
                        ariaLabel: btn.getAttribute('aria-label'),
                        className: btn.className,
                        isVisible: btn.offsetParent !== null
                    });
                    lazyIndicators.hasShowMoreButton = true;
                }
            });
        });
        
        // Look for loading indicators
        const spinners = postElement.querySelectorAll('[class*="loading" i], [class*="spinner" i], [aria-label*="loading" i]');
        lazyIndicators.hasLoadingSpinner = spinners.length > 0;
        
        // Look for placeholder text
        const placeholders = postElement.querySelectorAll('[class*="placeholder" i]');
        lazyIndicators.hasPlaceholder = placeholders.length > 0;
        
        return lazyIndicators;
    }
    
    // Main investigation function
    function investigatePost(postElement, postIndex) {
        log(`Investigating post ${postIndex}`);
        
        const investigation = {
            index: postIndex,
            timestamp: new Date().toISOString(),
            postHTML: {
                length: postElement.innerHTML.length,
                snippet: postElement.innerHTML.substring(0, 1000)
            },
            domSnapshot: captureDOMSnapshot(postElement, 3),
            commentSearch: findAllCommentElements(postElement),
            lazyLoading: checkLazyLoading(postElement),
            selectors: {},
            metrics: {
                totalElements: postElement.querySelectorAll('*').length,
                divCount: postElement.querySelectorAll('div').length,
                sectionCount: postElement.querySelectorAll('section').length,
                buttonCount: postElement.querySelectorAll('button').length
            }
        };
        
        // Test specific selectors and report what's found
        const selectorsToTest = [
            '.comments-comments-list',
            '.comments-comment-list',
            '.comments-comment-item',
            '.social-details-social-activity',
            '.feed-shared-social-actions',
            '.update-v2-social-activity',
            '[aria-label*="comment"]',
            '[data-test-id*="comment"]',
            '.comment-item',
            '[class*="comments-container"]',
            '[class*="comment-thread"]'
        ];
        
        selectorsToTest.forEach(selector => {
            try {
                const elements = postElement.querySelectorAll(selector);
                if (elements.length > 0) {
                    investigation.selectors[selector] = {
                        count: elements.length,
                        firstElement: {
                            className: elements[0].className,
                            tagName: elements[0].tagName,
                            hasChildren: elements[0].children.length > 0,
                            textLength: elements[0].textContent.length
                        }
                    };
                }
            } catch (e) {
                // Invalid selector
            }
        });
        
        // Check post text for "link in comments" pattern
        const postText = postElement.textContent.toLowerCase();
        investigation.hasLinkInCommentsPattern = 
            postText.includes('link in comment') ||
            postText.includes('links in comment') ||
            postText.includes('link below') ||
            postText.includes('link 👇') ||
            postText.includes('link ⬇');
        
        return investigation;
    }
    
    // Add investigation button to posts
    function addInvestigationButton(post) {
        // Check if button already exists
        if (post.querySelector('.comment-debug-button')) return;
        
        const button = document.createElement('button');
        button.className = 'comment-debug-button';
        button.innerHTML = '🔍 Debug Comments';
        button.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: #ff6b6b;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            z-index: 1000;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            button.textContent = '⏳ Investigating...';
            button.disabled = true;
            
            // Get post index
            const allPosts = document.querySelectorAll('[data-id][class*="feed-shared-update"], .fie-impression-container');
            const postIndex = Array.from(allPosts).indexOf(post);
            
            // Run investigation
            const investigation = investigatePost(post, postIndex);
            
            // Add telemetry
            investigation.telemetry = telemetryData.slice(-20); // Last 20 log entries
            
            // Send to server
            const result = await sendTelemetry(investigation);
            
            // Show results
            console.log('[Comment Debugger] Investigation complete:', investigation);
            
            // Create detailed alert
            const summary = `
Debug Results for Post ${postIndex + 1}:

Elements with "comment" in class: ${investigation.commentSearch.byClassName.length}
Elements with "comment" in attributes: ${investigation.commentSearch.byAttribute.length}
Elements with "comment" in aria-label: ${investigation.commentSearch.byAriaLabel.length}
Potential containers found: ${investigation.commentSearch.potentialContainers.length}

Lazy loading indicators:
- Show more button: ${investigation.lazyLoading.hasShowMoreButton}
- Buttons found: ${investigation.lazyLoading.buttons.length}

DOM Metrics:
- Total elements: ${investigation.metrics.totalElements}
- Div count: ${investigation.metrics.divCount}
- Button count: ${investigation.metrics.buttonCount}

Has "link in comments" text: ${investigation.hasLinkInCommentsPattern}

Data sent to server. Check console for full details.
            `;
            
            alert(summary.trim());
            
            button.textContent = '🔍 Debug Again';
            button.disabled = false;
        });
        
        // Add button to post
        post.style.position = 'relative';
        post.appendChild(button);
    }
    
    // Watch for posts and add debug buttons
    function watchForPosts() {
        const observer = new MutationObserver(() => {
            const posts = document.querySelectorAll('[data-id][class*="feed-shared-update"], .fie-impression-container');
            posts.forEach(post => {
                addInvestigationButton(post);
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Initial scan
        const posts = document.querySelectorAll('[data-id][class*="feed-shared-update"], .fie-impression-container');
        posts.forEach(post => {
            addInvestigationButton(post);
        });
    }
    
    // Initialize
    log('LinkedIn Comment Debugger initialized');
    
    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', watchForPosts);
    } else {
        watchForPosts();
    }
    
    // Global debug function
    window.debugComments = function(postIndex = 0) {
        const posts = document.querySelectorAll('[data-id][class*="feed-shared-update"], .fie-impression-container');
        if (posts[postIndex]) {
            const investigation = investigatePost(posts[postIndex], postIndex);
            console.log('Investigation results:', investigation);
            sendTelemetry(investigation);
            return investigation;
        } else {
            console.log('Post not found at index', postIndex);
            return null;
        }
    };
    
    console.log('%c🔍 Comment Debugger Active', 'background: #ff6b6b; color: white; font-size: 16px; padding: 5px;');
    console.log('Red debug buttons added to each post');
    console.log('Click to investigate why comments aren\'t detected');
    console.log('Or use: window.debugComments(postIndex) in console');
    
})();