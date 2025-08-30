// ==UserScript==
// @name         Notionally - LinkedIn to Notion Saver
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Save LinkedIn posts with videos directly to Notion
// @author       Fredrik Matheson
// @match        https://www.linkedin.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // Configuration
    const CONFIG = {
        localServerUrl: 'http://localhost:8765',
        buttonClass: 'notionally-save-btn',
        debug: true
    };
    
    // Utility functions
    const log = (...args) => {
        if (CONFIG.debug) console.log('[Notionally]', ...args);
    };
    
    const error = (...args) => {
        console.error('[Notionally]', ...args);
    };
    
    // Check if local server is running
    async function checkServerStatus() {
        try {
            const response = await fetch(`${CONFIG.localServerUrl}/health`, {
                method: 'GET',
                mode: 'cors'
            });
            return response.ok;
        } catch (err) {
            return false;
        }
    }
    
    // Extract post data from LinkedIn DOM
    function extractPostData(postElement) {
        try {
            // Extract post text
            const textElement = postElement.querySelector('[data-test-id="main-feed-activity-card__commentary"] span[dir="ltr"]') ||
                               postElement.querySelector('.feed-shared-text span[dir="ltr"]') ||
                               postElement.querySelector('[data-test-id="post-text"] span');
            
            const postText = textElement ? textElement.textContent.trim() : '';
            
            // Extract author information
            const authorElement = postElement.querySelector('.feed-shared-actor__name') ||
                                postElement.querySelector('[data-test-id="main-feed-activity-card__actor-name"]');
            
            const author = authorElement ? authorElement.textContent.trim() : 'Unknown Author';
            
            // Extract post URL (from share button or permalink)
            const shareButton = postElement.querySelector('[aria-label*="Share"]') ||
                              postElement.querySelector('[data-test-id="share-via"]');
            
            let postUrl = window.location.href; // Fallback to current page
            
            // Try to extract specific post URL from permalink
            const permalinkElement = postElement.querySelector('a[href*="/posts/"][href*="activity-"]');
            if (permalinkElement) {
                postUrl = new URL(permalinkElement.href, window.location.origin).href;
            }
            
            // Extract media elements
            const videos = Array.from(postElement.querySelectorAll('video')).map(video => ({
                src: video.src,
                poster: video.poster,
                element: video
            }));
            
            const images = Array.from(postElement.querySelectorAll('img[alt]:not([alt=""])')).map(img => ({
                src: img.src,
                alt: img.alt
            }));
            
            // Extract timestamp
            const timeElement = postElement.querySelector('time') ||
                              postElement.querySelector('[data-test-id="main-feed-activity-card__actor-sub-description"] span:last-child');
            
            const timestamp = timeElement ? timeElement.getAttribute('datetime') || timeElement.textContent : new Date().toISOString();
            
            return {
                text: postText,
                author: author,
                url: postUrl,
                timestamp: timestamp,
                media: {
                    videos: videos,
                    images: images
                },
                hasVideo: videos.length > 0
            };
        } catch (err) {
            error('Error extracting post data:', err);
            return null;
        }
    }
    
    // Send post data to local processing app
    async function saveToNotion(postData) {
        try {
            const response = await fetch(`${CONFIG.localServerUrl}/save-post`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData)
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            return result;
        } catch (err) {
            error('Error saving to Notion:', err);
            throw err;
        }
    }
    
    // Create and style the save button
    function createSaveButton(postElement) {
        const button = document.createElement('button');
        button.className = `${CONFIG.buttonClass} artdeco-button artdeco-button--muted artdeco-button--4 artdeco-button--tertiary ember-view`;
        button.innerHTML = `
            <span class="artdeco-button__text">
                📝 Save to Notion
            </span>
        `;
        
        // Style the button to match LinkedIn's design
        button.style.cssText = `
            margin-left: 8px;
            font-size: 14px;
            font-weight: 600;
            color: rgba(0, 0, 0, 0.6);
            background: transparent;
            border: 1px solid rgba(0, 0, 0, 0.15);
            border-radius: 16px;
            padding: 4px 12px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        
        // Hover effects
        button.addEventListener('mouseenter', () => {
            button.style.background = 'rgba(0, 0, 0, 0.08)';
            button.style.borderColor = 'rgba(0, 0, 0, 0.25)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.background = 'transparent';
            button.style.borderColor = 'rgba(0, 0, 0, 0.15)';
        });
        
        return button;
    }
    
    // Update button state during save process
    function updateButtonState(button, state, message = '') {
        const textSpan = button.querySelector('.artdeco-button__text');
        
        switch (state) {
            case 'saving':
                button.disabled = true;
                textSpan.innerHTML = '⏳ Saving...';
                button.style.opacity = '0.6';
                break;
            case 'success':
                textSpan.innerHTML = '✅ Saved!';
                button.style.background = '#10b981';
                button.style.color = 'white';
                button.style.borderColor = '#10b981';
                setTimeout(() => {
                    textSpan.innerHTML = '📝 Save to Notion';
                    button.disabled = false;
                    button.style.cssText = button.style.cssText.replace(/background:[^;]+;|color:[^;]+;|border-color:[^;]+;/g, '');
                    button.style.opacity = '1';
                }, 2000);
                break;
            case 'error':
                textSpan.innerHTML = `❌ Error: ${message}`;
                button.style.background = '#ef4444';
                button.style.color = 'white';
                button.style.borderColor = '#ef4444';
                setTimeout(() => {
                    textSpan.innerHTML = '📝 Save to Notion';
                    button.disabled = false;
                    button.style.cssText = button.style.cssText.replace(/background:[^;]+;|color:[^;]+;|border-color:[^;]+;/g, '');
                    button.style.opacity = '1';
                }, 3000);
                break;
        }
    }
    
    // Add save buttons to LinkedIn posts
    function addSaveButtons() {
        // Find all LinkedIn feed posts
        const posts = document.querySelectorAll('div[data-urn*="activity"]:not([data-notionally-processed])');
        
        posts.forEach(post => {
            // Mark as processed to avoid duplicate buttons
            post.setAttribute('data-notionally-processed', 'true');
            
            // Find the social actions bar (like, comment, share buttons)
            const socialBar = post.querySelector('.social-actions-bar') ||
                            post.querySelector('[data-test-id="social-actions-bar"]') ||
                            post.querySelector('.feed-shared-social-action-bar');
            
            if (socialBar && !socialBar.querySelector(`.${CONFIG.buttonClass}`)) {
                const saveButton = createSaveButton(post);
                
                // Add click handler
                saveButton.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    log('Save button clicked for post');
                    updateButtonState(saveButton, 'saving');
                    
                    try {
                        const postData = extractPostData(post);
                        if (!postData) {
                            throw new Error('Could not extract post data');
                        }
                        
                        log('Extracted post data:', postData);
                        
                        const result = await saveToNotion(postData);
                        log('Save successful:', result);
                        updateButtonState(saveButton, 'success');
                        
                    } catch (err) {
                        error('Save failed:', err);
                        updateButtonState(saveButton, 'error', err.message);
                    }
                });
                
                // Add button to social actions bar
                socialBar.appendChild(saveButton);
                log('Added save button to post');
            }
        });
    }
    
    // Initialize the script
    async function init() {
        log('Initializing Notionally...');
        
        // Check if local server is running
        const serverRunning = await checkServerStatus();
        if (!serverRunning) {
            log('Warning: Local server not detected at', CONFIG.localServerUrl);
            log('Please start the local app with: npm start');
        } else {
            log('Local server detected and ready');
        }
        
        // Add save buttons to existing posts
        addSaveButtons();
        
        // Watch for new posts being loaded (LinkedIn uses infinite scroll)
        const observer = new MutationObserver((mutations) => {
            let shouldCheckForNewPosts = false;
            
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    shouldCheckForNewPosts = true;
                }
            });
            
            if (shouldCheckForNewPosts) {
                setTimeout(addSaveButtons, 500); // Small delay to let LinkedIn finish rendering
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        log('Notionally initialized successfully');
    }
    
    // Wait for page to load, then initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
