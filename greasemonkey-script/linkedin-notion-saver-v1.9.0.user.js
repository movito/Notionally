// ==UserScript==
// @name         Notionally - LinkedIn to Notion Saver (with Pulse Articles)
// @namespace    http://tampermonkey.net/
// @version      1.9.0
// @description  Save LinkedIn posts and Pulse articles directly to Notion
// @author       Fredrik Matheson
// @match        https://www.linkedin.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
// @grant        none
// ==/UserScript==

/**
 * Version 1.9.0 - Full support for LinkedIn Pulse articles with proper dropdown integration
 * Version 1.8.0 - Initial Pulse article support structure
 * Version 1.7.5 - Restored v1.6.0 text extraction method to fix HTML entity handling
 * Version 1.7.1 - Fixed dropdown detection and investigation features
 * Version 1.7.0 - Add comment investigation features for v1.2.0 development
 * Version 1.6.0 - Add comprehensive debug info collection for troubleshooting
 * Version 1.5.9 - Skip client-side URL resolution, let server handle it to avoid CORS
 */

(function() {
    'use strict';
    
    // Log script loading on every page
    console.log('[Notionally v1.9.0] Script loaded on:', window.location.href);
    
    // ============ CONFIGURATION ============
    const CONFIG = {
        serverUrl: 'http://localhost:7777',
        investigationMode: false, // Set to true to enable comment investigation features
        pulseArticleSupport: true, // Enable Pulse article support
        debugMode: true // Enable additional logging
    };
    
    // ============ UTILITIES ============
    function log(...args) {
        if (CONFIG.debugMode) {
            console.log('[Notionally]', ...args);
        }
    }
    
    function error(...args) {
        console.error('[Notionally]', ...args);
    }
    
    // ============ PULSE ARTICLE DETECTION ============
    function isPulseArticle() {
        return window.location.pathname.includes('/pulse/');
    }
    
    function isReaderActionsAvailable() {
        return document.querySelector('.reader-actions') !== null;
    }
    
    // ============ ARTICLE DATA EXTRACTION ============
    function extractPulseArticleData() {
        log('Extracting Pulse article data...');
        
        const articleData = {
            type: 'pulse_article',
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
        
        // Extract title
        const titleElement = document.querySelector('h1');
        if (titleElement) {
            articleData.title = titleElement.textContent.trim();
        }
        
        // Extract author information
        const authorSection = document.querySelector('.author-info-container');
        if (authorSection) {
            const authorName = authorSection.querySelector('.text-body-medium');
            const authorHeadline = authorSection.querySelector('.text-body-small');
            
            articleData.author = {
                name: authorName?.textContent.trim(),
                headline: authorHeadline?.textContent.trim(),
                profileUrl: authorSection.querySelector('a')?.href
            };
        }
        
        // Extract published date
        const timeElement = document.querySelector('time');
        if (timeElement) {
            articleData.publishedDate = timeElement.getAttribute('datetime');
            articleData.publishedText = timeElement.textContent.trim();
        }
        
        // Extract article content
        const articleContainer = document.querySelector('.article-content');
        if (articleContainer) {
            // Get full HTML for server-side processing
            articleData.contentHtml = articleContainer.innerHTML;
            
            // Get text content for preview
            articleData.contentText = articleContainer.textContent.trim();
            
            // Extract images
            const images = articleContainer.querySelectorAll('img');
            articleData.images = Array.from(images).map(img => ({
                src: img.src,
                alt: img.alt || '',
                caption: img.closest('figure')?.querySelector('figcaption')?.textContent.trim()
            }));
        }
        
        // Extract engagement metrics if available
        const socialBar = document.querySelector('.social-details-social-activity');
        if (socialBar) {
            const reactions = socialBar.querySelector('.social-details-social-counts__reactions');
            const comments = socialBar.querySelector('.social-details-social-counts__comments');
            
            articleData.engagement = {
                reactions: reactions?.textContent.trim(),
                comments: comments?.textContent.trim()
            };
        }
        
        // Extract reading time if available
        const readingTime = document.querySelector('.reading-time');
        if (readingTime) {
            articleData.readingTime = readingTime.textContent.trim();
        }
        
        log('Extracted article data:', articleData);
        return articleData;
    }
    
    // ============ PULSE ARTICLE DROPDOWN INTEGRATION ============
    function addSaveToPulseDropdown(dropdownContent) {
        // Check if already added
        if (dropdownContent.querySelector('.notionally-pulse-menu-item')) {
            log('Save to Notion already added to Pulse dropdown');
            return;
        }
        
        log('Adding Save to Notion to Pulse article dropdown');
        
        // Find the menu list
        const menuList = dropdownContent.querySelector('ul');
        if (!menuList) {
            error('Menu list not found in Pulse dropdown');
            return;
        }
        
        // Create menu item for Pulse articles
        const saveMenuItem = document.createElement('li');
        saveMenuItem.className = 'artdeco-dropdown__item notionally-pulse-menu-item';
        
        saveMenuItem.innerHTML = `
            <div role="button" class="display-flex align-items-center full-width" tabindex="0">
                <div class="mr3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="12" y1="18" x2="12" y2="12"></line>
                        <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                </div>
                <div class="flex-grow-1">
                    <div class="t-14 t-black">Save Article to Notion</div>
                    <div class="t-12 t-black--light">Save this article to your database</div>
                </div>
            </div>
        `;
        
        // Add click handler
        saveMenuItem.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            log('Save to Notion clicked for Pulse article');
            
            // Extract article data
            const articleData = extractPulseArticleData();
            
            // Show loading state
            const buttonText = saveMenuItem.querySelector('.t-14');
            const originalText = buttonText.textContent;
            buttonText.textContent = 'Saving...';
            
            try {
                // Send to server
                const response = await fetch(`${CONFIG.serverUrl}/linkedin/save`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(articleData)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    buttonText.textContent = '✓ Saved to Notion';
                    log('Article saved successfully:', result);
                    
                    // Show success notification if available
                    showNotification('Article saved to Notion successfully!', 'success');
                    
                    // Reset text after delay
                    setTimeout(() => {
                        buttonText.textContent = originalText;
                    }, 2000);
                } else {
                    throw new Error(`Server responded with ${response.status}`);
                }
            } catch (err) {
                error('Failed to save article:', err);
                buttonText.textContent = '✗ Failed to save';
                
                showNotification('Failed to save article. Check if the server is running.', 'error');
                
                // Reset text after delay
                setTimeout(() => {
                    buttonText.textContent = originalText;
                }, 2000);
            }
            
            // Close dropdown
            const escEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                code: 'Escape',
                keyCode: 27,
                which: 27,
                bubbles: true
            });
            dropdownContent.dispatchEvent(escEvent);
        });
        
        // Find a good position to insert (after first item or at end)
        const firstItem = menuList.querySelector('li');
        if (firstItem) {
            menuList.insertBefore(saveMenuItem, firstItem.nextSibling);
        } else {
            menuList.appendChild(saveMenuItem);
        }
        
        log('Save to Notion option added to Pulse dropdown');
    }
    
    function observePulseArticleDropdown() {
        if (!isPulseArticle()) return;
        
        log('Setting up Pulse article dropdown observer');
        
        // Method 1: Direct click listener on dropdown trigger
        const setupDropdownListener = () => {
            const readerActions = document.querySelector('.reader-actions');
            if (!readerActions) {
                log('Reader actions container not found yet');
                return false;
            }
            
            const dropdownTrigger = readerActions.querySelector('.artdeco-dropdown__trigger[aria-label*="article options"]');
            if (!dropdownTrigger) {
                log('Dropdown trigger not found yet');
                return false;
            }
            
            // Remove any existing listener
            dropdownTrigger.removeEventListener('click', handleDropdownClick);
            dropdownTrigger.addEventListener('click', handleDropdownClick);
            
            log('Dropdown click listener attached');
            return true;
        };
        
        const handleDropdownClick = () => {
            log('Dropdown trigger clicked');
            // Wait for dropdown content to populate
            setTimeout(() => {
                const dropdownContent = document.querySelector('.reader-overflow-options__content');
                if (dropdownContent && !dropdownContent.querySelector('.notionally-pulse-menu-item')) {
                    addSaveToPulseDropdown(dropdownContent);
                }
            }, 100);
        };
        
        // Try to set up listener immediately
        if (!setupDropdownListener()) {
            // If not ready, wait for DOM changes
            const observer = new MutationObserver((mutations, obs) => {
                if (setupDropdownListener()) {
                    log('Dropdown listener setup successful, stopping observer');
                    obs.disconnect();
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        // Method 2: Also observe for dropdown content appearing
        const dropdownObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Check if reader-overflow-options__content was added
                if (mutation.target.classList?.contains('reader-overflow-options__content')) {
                    if (mutation.addedNodes.length > 0) {
                        log('Pulse dropdown content populated');
                        addSaveToPulseDropdown(mutation.target);
                    }
                }
                
                // Also check added nodes
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList?.contains('reader-overflow-options__content')) {
                        log('Pulse dropdown content node added');
                        setTimeout(() => {
                            if (node.querySelector('ul')) {
                                addSaveToPulseDropdown(node);
                            }
                        }, 50);
                    }
                });
            });
        });
        
        dropdownObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        log('Pulse article dropdown observers initialized');
    }
    
    // ============ NOTIFICATION SYSTEM ============
    function showNotification(message, type = 'info') {
        // Try to use LinkedIn's native toast notification if available
        const toastContainer = document.querySelector('.artdeco-toast-container');
        if (toastContainer) {
            const toast = document.createElement('div');
            toast.className = `artdeco-toast-item artdeco-toast-item--${type === 'success' ? 'success' : 'error'}`;
            toast.innerHTML = `
                <div class="artdeco-toast-item__content">
                    <span>${message}</span>
                </div>
            `;
            toastContainer.appendChild(toast);
            
            setTimeout(() => {
                toast.remove();
            }, 3000);
        } else {
            // Fallback to console log
            log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    // ============ FEED POST SUPPORT (existing functionality) ============
    function extractPostText(postElement) {
        // ... (copy existing extractPostText function from v1.8.0)
        const textContainer = postElement.querySelector('.feed-shared-text, .feed-shared-inline-show-more-text');
        if (!textContainer) {
            log('No text container found');
            return '';
        }
        
        const spans = textContainer.querySelectorAll('span[dir="ltr"]');
        if (spans.length > 0) {
            return Array.from(spans)
                .map(span => span.textContent || '')
                .join('\n')
                .trim();
        }
        
        return textContainer.textContent?.trim() || '';
    }
    
    function extractPostData(postElement) {
        // ... (copy existing extractPostData function from v1.8.0)
        return {
            type: 'feed_post',
            text: extractPostText(postElement),
            timestamp: new Date().toISOString(),
            url: window.location.href
        };
    }
    
    function addSaveToFeedDropdown(dropdown, post) {
        // ... (copy existing addSaveToDropdown function from v1.8.0, renamed for clarity)
        // Check if already added
        if (dropdown.querySelector('.notionally-menu-item')) {
            log('Save to Notion already added');
            return;
        }
        
        const menuList = dropdown.querySelector('ul');
        if (!menuList) {
            error('Menu list not found in dropdown');
            return;
        }
        
        const saveMenuItem = document.createElement('li');
        saveMenuItem.className = 'feed-shared-control-menu__item notionally-menu-item option-save-notion';
        
        saveMenuItem.innerHTML = `
            <div role="button" class="feed-shared-control-menu__dropdown-item tap-target artdeco-dropdown__item artdeco-dropdown__item--is-dropdown" tabindex="0">
                <div class="ivm-image-view-model flex-shrink-zero mr2">
                    <div class="ivm-view-attr__img-wrapper">
                        <svg role="none" aria-hidden="true" class="ivm-view-attr__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                    </div>
                </div>
                <div class="flex-grow-1 text-align-left">
                    <h5 class="feed-shared-control-menu__headline t-14 t-black t-bold" role="none">
                        Save to Notion
                    </h5>
                    <p class="feed-shared-control-menu__sub-headline t-12 t-black t-black--light">
                        Save post to your database
                    </p>
                </div>
            </div>
        `;
        
        saveMenuItem.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            log('Save to Notion clicked from feed dropdown');
            
            const postData = extractPostData(post);
            
            // Send to server
            try {
                const response = await fetch(`${CONFIG.serverUrl}/linkedin/save`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(postData)
                });
                
                if (response.ok) {
                    log('Post saved successfully');
                    showNotification('Post saved to Notion!', 'success');
                } else {
                    throw new Error(`Server responded with ${response.status}`);
                }
            } catch (err) {
                error('Failed to save post:', err);
                showNotification('Failed to save post. Check if the server is running.', 'error');
            }
            
            // Close dropdown
            const escEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                code: 'Escape',
                keyCode: 27,
                which: 27,
                bubbles: true
            });
            dropdown.dispatchEvent(escEvent);
        });
        
        menuList.appendChild(saveMenuItem);
        log('Added Save to Notion option to feed dropdown');
    }
    
    // ============ MAIN INITIALIZATION ============
    async function init() {
        log('Initializing Notionally v1.9.0...');
        
        // Check if local server is running
        try {
            const response = await fetch(`${CONFIG.serverUrl}/health`);
            if (response.ok) {
                log('✅ Local server is running');
            } else {
                error('⚠️ Local server responded but may not be ready');
            }
        } catch (err) {
            error('❌ Local server is not running at', CONFIG.serverUrl);
            error('Please start the server first');
        }
        
        // Check if we're on a Pulse article page
        if (isPulseArticle()) {
            log('📰 Pulse article detected');
            observePulseArticleDropdown();
        }
        
        // Set up observer for feed posts
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Check for feed dropdown content
                if (mutation.target.classList?.contains('feed-shared-control-menu__content')) {
                    if (mutation.addedNodes.length > 0) {
                        const dropdown = mutation.target;
                        const menuButton = dropdown.closest('.feed-shared-control-menu');
                        const post = menuButton?.closest('[data-id]');
                        
                        if (post) {
                            log('Feed dropdown menu content loaded');
                            setTimeout(() => {
                                const menuItems = dropdown.querySelectorAll('.feed-shared-control-menu__item');
                                if (menuItems.length > 0) {
                                    addSaveToFeedDropdown(dropdown, post);
                                }
                            }, 50);
                        }
                    }
                }
                
                // Also check for Pulse article pages on navigation
                if (isPulseArticle() && !document.querySelector('.notionally-pulse-observer-active')) {
                    log('Navigated to Pulse article, setting up observer');
                    document.body.classList.add('notionally-pulse-observer-active');
                    observePulseArticleDropdown();
                } else if (!isPulseArticle()) {
                    document.body.classList.remove('notionally-pulse-observer-active');
                }
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        log('Notionally v1.9.0 initialized successfully');
        log('Features enabled:', {
            feedPosts: true,
            pulseArticles: CONFIG.pulseArticleSupport,
            investigationMode: CONFIG.investigationMode
        });
    }
    
    // Wait for page to load, then initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();