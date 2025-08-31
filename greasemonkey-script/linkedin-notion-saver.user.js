// ==UserScript==
// @name         Notionally - LinkedIn to Notion Saver
// @namespace    http://tampermonkey.net/
// @version      1.5.7
// @description  Save LinkedIn posts directly to Notion
// @author       Fredrik Matheson
// @match        https://www.linkedin.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
// @grant        none
// ==/UserScript==

/**
 * Version 1.5.7 - Added comprehensive debugging for redirect page detection
 * Version 1.5.6 - Capture URLs directly from LinkedIn redirect page
 * Version 1.5.5 - Improved URL unfurling with multiple capture methods and longer wait
 * Version 1.5.4 - Added comprehensive debugging for URL extraction and processing
 * Version 1.5.3 - Fixed handling of direct URLs (non-shortened links)
 * Version 1.5.2 - Added browser-based URL unfurling for LinkedIn shortened links
 */

(function() {
    'use strict';
    
    // Log script loading on every page
    console.log('[Notionally] Script loaded on:', window.location.href);
    
    // Check if we're on a LinkedIn redirect page
    if (window.location.hostname === 'www.linkedin.com' && 
        (window.location.pathname.includes('/redir/') || 
         window.location.pathname.includes('/safety/go'))) {
        
        console.log('[Notionally] ✅ Redirect page detected!');
        console.log('[Notionally] Full URL:', window.location.href);
        console.log('[Notionally] Pathname:', window.location.pathname);
        
        // Look for the actual destination URL on the page
        const findDestinationUrl = () => {
            console.log('[Notionally] findDestinationUrl called');
            
            // Log all anchors on the page for debugging
            const allAnchors = document.querySelectorAll('a[href]');
            console.log('[Notionally] Total anchors found:', allAnchors.length);
            allAnchors.forEach((a, index) => {
                if (!a.href.includes('linkedin.com')) {
                    console.log(`[Notionally] Non-LinkedIn anchor ${index}:`, a.href, 'data-tracking:', a.getAttribute('data-tracking-control-name'));
                }
            });
            // LinkedIn shows the destination URL in an anchor tag with specific attributes
            // Priority 1: Look for the button with external_url_click tracking
            const externalUrlButton = document.querySelector('a[data-tracking-control-name="external_url_click"]');
            if (externalUrlButton && externalUrlButton.href && !externalUrlButton.href.includes('linkedin.com')) {
                console.log('[Notionally] Found destination URL in external link button:', externalUrlButton.href);
                localStorage.setItem('notionally_last_redirect_url', externalUrlButton.href);
                localStorage.setItem('notionally_last_redirect_time', Date.now().toString());
                return externalUrlButton.href;
            }
            
            // Priority 2: Look for any artdeco-button with non-LinkedIn href
            const artdecoButtons = document.querySelectorAll('a.artdeco-button[href]');
            for (const button of artdecoButtons) {
                if (button.href && !button.href.includes('linkedin.com') && button.href.startsWith('http')) {
                    console.log('[Notionally] Found destination URL in button:', button.href);
                    localStorage.setItem('notionally_last_redirect_url', button.href);
                    localStorage.setItem('notionally_last_redirect_time', Date.now().toString());
                    return button.href;
                }
            }
            
            // Priority 3: General search for any non-LinkedIn links
            const urlElements = document.querySelectorAll('a[href]');
            for (const elem of urlElements) {
                const href = elem.href;
                if (href && !href.includes('linkedin.com') && !href.includes('lnkd.in') && href.startsWith('http')) {
                    console.log('[Notionally] Found destination URL:', href);
                    
                    // Store it for the main script to retrieve
                    localStorage.setItem('notionally_last_redirect_url', href);
                    localStorage.setItem('notionally_last_redirect_time', Date.now().toString());
                    
                    return href;
                }
            }
            
            // Also check for URLs in the page text
            const pageText = document.body.innerText;
            const urlMatch = pageText.match(/https?:\/\/(?!.*linkedin\.com)[^\s]+/);
            if (urlMatch) {
                console.log('[Notionally] Found URL in page text:', urlMatch[0]);
                localStorage.setItem('notionally_last_redirect_url', urlMatch[0]);
                localStorage.setItem('notionally_last_redirect_time', Date.now().toString());
                return urlMatch[0];
            }
        };
        
        // Try multiple times as the page loads
        // LinkedIn redirect pages may take a moment to render
        console.log('[Notionally] Starting URL capture attempts...');
        const attempts = [0, 100, 300, 500, 800, 1200, 1800, 2500];
        attempts.forEach(delay => {
            setTimeout(() => {
                console.log(`[Notionally] Attempt at ${delay}ms`);
                const url = findDestinationUrl();
                if (url) {
                    console.log(`[Notionally] ✅ URL captured after ${delay}ms: ${url}`);
                } else {
                    console.log(`[Notionally] ❌ No URL found after ${delay}ms`);
                }
            }, delay);
        });
        
        // Don't run the rest of the script on redirect pages
        return;
    }
    
    // Configuration
    const CONFIG = {
        localServerUrl: 'http://localhost:8765',
        buttonClass: 'notionally-save-btn',
        debug: true,
        captureMenuHTML: false,  // Set to true to log menu HTML for debugging
        convertImagesToBase64: true,  // Enable image conversion to save to Dropbox
        useTestEndpoint: false  // Set to true to use /test-save instead of /save-post
    };
    
    // Store captured video URLs
    const capturedVideoUrls = new Map();
    
    // Temporarily disabled network interception - may interfere with LinkedIn
    // Uncomment the block below to enable video URL capture
    /*
    // Intercept network requests to capture video URLs
    (function interceptVideoUrls() {
        // Intercept fetch requests
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0]?.url || args[0];
            
            // Check if this is a video-related URL
            if (typeof url === 'string' && 
                (url.includes('.m3u8') || 
                 url.includes('.mp4') || 
                 url.includes('video') ||
                 url.includes('dms.licdn.com') ||
                 url.includes('media-exp'))) {
                
                log('Captured potential video URL:', url);
                
                // Extract video ID if possible
                const videoIdMatch = url.match(/urn:li:digitalmediaAsset:([^/&]+)/);
                const videoId = videoIdMatch ? videoIdMatch[1] : url;
                
                capturedVideoUrls.set(videoId, url);
            }
            
            return originalFetch.apply(this, args);
        };
        
        // Intercept XMLHttpRequest
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
            if (typeof url === 'string' && 
                (url.includes('.m3u8') || 
                 url.includes('.mp4') || 
                 url.includes('video') ||
                 url.includes('dms.licdn.com') ||
                 url.includes('media-exp'))) {
                
                log('Captured video URL via XHR:', url);
                
                const videoIdMatch = url.match(/urn:li:digitalmediaAsset:([^/&]+)/);
                const videoId = videoIdMatch ? videoIdMatch[1] : url;
                
                capturedVideoUrls.set(videoId, url);
            }
            
            return originalOpen.call(this, method, url, ...rest);
        };
        
        log('Video URL interceptor installed');
    })();
    */
    
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
    
    // Convert image to base64
    async function imageToBase64(imgUrl) {
        try {
            // Use fetch to get the image as the authenticated user
            const response = await fetch(imgUrl);
            const blob = await response.blob();
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (err) {
            log('Error converting image to base64:', err);
            return null;
        }
    }
    
    // Extract URLs from text content
    function extractUrls(text) {
        if (!text) {
            log('extractUrls: No text provided');
            return [];
        }
        
        log('extractUrls: Searching for URLs in text:', text.substring(0, 200) + '...');
        
        // More precise regex for URLs
        // Matches http(s) URLs and common shortened URLs
        const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi;
        
        // Also look for common short domains without protocol
        const shortDomainRegex = /(?:^|\s)((?:lnkd\.in|bit\.ly|tinyurl\.com|ow\.ly|buff\.ly)\/[^\s]+)/gi;
        
        const httpMatches = text.match(urlRegex) || [];
        const shortMatches = text.match(shortDomainRegex) || [];
        
        log(`extractUrls: Found ${httpMatches.length} HTTP URLs:`, httpMatches);
        log(`extractUrls: Found ${shortMatches.length} short domain URLs:`, shortMatches);
        
        // Combine and clean matches
        const allMatches = [
            ...httpMatches,
            ...shortMatches.map(m => 'https://' + m.trim())
        ];
        
        // Filter and validate URLs
        const urls = allMatches
            .map(url => url.trim())
            .filter(url => {
                try {
                    const urlObj = new URL(url);
                    // Filter out common non-link matches
                    return !url.includes('@') && // Not an email
                           !url.endsWith('.') &&   // Not end of sentence
                           url.length > 10 &&       // Not too short
                           urlObj.hostname !== 'localhost'; // Not localhost
                } catch {
                    return false;
                }
            });
        
        // Remove duplicates
        const uniqueUrls = [...new Set(urls)];
        
        log(`extractUrls: Returning ${uniqueUrls.length} unique URLs:`, uniqueUrls);
        return uniqueUrls;
    }
    
    
    // Extract post data from LinkedIn DOM
    function extractPostData(postElement, postUrl = null) {
        try {
            log('Extracting data from post element:', postElement);
            
            // Extract post text - try multiple selectors including the one from your HTML
            const textSelectors = [
                '.update-components-text span[dir="ltr"]',
                '.feed-shared-update-v2__description span[dir="ltr"]',
                '.feed-shared-text__text-view span[dir="ltr"]',
                '.feed-shared-inline-show-more-text span[dir="ltr"]',
                '[data-test-id="main-feed-activity-card__commentary"] span[dir="ltr"]',
                '.feed-shared-text span[dir="ltr"]',
                '.update-components-update-v2__commentary span[dir="ltr"]'
            ];
            
            let textElement = null;
            for (const selector of textSelectors) {
                textElement = postElement.querySelector(selector);
                if (textElement) {
                    log(`Found text with selector: ${selector}`);
                    break;
                }
            }
            
            // Extract text while preserving line breaks
            let postText = '';
            if (textElement) {
                // Get the inner HTML and convert formatting to preserve line breaks
                const html = textElement.innerHTML;
                
                // Convert <br> tags to newlines
                let formattedText = html.replace(/<br\s*\/?>/gi, '\n');
                
                // Convert </p><p> transitions to double newlines for paragraph breaks
                formattedText = formattedText.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');
                
                // Remove remaining HTML tags but keep the text
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = formattedText;
                
                // Get text content which now has proper line breaks
                postText = tempDiv.textContent || tempDiv.innerText || '';
                
                // Clean up excessive whitespace while preserving intentional line breaks
                postText = postText
                    .split('\n')
                    .map(line => line.trim())
                    .join('\n')
                    .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with just 2
                    .trim();
            }
            
            log('Extracted text:', postText ? postText.substring(0, 100) + '...' : 'NO TEXT FOUND');
            log('Text has line breaks:', postText.includes('\n'));
            
            // Extract author information - updated selectors based on your HTML
            const authorSelectors = [
                '.update-components-actor__name span[aria-hidden="true"]',
                '.update-components-actor__title span[aria-hidden="true"]',
                '.feed-shared-actor__name',
                '.update-components-actor__meta-link span[dir="ltr"]'
            ];
            
            let authorElement = null;
            for (const selector of authorSelectors) {
                authorElement = postElement.querySelector(selector);
                if (authorElement) {
                    log(`Found author with selector: ${selector}`);
                    break;
                }
            }
            
            const author = authorElement ? authorElement.textContent.trim() : 'Unknown Author';
            log('Extracted author:', author);
            
            // Extract author profile URL
            let authorProfileUrl = null;
            
            // Try multiple strategies to find the author profile link
            const profileLinkSelectors = [
                // Primary selectors for author links
                '.update-components-actor__container a[href*="/in/"]',
                '.update-components-actor__container a[href*="/company/"]',
                '.update-components-actor__meta a[href*="/in/"]',
                '.update-components-actor__meta a[href*="/company/"]',
                '.feed-shared-actor__container-link[href*="/in/"]',
                '.feed-shared-actor__container-link[href*="/company/"]',
                
                // More general selectors
                'a.app-aware-link[href*="/in/"]',
                'a.app-aware-link[href*="/company/"]',
                
                // Try to find any link near the author name
                '.update-components-actor a[href*="/in/"]',
                '.update-components-actor a[href*="/company/"]',
                
                // Even more general - any profile link in the header area
                '[data-test-id="main-feed-activity-card__entity"] a[href*="/in/"]',
                '[data-test-id="main-feed-activity-card__entity"] a[href*="/company/"]'
            ];
            
            log('Searching for author profile URL...');
            
            for (const selector of profileLinkSelectors) {
                const linkElement = postElement.querySelector(selector);
                if (linkElement) {
                    const href = linkElement.getAttribute('href');
                    log(`  Testing selector: ${selector}`);
                    log(`  Found href: ${href}`);
                    
                    if (href && (href.includes('/in/') || href.includes('/company/'))) {
                        // Clean up the URL - remove query parameters and ensure it's absolute
                        const cleanUrl = href.split('?')[0].split('#')[0];
                        if (cleanUrl.startsWith('http')) {
                            authorProfileUrl = cleanUrl;
                        } else if (cleanUrl.startsWith('/')) {
                            authorProfileUrl = `https://www.linkedin.com${cleanUrl}`;
                        } else {
                            authorProfileUrl = `https://www.linkedin.com/${cleanUrl}`;
                        }
                        log(`✅ Found author profile URL: ${authorProfileUrl}`);
                        break;
                    }
                }
            }
            
            // Fallback: Try to find any anchor tag that wraps or is near the author element
            if (!authorProfileUrl && authorElement) {
                log('Trying fallback: searching near author element...');
                
                // Check if author element is wrapped in a link
                const parentLink = authorElement.closest('a[href*="/in/"], a[href*="/company/"]');
                if (parentLink) {
                    const href = parentLink.getAttribute('href');
                    log(`  Found parent link: ${href}`);
                    const cleanUrl = href.split('?')[0].split('#')[0];
                    if (cleanUrl.startsWith('http')) {
                        authorProfileUrl = cleanUrl;
                    } else if (cleanUrl.startsWith('/')) {
                        authorProfileUrl = `https://www.linkedin.com${cleanUrl}`;
                    } else {
                        authorProfileUrl = `https://www.linkedin.com/${cleanUrl}`;
                    }
                    log(`✅ Found author profile URL via parent: ${authorProfileUrl}`);
                }
            }
            
            if (!authorProfileUrl) {
                log('❌ Could not extract author profile URL - no matching selectors found');
                
                // Debug: Log all links found in the post header area
                const allLinks = postElement.querySelectorAll('.update-components-actor a, .feed-shared-actor a');
                log(`  Debug: Found ${allLinks.length} links in author area:`);
                allLinks.forEach((link, i) => {
                    log(`    Link ${i + 1}: ${link.getAttribute('href')}`);
                });
            }
            
            // Use provided URL or try to extract
            if (!postUrl) {
                // Check for activity ID in data attributes
                const activityUrn = postElement.getAttribute('data-urn') || 
                                  postElement.closest('[data-urn]')?.getAttribute('data-urn');
                
                if (activityUrn && activityUrn.includes('activity')) {
                    const activityId = activityUrn.split(':').pop();
                    postUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`;
                } else {
                    postUrl = window.location.href; // Fallback
                }
            }
            log('Post URL:', postUrl);
            
            // Extract media elements
            // For videos, try to find the actual source URL instead of blob URL
            const videos = Array.from(postElement.querySelectorAll('video')).map(video => {
                let src = video.src || video.querySelector('source')?.src;
                let streamUrl = null;
                
                // Try to find a captured URL for this video
                if (capturedVideoUrls.size > 0) {
                    log('Checking captured video URLs:', capturedVideoUrls);
                    
                    // Try to match by element or container attributes
                    const videoContainer = video.closest('[data-urn]');
                    if (videoContainer) {
                        const urn = videoContainer.getAttribute('data-urn');
                        if (urn) {
                            // Look for URLs that might match this URN
                            for (const [key, url] of capturedVideoUrls.entries()) {
                                if (urn.includes(key) || url.includes(urn)) {
                                    streamUrl = url;
                                    log('Found matching stream URL for video:', url);
                                    break;
                                }
                            }
                        }
                    }
                    
                    // If no match found, use the most recent video URL
                    if (!streamUrl && capturedVideoUrls.size > 0) {
                        const entries = Array.from(capturedVideoUrls.entries());
                        streamUrl = entries[entries.length - 1][1];
                        log('Using most recent captured URL:', streamUrl);
                    }
                }
                
                // If it's a blob URL, try to find the actual video source
                if (src && src.startsWith('blob:')) {
                    // Look for data attributes or other sources
                    const dataSource = video.getAttribute('data-sources');
                    if (dataSource) {
                        try {
                            const sources = JSON.parse(dataSource);
                            // Get the highest quality MP4 source
                            const mp4Source = sources.find(s => s.type === 'video/mp4');
                            if (mp4Source) {
                                src = mp4Source.src;
                            }
                        } catch (e) {
                            log('Could not parse video data-sources');
                        }
                    }
                    
                    // If still blob, try to find video container with data
                    if (src.startsWith('blob:')) {
                        const container = video.closest('[data-video-url]');
                        if (container) {
                            src = container.getAttribute('data-video-url');
                        }
                    }
                    
                    // Last resort: check if there's a progressive download URL
                    if (src.startsWith('blob:')) {
                        const videoContainer = video.closest('.feed-shared-update-v2__video-container, .video-js');
                        if (videoContainer) {
                            const progressiveUrl = videoContainer.getAttribute('data-progressive-url');
                            if (progressiveUrl) {
                                src = progressiveUrl;
                            }
                        }
                    }
                }
                
                return {
                    src: streamUrl || src,  // Prefer stream URL if we have it
                    blobSrc: src,  // Keep the original blob URL as backup
                    poster: video.poster,
                    element: video,
                    isBlob: src && src.startsWith('blob:'),
                    hasStreamUrl: !!streamUrl
                };
            }).filter(v => v.src);
            
            log('Found videos:', videos.length);
            if (videos.length > 0) {
                const withStreamUrls = videos.filter(v => v.hasStreamUrl).length;
                log(`Videos with stream URLs: ${withStreamUrls}/${videos.length}`);
                if (videos.some(v => v.isBlob && !v.hasStreamUrl)) {
                    log('Warning: Some videos only have blob URLs. Trying to capture stream URLs...');
                }
            }
            
            const images = Array.from(postElement.querySelectorAll('.update-components-image img, .feed-shared-image img'))
                          .filter(img => img.src && !img.src.includes('emoji'))
                          .map(img => ({
                              src: img.src,
                              alt: img.alt || ''
                          }));
            log('Found images:', images.length);
            
            // Extract timestamp
            const timeElement = postElement.querySelector('time') ||
                              postElement.querySelector('.update-components-actor__sub-description span');
            
            const timestamp = timeElement ? 
                            (timeElement.getAttribute('datetime') || new Date().toISOString()) : 
                            new Date().toISOString();
            
            // Extract URLs from the post text
            log('\n==== URL EXTRACTION DEBUG ====');
            log('Post text length:', postText?.length || 0);
            log('Post text preview:', postText?.substring(0, 300));
            const extractedUrls = extractUrls(postText);
            log('URLs extracted from post text:', extractedUrls);
            log('Number of URLs extracted:', extractedUrls.length);
            log('==== END URL EXTRACTION ====\n');
            
            const result = {
                text: postText,
                author: author,
                authorProfileUrl: authorProfileUrl,  // Add author profile URL
                url: postUrl,
                timestamp: timestamp,
                media: {
                    videos: videos,
                    images: images
                },
                hasVideo: videos.length > 0,
                urls: extractedUrls  // Add extracted URLs
            };
            
            log('Final extracted data:', result);
            return result;
            
        } catch (err) {
            error('Error extracting post data:', err);
            return null;
        }
    }
    
    // Send post data to local processing app
    async function saveToNotion(postData, endpoint = '/save-post') {
        try {
            log(`Sending to endpoint: ${endpoint}`);
            const response = await fetch(`${CONFIG.localServerUrl}${endpoint}`, {
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
    
    // Add save option to post dropdown menu
    function addSaveToDropdown(dropdown, post) {
        // Check if we already added the option
        if (dropdown.querySelector('.notionally-menu-item')) {
            log('Save to Notion option already exists');
            return;
        }
        
        // Find the menu UL element
        const menuList = dropdown.querySelector('ul');
        if (!menuList) {
            log('Could not find menu list');
            return;
        }
        
        // Find the "Copy link to post" item to clone its structure
        const copyLinkItem = dropdown.querySelector('.option-share-via') || 
                           dropdown.querySelector('li:has(h5:contains("Copy link"))') ||
                           menuList.children[1]; // Fallback to second item
        
        if (!copyLinkItem) {
            log('Could not find item to clone');
            return;
        }
        
        // Create our menu item by cloning the structure
        const saveMenuItem = document.createElement('li');
        saveMenuItem.className = 'feed-shared-control-menu__item notionally-menu-item option-save-notion';
        
        // Create the inner structure
        saveMenuItem.innerHTML = `
            <div role="button" class="feed-shared-control-menu__dropdown-item tap-target artdeco-dropdown__item artdeco-dropdown__item--is-dropdown" tabindex="0">
                <div class="ivm-image-view-model flex-shrink-zero mr2">
                    <div class="ivm-view-attr__img-wrapper">
                        <svg role="none" aria-hidden="true" class="ivm-view-attr__icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H8v-2h4v2zm4-4H8v-2h8v2zm0-4H8V7h8v2z" fill="currentColor"/>
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
        
        // Get the clickable div inside
        const clickableDiv = saveMenuItem.querySelector('[role="button"]');
        
        // Add click handler
        clickableDiv.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            log('Save to Notion clicked from dropdown');
            
            // Find and click the "Copy link to post" option to get the URL
            const copyLinkButton = dropdown.querySelector('.option-share-via [role="button"]');
            let postUrl = null;
            
            if (copyLinkButton) {
                try {
                    log('Clicking Copy Link to Post button...');
                    
                    // Save original clipboard content
                    const originalClipboard = await navigator.clipboard.readText().catch(() => '');
                    
                    // Click copy link
                    copyLinkButton.click();
                    
                    // Wait for clipboard to update
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    // Read the URL from clipboard
                    const rawUrl = await navigator.clipboard.readText().catch(() => null);
                    
                    if (rawUrl && rawUrl.includes('linkedin.com')) {
                        // Clean tracking parameters from URL
                        const url = new URL(rawUrl);
                        // Keep only the pathname up to the activity ID
                        const activityMatch = url.pathname.match(/\/feed\/update\/urn:li:activity:\d+/);
                        if (activityMatch) {
                            postUrl = `https://www.linkedin.com${activityMatch[0]}/`;
                        } else {
                            // Fallback: remove all query parameters
                            postUrl = `${url.origin}${url.pathname}`;
                        }
                        log('Cleaned post URL:', postUrl);
                    } else {
                        log('Invalid or missing URL from clipboard:', rawUrl);
                    }
                    
                    // Restore original clipboard if it wasn't empty
                    if (originalClipboard && originalClipboard !== rawUrl) {
                        setTimeout(() => {
                            navigator.clipboard.writeText(originalClipboard).catch(() => {});
                        }, 500);
                    }
                } catch (err) {
                    log('Could not capture URL from clipboard:', err);
                }
            } else {
                log('Copy Link button not found in dropdown');
            }
            
            if (!postUrl) {
                log('Failed to get post URL, using fallback');
                postUrl = window.location.href;
            }
            
            // Close the dropdown
            const escEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                code: 'Escape',
                keyCode: 27,
                bubbles: true
            });
            dropdown.dispatchEvent(escEvent);
            
            // Alternative close method
            const menuButton = document.querySelector('button[aria-expanded="true"][aria-label*="Open control menu"]');
            if (menuButton) {
                menuButton.click();
            }
            
            // Show saving indicator
            showToast('Saving to Notion...', 'info');
            
            try {
                log('Post element:', post);
                log('Post URL captured:', postUrl);
                
                const postData = extractPostData(post, postUrl);
                log('Extracted post data:', postData);
                
                if (!postData) {
                    throw new Error('extractPostData returned null');
                }
                
                if (!postData.text && !postData.media?.videos?.length) {
                    log('Post data has no text or videos:', {
                        text: postData.text,
                        videos: postData.media?.videos
                    });
                    throw new Error('Post must have text content or videos');
                }
                
                // Unfurl URLs in browser before sending to server
                log('\n==== URL PROCESSING DEBUG ====');
                log('postData.urls:', postData.urls);
                log('Number of URLs to process:', postData.urls?.length || 0);
                
                if (postData.urls?.length > 0) {
                    log(`Found ${postData.urls.length} URLs to process`);
                    postData.urls.forEach((url, i) => {
                        log(`  URL ${i + 1}: ${url}`);
                    });
                    
                    // Check if we have any shortened URLs that need resolving
                    const hasShortened = postData.urls.some(url => url.includes('lnkd.in'));
                    log('Has shortened URLs:', hasShortened);
                    if (hasShortened) {
                        showToast('Resolving shortened URLs...', 'info');
                    }
                    
                    const resolvedUrls = [];
                    for (const url of postData.urls) {
                        if (url.includes('lnkd.in')) {
                            log(`  Unfurling: ${url}`);
                            
                            try {
                                // Save current clipboard
                                const originalClipboard = await navigator.clipboard.readText().catch(() => '');
                                
                                // Open the URL in a new tab
                                const newTab = window.open(url, '_blank');
                                
                                if (newTab) {
                                    log(`    Tab opened, waiting for redirect...`);
                                    showToast(`Resolving URL ${postData.urls.indexOf(url) + 1}/${postData.urls.length}...`, 'info');
                                    
                                    // Clear localStorage before opening
                                    localStorage.removeItem('notionally_last_redirect_url');
                                    localStorage.removeItem('notionally_last_redirect_time');
                                    
                                    // Wait longer for LinkedIn's two-step redirect to complete
                                    // LinkedIn does: lnkd.in -> linkedin.com/redir -> final URL
                                    await new Promise(resolve => setTimeout(resolve, 5000));
                                    
                                    // Try multiple methods to get the URL
                                    let finalUrl = url;
                                    let resolved = false;
                                    
                                    // Method 0: Check if our redirect page script captured the URL
                                    log('[Notionally] Checking localStorage for captured URL...');
                                    const capturedUrl = localStorage.getItem('notionally_last_redirect_url');
                                    const captureTime = localStorage.getItem('notionally_last_redirect_time');
                                    log(`[Notionally] localStorage check - URL: ${capturedUrl}, Time: ${captureTime}`);
                                    
                                    if (capturedUrl && captureTime) {
                                        const timeDiff = Date.now() - parseInt(captureTime);
                                        log(`[Notionally] Time difference: ${timeDiff}ms`);
                                        if (timeDiff < 10000) { // Within last 10 seconds
                                            finalUrl = capturedUrl;
                                            resolved = true;
                                            log(`    ✅ Got URL from redirect page: ${finalUrl}`);
                                            
                                            // Clean up
                                            localStorage.removeItem('notionally_last_redirect_url');
                                            localStorage.removeItem('notionally_last_redirect_time');
                                        } else {
                                            log('[Notionally] ❌ Captured URL is too old (>10s)');
                                        }
                                    } else {
                                        log('[Notionally] ❌ No URL captured in localStorage');
                                    }
                                    
                                    // Method 1: Try to read location (might work on same origin)
                                    if (!resolved) {
                                        try {
                                            finalUrl = newTab.location.href;
                                            if (finalUrl && !finalUrl.includes('lnkd.in')) {
                                                resolved = true;
                                                log(`    ✅ Got URL via location: ${finalUrl}`);
                                            }
                                        } catch (e) {
                                            log(`    ⚠️ Cannot read location (cross-origin)`);
                                        }
                                    }
                                    
                                    // Method 2: Execute script to copy URL to clipboard
                                    if (!resolved) {
                                        try {
                                            // Try to inject a script that copies the URL
                                            newTab.eval(`navigator.clipboard.writeText(window.location.href)`);
                                            await new Promise(resolve => setTimeout(resolve, 500));
                                            
                                            const clipboardUrl = await navigator.clipboard.readText();
                                            if (clipboardUrl && clipboardUrl !== originalClipboard && !clipboardUrl.includes('lnkd.in')) {
                                                finalUrl = clipboardUrl;
                                                resolved = true;
                                                log(`    ✅ Got URL via clipboard: ${finalUrl}`);
                                            }
                                        } catch (e) {
                                            log(`    ⚠️ Cannot inject script`);
                                        }
                                    }
                                    
                                    // Close the tab
                                    try {
                                        newTab.close();
                                    } catch (e) {
                                        log(`    ⚠️ Could not close tab`);
                                    }
                                    
                                    // Restore original clipboard
                                    if (originalClipboard) {
                                        navigator.clipboard.writeText(originalClipboard).catch(() => {});
                                    }
                                    
                                    resolvedUrls.push({
                                        original: url,
                                        resolved: finalUrl,
                                        wasShortened: true,
                                        wasResolved: resolved
                                    });
                                    
                                    if (!resolved) {
                                        log(`    ⚠️ Could not resolve URL, using original`);
                                    }
                                } else {
                                    log(`    ❌ Popup blocked`);
                                    resolvedUrls.push({
                                        original: url,
                                        resolved: url,
                                        wasShortened: true,
                                        wasResolved: false
                                    });
                                }
                            } catch (err) {
                                log(`    Error during unfurling: ${err.message}`);
                                resolvedUrls.push({
                                    original: url,
                                    resolved: url,
                                    wasShortened: true,
                                    wasResolved: false
                                });
                            }
                        } else {
                            // Direct URL that doesn't need unfurling
                            log(`  Direct URL (no unfurling needed): ${url}`);
                            resolvedUrls.push({
                                original: url,
                                resolved: url,
                                wasShortened: false
                            });
                        }
                    }
                    
                    // Replace urls with processedUrls for server
                    postData.processedUrls = resolvedUrls;
                    delete postData.urls; // Remove raw URLs
                    
                    log(`Processed ${resolvedUrls.length} URLs`);
                    log('ProcessedUrls being sent to server:', postData.processedUrls);
                } else {
                    log('No URLs found in post to process');
                }
                log('==== END URL PROCESSING ====\n');
                
                // Convert images to base64 for transfer (if enabled)
                if (CONFIG.convertImagesToBase64 && postData.media?.images?.length > 0) {
                    showToast('Processing images...', 'info');
                    log(`Converting ${postData.media.images.length} images to base64...`);
                    
                    for (let i = 0; i < postData.media.images.length; i++) {
                        const image = postData.media.images[i];
                        if (image.src) {
                            const base64 = await imageToBase64(image.src);
                            if (base64) {
                                image.base64 = base64;
                                log(`Converted image ${i + 1}/${postData.media.images.length}`);
                            } else {
                                log(`Failed to convert image ${i + 1}`);
                            }
                        }
                    }
                } else if (postData.media?.images?.length > 0) {
                    log(`Found ${postData.media.images.length} images (base64 conversion disabled)`);
                }
                
                // Use test endpoint if configured
                log('\n==== SENDING TO SERVER ====');
                const endpoint = CONFIG.useTestEndpoint ? '/test-save' : '/save-post';
                log('Endpoint:', endpoint);
                log('Post data keys:', Object.keys(postData));
                log('Has processedUrls:', !!postData.processedUrls);
                log('ProcessedUrls count:', postData.processedUrls?.length || 0);
                if (postData.processedUrls?.length > 0) {
                    log('ProcessedUrls details:', JSON.stringify(postData.processedUrls, null, 2));
                }
                
                const result = await saveToNotion(postData, endpoint);
                log('Server response:', result);
                log('==== END SERVER SEND ====\n');
                log('Save successful:', result);
                showToast('✅ Saved to Notion!', 'success');
                
            } catch (err) {
                error('Save failed:', err);
                showToast(`❌ Error: ${err.message}`, 'error');
            }
        });
        
        // Insert after "Save" option (first item) or at the beginning
        const saveOption = menuList.querySelector('.option-save');
        if (saveOption) {
            saveOption.parentNode.insertBefore(saveMenuItem, saveOption.nextSibling);
        } else {
            menuList.insertBefore(saveMenuItem, menuList.firstChild);
        }
        
        log('Added Save to Notion option to dropdown');
    }
    
    // Show toast notification
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            border-radius: 8px;
            font-weight: 600;
            z-index: 10000;
            animation: slideUp 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // Add CSS animations
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideUp {
                from { transform: translate(-50%, 100%); opacity: 0; }
                to { transform: translate(-50%, 0); opacity: 1; }
            }
            @keyframes slideDown {
                from { transform: translate(-50%, 0); opacity: 1; }
                to { transform: translate(-50%, 100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Mark posts as processed (for tracking purposes only)
    function markPostsAsProcessed() {
        // Find all LinkedIn feed posts
        const posts = document.querySelectorAll('div[data-urn*="activity"]:not([data-notionally-processed])');
        
        posts.forEach(post => {
            // Mark as processed to track which posts we've seen
            post.setAttribute('data-notionally-processed', 'true');
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
        
        // Add CSS animations
        addStyles();
        
        // Mark existing posts as processed
        markPostsAsProcessed();
        
        // Watch for dropdown menu content changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Check for dropdown content being populated
                if (mutation.target.classList && mutation.target.classList.contains('feed-shared-control-menu__content')) {
                    if (mutation.addedNodes.length > 0) {
                        // Menu content was added
                        const dropdown = mutation.target;
                        
                        // Capture menu HTML for debugging (if enabled)
                        if (CONFIG.captureMenuHTML) {
                            setTimeout(() => {
                                console.log('[Notionally] Dropdown menu HTML captured (enable captureMenuHTML in config to see)');
                            }, 200);
                        }
                        
                        const menuButton = document.querySelector('button[aria-expanded="true"][aria-label*="Open control menu"]');
                        const post = menuButton?.closest('.fie-impression-container') || 
                                   menuButton?.closest('[data-urn*="activity"]');
                        
                        if (post) {
                            log('Dropdown menu content loaded for post');
                            // Wait longer to ensure content is fully loaded
                            setTimeout(() => {
                                const menuItems = dropdown.querySelectorAll('[role="menuitem"], .feed-shared-control-menu__item, .artdeco-dropdown__item');
                                if (menuItems.length > 0) {
                                    addSaveToDropdown(dropdown, post);
                                } else {
                                    log('No menu items found yet, waiting...');
                                    setTimeout(() => addSaveToDropdown(dropdown, post), 300);
                                }
                            }, 200);
                        }
                    }
                }
                
                // Also check for any new dropdown elements
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        // Check if it's a dropdown content div
                        if (node.classList && node.classList.contains('feed-shared-control-menu__content')) {
                            const menuButton = document.querySelector('button[aria-expanded="true"][aria-label*="Open control menu"]');
                            const post = menuButton?.closest('.fie-impression-container') || 
                                       menuButton?.closest('[data-urn*="activity"]');
                            
                            if (post) {
                                log('Found new dropdown content node');
                                // Wait for content to populate
                                setTimeout(() => {
                                    const menuItems = node.querySelectorAll('[role="menuitem"], .feed-shared-control-menu__item, .artdeco-dropdown__item');
                                    if (menuItems.length > 0) {
                                        addSaveToDropdown(node, post);
                                    }
                                }, 200);
                            }
                        }
                    }
                });
            });
            
            // Mark any new posts
            markPostsAsProcessed();
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
