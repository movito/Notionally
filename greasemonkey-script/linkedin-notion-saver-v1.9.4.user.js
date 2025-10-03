// ==UserScript==
// @name         notionally - LinkedIn to Notion Saver (with Pulse Articles)
// @namespace    http://tampermonkey.net/
// @version      1.9.4
// @description  Save LinkedIn posts and Pulse articles directly to Notion
// @author       Fredrik Matheson
// @match        https://www.linkedin.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
// @grant        none
// ==/UserScript==

/**
 * Version 1.9.4 - Fixed Pulse article data extraction to match server requirements
 * Version 1.9.3 - Fixed server configuration (correct port 8765 and endpoint /save-post)
 * Version 1.9.2 - Fixed Pulse article dropdown detection based on debug findings
 * Version 1.9.1 - Debug version with comprehensive logging
 * Version 1.9.0 - Full support for LinkedIn Pulse articles with proper dropdown integration
 * Version 1.8.0 - Initial Pulse article support structure
 * Version 1.7.5 - Restored v1.6.0 text extraction method to fix HTML entity handling
 */

(function() {
    'use strict';
    
    // Log script loading on every page
    console.log('[notionally v1.9.4] Script loaded on:', window.location.href);
    
    // ============ CONFIGURATION ============
    const CONFIG = {
        serverUrl: 'http://localhost:8765',
        investigationMode: false,
        pulseArticleSupport: true,
        debugMode: true
    };
    
    // ============ UTILITIES ============
    function log(...args) {
        if (CONFIG.debugMode) {
            console.log('[notionally]', ...args);
        }
    }
    
    function error(...args) {
        console.error('[notionally]', ...args);
    }
    
    // ============ PULSE ARTICLE DETECTION ============
    function isPulseArticle() {
        return window.location.pathname.includes('/pulse/');
    }
    
    // ============ ARTICLE DATA EXTRACTION ============
    function extractPulseArticleData() {
        log('Extracting Pulse article data...');
        
        const articleData = {
            type: 'pulse_article',
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
        
        // Extract title - based on actual HTML structure provided
        const titleElement = document.querySelector('h1.reader-article-header__title span[data-scaffold-immersive-reader-title], h1.reader-article-header__title, h1');
        if (titleElement) {
            articleData.title = titleElement.textContent.trim();
            log('Found article title:', articleData.title);
        }
        
        // Extract author information - based on actual HTML structure provided
        let author = 'Unknown Author';
        let authorProfileUrl = null;
        let authorHeadline = null;
        
        // Primary selector based on user-provided HTML
        const authorNameElement = document.querySelector('.reader-author-info__content h2.text-heading-medium');
        if (authorNameElement) {
            author = authorNameElement.textContent.trim();
            // Remove any extra whitespace and badges
            author = author.replace(/\s+/g, ' ').trim();
            log('Found author from primary selector:', author);
        } else {
            // Fallback selectors
            const fallbackSelectors = [
                '.reader-author-info__author-lockup--flex h2',
                '.author-info-container h3',
                '.article-author-info .text-body-medium',
                '[data-test-id*="author"] .text-heading-small'
            ];
            
            for (const selector of fallbackSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    author = element.textContent.trim();
                    log('Found author from fallback selector:', selector);
                    break;
                }
            }
        }
        
        // Extract author profile URL
        const authorLinkElement = document.querySelector('.reader-author-info__content a[href*="/in/"], .reader-author-info__container a[href*="/in/"], .reader-author-info__container a[href*="/company/"]');
        if (authorLinkElement) {
            const href = authorLinkElement.getAttribute('href');
            if (href) {
                // Clean up the URL
                const cleanUrl = href.split('?')[0].split('#')[0];
                if (cleanUrl.startsWith('http')) {
                    authorProfileUrl = cleanUrl;
                } else if (cleanUrl.startsWith('/')) {
                    authorProfileUrl = `https://www.linkedin.com${cleanUrl}`;
                } else {
                    authorProfileUrl = `https://www.linkedin.com/${cleanUrl}`;
                }
                log('Found author profile URL:', authorProfileUrl);
            }
        }
        
        // Extract author headline
        const headlineElement = document.querySelector('.reader-author-info__content .artdeco-entity-lockup__subtitle, .reader-author-info__content .t-black--light');
        if (headlineElement) {
            authorHeadline = headlineElement.textContent.trim();
            log('Found author headline:', authorHeadline);
        }
        
        // Set author as top-level string (required by server)
        articleData.author = author;
        articleData.authorProfileUrl = authorProfileUrl;
        articleData.authorHeadline = authorHeadline;
        
        // Extract published date
        const timeElement = document.querySelector('time');
        if (timeElement) {
            articleData.publishedDate = timeElement.getAttribute('datetime');
            articleData.publishedText = timeElement.textContent.trim();
        }
        
        // Extract article content - look for various possible containers
        const articleContainer = document.querySelector('.article-content, .reader-article-content, [data-test-id*="article-content"], .reader-content article, main article');
        if (articleContainer) {
            // Get text content for the main text field (required by server)
            articleData.text = articleContainer.textContent.trim();
            
            // Also store full HTML for potential future use
            articleData.contentHtml = articleContainer.innerHTML;
            
            // Extract images
            const images = articleContainer.querySelectorAll('img');
            articleData.images = Array.from(images).map(img => ({
                src: img.src,
                alt: img.alt || '',
                caption: img.closest('figure')?.querySelector('figcaption')?.textContent.trim()
            }));
            
            // Store images in media format if needed
            if (images.length > 0) {
                articleData.media = {
                    images: articleData.images
                };
            }
        } else {
            // Fallback: try to get any text content from the page
            const fallbackContent = document.querySelector('.reader-content, [data-test-id*="reader"], main');
            if (fallbackContent) {
                articleData.text = fallbackContent.textContent.trim();
            } else {
                // Last resort: use the title as text
                articleData.text = articleData.title || 'LinkedIn Pulse Article';
            }
        }
        
        // Extract engagement metrics if available
        const socialBar = document.querySelector('.social-details-social-activity, .reader-social-bar');
        if (socialBar) {
            const reactions = socialBar.querySelector('[class*="reactions"], [data-test-id*="reactions"]');
            const comments = socialBar.querySelector('[class*="comments"], [data-test-id*="comments"]');
            
            articleData.engagement = {
                reactions: reactions?.textContent.trim(),
                comments: comments?.textContent.trim()
            };
        }
        
        // Extract reading time if available
        const readingTime = document.querySelector('.reading-time, [data-test-id*="reading-time"]');
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
        
        // Find the menu list - it might be a UL or just the dropdown content itself
        let menuContainer = dropdownContent.querySelector('ul');
        if (!menuContainer) {
            // Sometimes items are added directly to the dropdown content
            menuContainer = dropdownContent;
        }
        
        // Create menu item matching the structure found in debug logs
        const saveMenuItem = document.createElement('li');
        saveMenuItem.className = 'artdeco-dropdown__item artdeco-dropdown__item--is-dropdown ember-view reader-overflow-options__overflow-item notionally-pulse-menu-item';
        
        saveMenuItem.innerHTML = `
            <div role="button" class="reader-overflow-options__overflow-item-content full-width display-flex align-items-center" tabindex="0">
                <div class="mr3 flex-shrink-zero">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="12" y1="18" x2="12" y2="12"></line>
                        <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                </div>
                <div class="flex-grow-1">
                    <span class="t-14 t-black t-normal">Save Article to Notion</span>
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
                const response = await fetch(`${CONFIG.serverUrl}/save-post`, {
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
        
        // Find existing menu items to determine insertion point
        const existingItems = menuContainer.querySelectorAll('.artdeco-dropdown__item, .reader-overflow-options__overflow-item');
        
        if (existingItems.length > 0) {
            // Insert after the first item (usually "Copy link")
            const secondItem = existingItems[1] || existingItems[0];
            secondItem.parentNode.insertBefore(saveMenuItem, secondItem.nextSibling);
        } else {
            // No existing items, append to container
            menuContainer.appendChild(saveMenuItem);
        }
        
        log('Save to Notion option added to Pulse dropdown');
    }
    
    function observePulseArticleDropdown() {
        if (!isPulseArticle()) return;
        
        log('Setting up Pulse article dropdown observer');
        
        // Watch for dropdown content appearing and being populated
        const dropdownObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Check for reader-overflow-options__content being modified
                if (mutation.target.classList?.contains('reader-overflow-options__content')) {
                    // Check if content was added (menu items)
                    if (mutation.addedNodes.length > 0) {
                        log('Pulse dropdown content populated');
                        // Small delay to ensure DOM is stable
                        setTimeout(() => {
                            addSaveToPulseDropdown(mutation.target);
                        }, 50);
                    }
                }
                
                // Also check added nodes for dropdown content
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        // Check if it's the dropdown content itself
                        if (node.classList?.contains('reader-overflow-options__content')) {
                            log('Pulse dropdown content node added');
                            // Watch this specific dropdown for content changes
                            const contentObserver = new MutationObserver((contentMutations) => {
                                contentMutations.forEach(contentMutation => {
                                    if (contentMutation.addedNodes.length > 0) {
                                        // Content was added, check if it has menu items
                                        const hasMenuItems = node.querySelector('.artdeco-dropdown__item, .reader-overflow-options__overflow-item');
                                        if (hasMenuItems && !node.querySelector('.notionally-pulse-menu-item')) {
                                            log('Menu items detected, adding Save to Notion');
                                            addSaveToPulseDropdown(node);
                                        }
                                    }
                                });
                            });
                            
                            contentObserver.observe(node, {
                                childList: true,
                                subtree: true
                            });
                            
                            // Check if already has content
                            setTimeout(() => {
                                const hasMenuItems = node.querySelector('.artdeco-dropdown__item, .reader-overflow-options__overflow-item');
                                if (hasMenuItems && !node.querySelector('.notionally-pulse-menu-item')) {
                                    addSaveToPulseDropdown(node);
                                }
                            }, 100);
                        }
                        
                        // Check for dropdown content in subtree
                        const dropdownContent = node.querySelector?.('.reader-overflow-options__content');
                        if (dropdownContent) {
                            log('Found dropdown content in added node');
                            setTimeout(() => {
                                const hasMenuItems = dropdownContent.querySelector('.artdeco-dropdown__item, .reader-overflow-options__overflow-item');
                                if (hasMenuItems && !dropdownContent.querySelector('.notionally-pulse-menu-item')) {
                                    addSaveToPulseDropdown(dropdownContent);
                                }
                            }, 100);
                        }
                    }
                });
                
                // Watch for class changes that indicate dropdown opening
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    if (mutation.target.classList?.contains('artdeco-dropdown__content--is-open') &&
                        mutation.target.classList?.contains('reader-overflow-options__content')) {
                        log('Dropdown opened via class change');
                        setTimeout(() => {
                            if (!mutation.target.querySelector('.notionally-pulse-menu-item')) {
                                addSaveToPulseDropdown(mutation.target);
                            }
                        }, 100);
                    }
                }
            });
        });
        
        dropdownObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
        
        log('Pulse article dropdown observer initialized');
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
        return {
            type: 'feed_post',
            text: extractPostText(postElement),
            timestamp: new Date().toISOString(),
            url: window.location.href
        };
    }
    
    function addSaveToFeedDropdown(dropdown, post) {
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
                const response = await fetch(`${CONFIG.serverUrl}/save-post`, {
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
        log('Initializing notionally v1.9.4...');
        
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
        
        // Set up observer for feed posts and navigation changes
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
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Check for navigation to Pulse articles
        let lastPath = window.location.pathname;
        setInterval(() => {
            if (window.location.pathname !== lastPath) {
                lastPath = window.location.pathname;
                if (isPulseArticle()) {
                    log('Navigated to Pulse article');
                    observePulseArticleDropdown();
                }
            }
        }, 1000);
        
        log('notionally v1.9.4 initialized successfully');
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