// ==UserScript==
// @name         notionally - LinkedIn to Notion Saver (with Investigation)
// @namespace    http://tampermonkey.net/
// @version      1.12.0
// @description  v1.12.0 - Unified script with proven Pulse and feed post implementations
// @author       Fredrik Matheson
// @match        https://www.linkedin.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
// @grant        none
// ==/UserScript==

/**
 * Created: 2024-09-07 01:29
 * Version 1.12.0 - Unified script combining v1.9.5 Pulse + v1.11.0 feed posts
 * Version 1.11.0 - Enhanced Pulse article detection with direct button monitoring
 * Version 1.10.0 - Unified script supporting both feed posts AND Pulse articles
 * Version 1.7.5 - Restored working feed post functionality
 * Version 1.7.1 - Fixed dropdown detection and investigation features
 * Version 1.7.0 - Add comment investigation features for v1.2.0 development (broken dropdown detection)
 * Version 1.6.0 - Add comprehensive debug info collection for troubleshooting
 * Version 1.5.9 - Skip client-side URL resolution, let server handle it to avoid CORS
 * Version 1.5.8 - Implement URL polling to track redirects while on same origin
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
    console.log('[notionally v1.12.0] Script loaded on:', window.location.href);
    
    // Check if we're on a LinkedIn redirect page
    if (window.location.hostname === 'www.linkedin.com' && 
        (window.location.pathname.includes('/redir/') || 
         window.location.pathname.includes('/safety/go'))) {
        
        console.log('[notionally] ✅ Redirect page detected!');
        console.log('[notionally] Full URL:', window.location.href);
        console.log('[notionally] Pathname:', window.location.pathname);
        
        // Look for the actual destination URL on the page
        const findDestinationUrl = () => {
            console.log('[notionally] findDestinationUrl called');
            
            // Log all anchors on the page for debugging
            const allAnchors = document.querySelectorAll('a[href]');
            console.log('[notionally] Total anchors found:', allAnchors.length);
            allAnchors.forEach((a, index) => {
                if (!a.href.includes('linkedin.com')) {
                    console.log(`[notionally] Non-LinkedIn anchor ${index}:`, a.href, 'data-tracking:', a.getAttribute('data-tracking-control-name'));
                }
            });
            // LinkedIn shows the destination URL in an anchor tag with specific attributes
            // Priority 1: Look for the button with external_url_click tracking
            const externalUrlButton = document.querySelector('a[data-tracking-control-name="external_url_click"]');
            if (externalUrlButton && externalUrlButton.href && !externalUrlButton.href.includes('linkedin.com')) {
                console.log('[notionally] Found destination URL in external link button:', externalUrlButton.href);
                localStorage.setItem('notionally_last_redirect_url', externalUrlButton.href);
                localStorage.setItem('notionally_last_redirect_time', Date.now().toString());
                return externalUrlButton.href;
            }
            
            // Priority 2: Look for any artdeco-button with non-LinkedIn href
            const artdecoButtons = document.querySelectorAll('a.artdeco-button[href]');
            for (const button of artdecoButtons) {
                if (button.href && !button.href.includes('linkedin.com') && button.href.startsWith('http')) {
                    console.log('[notionally] Found destination URL in button:', button.href);
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
                    console.log('[notionally] Found destination URL:', href);
                    
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
                console.log('[notionally] Found URL in page text:', urlMatch[0]);
                localStorage.setItem('notionally_last_redirect_url', urlMatch[0]);
                localStorage.setItem('notionally_last_redirect_time', Date.now().toString());
                return urlMatch[0];
            }
        };
        
        // Try multiple times as the page loads
        // LinkedIn redirect pages may take a moment to render
        console.log('[notionally] Starting URL capture attempts...');
        const attempts = [0, 100, 300, 500, 800, 1200, 1800, 2500];
        attempts.forEach(delay => {
            setTimeout(() => {
                console.log(`[notionally] Attempt at ${delay}ms`);
                const url = findDestinationUrl();
                if (url) {
                    console.log(`[notionally] ✅ URL captured after ${delay}ms: ${url}`);
                } else {
                    console.log(`[notionally] ❌ No URL found after ${delay}ms`);
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
        investigationClass: 'notionally-investigate-btn',
        investigationMode: true,  // Toggle investigation features
        pulseArticleSupport: true,  // Enable Pulse article support
        debug: true,
        captureMenuHTML: false,  // Set to true to log menu HTML for debugging
        convertImagesToBase64: true,  // Enable image conversion to save to Dropbox
        useTestEndpoint: false  // Set to true to use /test-save instead of /save-post
    };
    
    // ============ PULSE ARTICLE DETECTION ============
    function isPulseArticle() {
        return window.location.pathname.includes('/pulse/');
    }
    
    // Debug log collector for sending to Notion
    const debugLogs = [];
    const SCRIPT_VERSION = '1.12.0';
    
    // Enhanced logging function that also collects logs
    const originalLog = console.log;
    function collectingLog(...args) {
        // Call original console.log
        originalLog('[notionally]', ...args);
        
        // Collect log for sending to server
        const timestamp = new Date().toISOString();
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
        
        debugLogs.push({
            timestamp,
            level: 'INFO',
            message
        });
        
        // Keep only last 200 logs to avoid memory issues
        if (debugLogs.length > 200) {
            debugLogs.shift();
        }
    }
    
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
        if (CONFIG.debug) collectingLog(...args);
    };
    
    const error = (...args) => {
        console.error('[notionally]', ...args);
        // Also collect errors
        const timestamp = new Date().toISOString();
        const message = args.map(arg => {
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch (e) {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
        
        debugLogs.push({
            timestamp,
            level: 'ERROR',
            message
        });
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
            // RESTORED FROM v1.6.0 - THIS METHOD WORKED CORRECTLY
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
                urls: extractedUrls,  // Add extracted URLs
                scriptVersion: SCRIPT_VERSION  // Track which script version saved this post
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
            
            // Add debug info to the request
            const dataWithDebug = {
                ...postData,
                debugInfo: {
                    scriptVersion: SCRIPT_VERSION,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    pageUrl: window.location.href,
                    logs: debugLogs.slice(-100), // Send last 100 logs
                    urlCount: postData.urls?.length || 0,
                    hasShortened: postData.urls?.some(url => url.includes('lnkd.in')) || false
                }
            };
            
            const response = await fetch(`${CONFIG.localServerUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataWithDebug)
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
                        showToast('Server will resolve shortened URLs...', 'info');
                    }
                    
                    // Skip client-side URL resolution - let server handle it
                    // Server has better ability to follow redirects without CORS issues
                    log('Sending raw URLs to server for resolution');
                    
                    /* DISABLED: Client-side URL resolution - keeping code for reference
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
                                    
                                    // Poll the tab's URL to catch the redirect
                                    // This works while the tab is still on linkedin.com domain
                                    let finalUrl = url;
                                    let lastSeenUrl = url;
                                    let pollCount = 0;
                                    const maxPolls = 50; // 5 seconds total
                                    
                                    const pollInterval = setInterval(() => {
                                        pollCount++;
                                        log(`    Poll #${pollCount} at ${pollCount * 100}ms`);
                                        try {
                                            // This will work as long as we're on same origin
                                            const currentUrl = newTab.location.href;
                                            log(`      Current URL: ${currentUrl}`);
                                            
                                            if (currentUrl !== lastSeenUrl) {
                                                log(`      ➡️ URL changed from: ${lastSeenUrl}`);
                                                log(`      ➡️ URL changed to: ${currentUrl}`);
                                                lastSeenUrl = currentUrl;
                                                
                                                // Check if we've reached a final destination
                                                // lnkd.in redirects to linkedin.com/redir which then goes to final URL
                                                if (currentUrl.includes('/redir/') || currentUrl.includes('/safety/go')) {
                                                    log(`      📍 On LinkedIn redirect page, waiting for final redirect...`);
                                                    // Don't close yet, keep polling
                                                } 
                                                // If it's not LinkedIn or lnkd.in anymore, we've reached the destination
                                                else if (!currentUrl.includes('linkedin.com') && 
                                                         !currentUrl.includes('lnkd.in') && 
                                                         currentUrl.startsWith('http')) {
                                                    log(`      ✅ Reached final destination: ${currentUrl}`);
                                                    finalUrl = currentUrl;
                                                    clearInterval(pollInterval);
                                                    setTimeout(() => newTab.close(), 100); // Small delay before closing
                                                }
                                            }
                                        } catch (e) {
                                            // Cross-origin error means we've left the origin
                                            log(`      ❌ Cross-origin error after ${pollCount * 100}ms: ${e.message}`);
                                            log(`      Last accessible URL was: ${lastSeenUrl}`);
                                            
                                            // If we were on a redirect page, wait a bit to see if localStorage gets populated
                                            if (lastSeenUrl.includes('/redir/') || lastSeenUrl.includes('/safety/go')) {
                                                log(`      Waiting 2s for redirect page script to capture URL...`);
                                                setTimeout(() => {
                                                    clearInterval(pollInterval);
                                                    newTab.close();
                                                }, 2000);
                                            } else {
                                                clearInterval(pollInterval);
                                                newTab.close();
                                            }
                                        }
                                        
                                        if (pollCount >= maxPolls) {
                                            log(`    Polling timeout after ${maxPolls * 100}ms`);
                                            clearInterval(pollInterval);
                                            newTab.close();
                                        }
                                    }, 100);
                                    
                                    // Wait for polling to complete
                                    await new Promise(resolve => {
                                        const checkInterval = setInterval(() => {
                                            if (pollCount >= maxPolls || !pollInterval._destroyed) {
                                                clearInterval(checkInterval);
                                                resolve();
                                            }
                                        }, 100);
                                    });
                                    
                                    // Check if we got a resolved URL from polling
                                    let resolved = finalUrl !== url && !finalUrl.includes('lnkd.in');
                                    
                                    if (!resolved) {
                                        // Fallback: Check if our redirect page script captured the URL
                                        log('[notionally] Polling did not resolve, checking localStorage...');
                                        const capturedUrl = localStorage.getItem('notionally_last_redirect_url');
                                        const captureTime = localStorage.getItem('notionally_last_redirect_time');
                                        log(`[notionally] localStorage check - URL: ${capturedUrl}, Time: ${captureTime}`);
                                        
                                        if (capturedUrl && captureTime) {
                                            const timeDiff = Date.now() - parseInt(captureTime);
                                            log(`[notionally] Time difference: ${timeDiff}ms`);
                                            if (timeDiff < 10000) { // Within last 10 seconds
                                                finalUrl = capturedUrl;
                                                resolved = true;
                                                log(`    ✅ Got URL from localStorage: ${finalUrl}`);
                                                
                                                // Clean up
                                                localStorage.removeItem('notionally_last_redirect_url');
                                                localStorage.removeItem('notionally_last_redirect_time');
                                            } else {
                                                log('[notionally] ❌ Captured URL is too old (>10s)');
                                            }
                                        } else {
                                            log('[notionally] ❌ No URL captured in localStorage');
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
                    */ // END DISABLED CLIENT-SIDE URL RESOLUTION
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
    
    // ============================================
    // INVESTIGATION FEATURES (v1.2.0 Development)
    // ============================================
    
    /**
     * Analyze comment structure for investigation
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
        
        // Get post text to check for patterns
        const postText = postElement.textContent.toLowerCase();
        analysis.hasLinkInCommentsPattern = 
            postText.includes('link in comment') || 
            postText.includes('links in comment') ||
            postText.includes('link below') ||
            postText.includes('link 👇') ||
            postText.includes('see comments');
        
        // Extract author info
        const authorSelectors = [
            '.update-components-actor__name span[aria-hidden="true"]',
            '.feed-shared-actor__name',
            '.update-components-actor__title strong'
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
                break;
            }
        }
        
        // Test various comment selectors
        const commentSelectors = [
            '.comments-comments-list',
            '.comments-comment-list__comment-item',
            '[class*="comments-comment-item"]',
            'article[class*="comments"]',
            '.social-details-social-activity__comments-list'
        ];
        
        commentSelectors.forEach(selector => {
            const elements = postElement.querySelectorAll(selector);
            if (elements.length > 0) {
                analysis.hasComments = true;
                analysis.selectors[selector] = {
                    count: elements.length,
                    type: 'comment_container'
                };
                
                // Extract comment data
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
            links: []
        };
        
        // Extract comment text
        const textSelectors = [
            '.comments-comment-item__main-content',
            '.feed-shared-text',
            '[class*="comments-comment-texteditor"]'
        ];
        
        for (const selector of textSelectors) {
            const textElem = commentElement.querySelector(selector);
            if (textElem) {
                info.text = textElem.textContent.trim();
                break;
            }
        }
        
        // If no text found, get all text
        if (!info.text) {
            const clone = commentElement.cloneNode(true);
            // Remove metadata elements
            const removeSelectors = ['.comments-post-meta', '.comments-comment-social-bar'];
            removeSelectors.forEach(sel => {
                clone.querySelectorAll(sel).forEach(el => el.remove());
            });
            info.text = clone.textContent.trim();
        }
        
        // Extract author
        const authorSelectors = [
            '.comments-post-meta__name-text',
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
        
        // Check if author matches post author
        if (postAuthor && info.authorName) {
            info.isPostAuthor = 
                info.authorName === postAuthor.name ||
                (info.authorProfileUrl && postAuthor.profileUrl && 
                 info.authorProfileUrl.split('?')[0] === postAuthor.profileUrl.split('?')[0]);
        }
        
        // Extract links
        const linkElements = commentElement.querySelectorAll('a[href]');
        linkElements.forEach(link => {
            const href = link.href;
            if (href && !href.includes('linkedin.com/in/') && !href.includes('linkedin.com/company/')) {
                info.links.push({
                    url: href,
                    text: link.textContent.trim(),
                    isExternal: !href.includes('linkedin.com')
                });
            }
        });
        
        // Look for URLs in text
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
     * Add investigation option to dropdown menu
     */
    function addInvestigationToDropdown(dropdown, post) {
        // Check if already added
        if (dropdown.querySelector('.notionally-investigate-item')) {
            return;
        }
        
        const menuList = dropdown.querySelector('ul');
        if (!menuList) return;
        
        // Create investigation menu item
        const investigateItem = document.createElement('li');
        investigateItem.className = 'feed-shared-control-menu__item notionally-investigate-item';
        
        investigateItem.innerHTML = `
            <div role="button" class="feed-shared-control-menu__dropdown-item tap-target artdeco-dropdown__item artdeco-dropdown__item--is-dropdown" tabindex="0">
                <div class="ivm-image-view-model flex-shrink-zero mr2">
                    <div class="ivm-view-attr__img-wrapper">
                        🔍
                    </div>
                </div>
                <div class="flex-grow-1 text-align-left">
                    <h5 class="feed-shared-control-menu__headline t-14 t-black t-bold" role="none">
                        Check Comments
                    </h5>
                    <p class="feed-shared-control-menu__sub-headline t-12 t-black t-black--light">
                        Analyze for author links
                    </p>
                </div>
            </div>
        `;
        
        const clickableDiv = investigateItem.querySelector('[role="button"]');
        clickableDiv.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            log('Investigation clicked');
            
            // Close dropdown same way as Save to Notion
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
            
            // Run investigation
            await runInvestigation(post);
        });
        
        // Insert after Save to Notion option if it exists
        const saveOption = dropdown.querySelector('.notionally-menu-item');
        if (saveOption) {
            saveOption.parentNode.insertBefore(investigateItem, saveOption.nextSibling);
        } else {
            // Insert after first item
            menuList.insertBefore(investigateItem, menuList.children[1]);
        }
        
        log('Added Check Comments option to dropdown');
    }
    
    /**
     * Run investigation on a post
     */
    async function runInvestigation(postElement) {
        try {
            // Show toast
            showToast('🔍 Analyzing comments...', 'info');
            
            // Analyze structure
            const analysis = analyzeCommentStructure(postElement);
            
            // Find author comments with links
            const authorComments = analysis.commentData.filter(c => c.isPostAuthor);
            const authorLinks = authorComments.reduce((total, comment) => total + comment.links.length, 0);
            
            // Log to console
            console.group('%c📊 Comment Analysis Results', 'color: #667eea; font-weight: bold; font-size: 14px');
            console.log('Post ID:', analysis.postId);
            console.log('Has "link in comments" pattern:', analysis.hasLinkInCommentsPattern);
            console.log('Total comments found:', analysis.commentData.length);
            console.log('Author comments:', authorComments.length);
            console.log('Links in author comments:', authorLinks);
            
            if (authorComments.length > 0) {
                console.log('Author comments with links:', authorComments);
            }
            
            console.log('Selectors found:', Object.keys(analysis.selectors));
            console.log('Full analysis:', analysis);
            console.groupEnd();
            
            // Send to server for collection
            const investigationData = {
                posts: [{
                    ...analysis,
                    metadata: {
                        url: window.location.href,
                        timestamp: new Date().toISOString()
                    }
                }],
                metadata: {
                    scriptVersion: SCRIPT_VERSION,
                    mode: 'single',
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                }
            };
            
            const response = await fetch(`${CONFIG.localServerUrl}/investigation/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(investigationData)
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }
            
            const result = await response.json();
            log('Investigation data sent:', result);
            
            // Show result toast
            if (authorLinks > 0) {
                showToast(`✨ Found ${authorLinks} link${authorLinks > 1 ? 's' : ''} in author comments!`, 'success');
            } else if (analysis.hasComments) {
                showToast(`📊 ${analysis.commentData.length} comments analyzed, no author links found`, 'info');
            } else {
                showToast('💭 No comments found on this post', 'info');
            }
            
        } catch (error) {
            console.error('[notionally Investigation] Error:', error);
            showToast('❌ Investigation failed: ' + error.message, 'error');
        }
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
    
    // ============ PULSE ARTICLE SUPPORT ============
    
    // Check if we're on a Pulse article page
    function isPulseArticle() {
        return window.location.pathname.includes('/pulse/');
    }
    
    // Extract Pulse article data with enhanced formatting
    function extractPulseArticleData() {
        log('Extracting Pulse article data...');
        
        const articleData = {
            type: 'pulse_article',
            url: window.location.href,
            timestamp: new Date().toISOString()
        };
        
        // Extract title
        const titleElement = document.querySelector('h1.reader-article-header__title span[data-scaffold-immersive-reader-title], h1.reader-article-header__title, h1');
        if (titleElement) {
            articleData.title = titleElement.textContent.trim();
            log('Found article title:', articleData.title);
        }
        
        // Extract author - REQUIRED field
        let author = 'Unknown Author';
        const authorNameElement = document.querySelector('.reader-author-info__content h2.text-heading-medium, .reader-author-info__author-lockup--flex h2');
        if (authorNameElement) {
            author = authorNameElement.textContent.trim().replace(/\s+/g, ' ');
            log('Found author:', author);
        }
        articleData.author = author; // Top-level string (required by server)
        
        // Extract author profile URL
        const authorLinkElement = document.querySelector('.reader-author-info__content a[href*="/in/"], .reader-author-info__container a[href*="/in/"]');
        if (authorLinkElement) {
            const href = authorLinkElement.getAttribute('href');
            if (href) {
                const cleanUrl = href.split('?')[0].split('#')[0];
                articleData.authorProfileUrl = cleanUrl.startsWith('http') ? cleanUrl : 
                                              cleanUrl.startsWith('/') ? `https://www.linkedin.com${cleanUrl}` : 
                                              `https://www.linkedin.com/${cleanUrl}`;
            }
        }
        
        // Extract published date
        const timeElement = document.querySelector('time');
        if (timeElement) {
            articleData.publishedDate = timeElement.getAttribute('datetime');
            articleData.publishedText = timeElement.textContent.trim();
        }
        
        // Extract article content - simple text for now
        const articleContainer = document.querySelector('.article-content, .reader-article-content, [data-test-id*="article-content"], .reader-content article, main article');
        if (articleContainer) {
            // Get text content (required by server)
            articleData.text = articleContainer.textContent.trim();
            articleData.content = articleData.text; // Server uses 'content' field
            
            // Extract images
            const images = articleContainer.querySelectorAll('img');
            if (images.length > 0) {
                articleData.images = Array.from(images).map(img => ({
                    src: img.src,
                    alt: img.alt || '',
                    caption: img.closest('figure')?.querySelector('figcaption')?.textContent.trim()
                }));
            }
        } else {
            // Fallback
            const fallbackContent = document.querySelector('.reader-content, main');
            articleData.text = fallbackContent ? fallbackContent.textContent.trim() : 
                              articleData.title || 'LinkedIn Pulse Article';
            articleData.content = articleData.text;
        }
        
        log('Extracted Pulse article data:', articleData);
        return articleData;
    }
    
    // Observe Pulse article dropdown (from v1.9.5 - WORKING VERSION)
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
            });
        });
        
        dropdownObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        log('Pulse article dropdown observer initialized');
    }
    
    // Add Save to Notion option to Pulse article dropdown
    function addSaveToPulseDropdown(dropdownContent) {
        if (dropdownContent.querySelector('.notionally-pulse-menu-item')) {
            log('Save to Notion already added to Pulse dropdown');
            return;
        }
        
        log('Adding Save to Notion to Pulse article dropdown');
        
        const menuContainer = dropdownContent.querySelector('ul') || dropdownContent;
        
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
            showToast('Saving article to Notion...', 'info');
            
            try {
                const articleData = extractPulseArticleData();
                
                const endpoint = CONFIG.useTestEndpoint ? '/test-save' : '/save-post';
                const response = await fetch(`${CONFIG.localServerUrl}${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(articleData)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    log('Article saved successfully:', result);
                    showToast('✅ Article saved to Notion!', 'success');
                } else {
                    const errorText = await response.text();
                    throw new Error(`Server error: ${errorText}`);
                }
            } catch (err) {
                error('Failed to save article:', err);
                showToast(`❌ Failed: ${err.message}`, 'error');
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
        
        // Insert at the beginning of the menu
        const existingItems = menuContainer.querySelectorAll('.artdeco-dropdown__item, .reader-overflow-options__overflow-item');
        if (existingItems.length > 0) {
            menuContainer.insertBefore(saveMenuItem, existingItems[0]);
        } else {
            menuContainer.appendChild(saveMenuItem);
        }
        
        log('Save to Notion option added to Pulse dropdown');
    }
    
    // Watch for Pulse article dropdown
    function observePulseArticleDropdown() {
        if (!isPulseArticle() || !CONFIG.pulseArticleSupport) return;
        
        log('Setting up Pulse article dropdown observer');
        
        const dropdownObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Check for reader-overflow-options__content
                if (mutation.target.classList?.contains('reader-overflow-options__content')) {
                    if (mutation.addedNodes.length > 0) {
                        log('Pulse dropdown content populated');
                        setTimeout(() => {
                            addSaveToPulseDropdown(mutation.target);
                        }, 50);
                    }
                }
                
                // Check added nodes for dropdown content
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1 && node.classList?.contains('reader-overflow-options__content')) {
                        log('Pulse dropdown content node added');
                        setTimeout(() => {
                            if (node.querySelector('.artdeco-dropdown__item, .reader-overflow-options__overflow-item')) {
                                addSaveToPulseDropdown(node);
                            }
                        }, 100);
                    }
                });
                
                // Watch for class changes indicating dropdown opened
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
    
    // Initialize the script
    async function init() {
        log('Initializing notionally...');
        
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
        
        // For Pulse articles, set up the observer (using v1.9.5 working implementation)
        if (isPulseArticle()) {
            log('📰 Pulse article detected');
            observePulseArticleDropdown();
        }
        
        // Watch for dropdown menu content changes (both feed posts and Pulse articles)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Check for FEED POST dropdown content being populated
                if (mutation.target.classList && mutation.target.classList.contains('feed-shared-control-menu__content')) {
                    if (mutation.addedNodes.length > 0) {
                        // Menu content was added
                        const dropdown = mutation.target;
                        
                        // Capture menu HTML for debugging (if enabled)
                        if (CONFIG.captureMenuHTML) {
                            setTimeout(() => {
                                console.log('[notionally] Dropdown menu HTML captured (enable captureMenuHTML in config to see)');
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
                                    // Add investigation option if enabled
                                    if (CONFIG.investigationMode) {
                                        addInvestigationToDropdown(dropdown, post);
                                    }
                                } else {
                                    log('No menu items found yet, waiting...');
                                    setTimeout(() => {
                                        addSaveToDropdown(dropdown, post);
                                        if (CONFIG.investigationMode) {
                                            addInvestigationToDropdown(dropdown, post);
                                        }
                                    }, 300);
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
                                        // Add investigation option if enabled
                                        if (CONFIG.investigationMode) {
                                            addInvestigationToDropdown(node, post);
                                        }
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
        
        // Check for navigation to Pulse articles (from v1.9.5)
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
        
        // Add initialization marker
        document.body.classList.add('notionally-initialized');
        
        // Console helpers for investigation mode
        if (CONFIG.investigationMode) {
            window.notionally = {
                analyzeCurrentPost: () => {
                    const post = document.querySelector('[data-id]:hover') || 
                                 document.querySelector('[data-id]');
                    if (post) {
                        const analysis = analyzeCommentStructure(post);
                        console.log('Analysis:', analysis);
                        return analysis;
                    } else {
                        console.log('No post found. Hover over a post first.');
                    }
                },
                analyzeAllPosts: () => {
                    const posts = document.querySelectorAll('[data-id]');
                    const analyses = Array.from(posts).map(p => analyzeCommentStructure(p));
                    console.log(`Analyzed ${analyses.length} posts:`, analyses);
                    return analyses;
                },
                testSelectors: () => {
                    const selectors = {
                        comments: [
                            '.comments-comments-list',
                            '.comments-comment-list__comment-item',
                            '[class*="comments-comment-item"]'
                        ],
                        authors: [
                            '.comments-post-meta__name-text',
                            '.comments-post-meta__profile-link'
                        ]
                    };
                    
                    Object.entries(selectors).forEach(([type, sels]) => {
                        console.group(type);
                        sels.forEach(sel => {
                            const elements = document.querySelectorAll(sel);
                            console.log(`${sel}: ${elements.length} found`);
                        });
                        console.groupEnd();
                    });
                }
            };
            
            console.log('%c🔍 notionally Investigation Mode Active', 'color: #667eea; font-weight: bold');
            console.log('Available commands:');
            console.log('  window.notionally.analyzeCurrentPost() - Analyze hovered post');
            console.log('  window.notionally.analyzeAllPosts() - Analyze all visible posts');
            console.log('  window.notionally.testSelectors() - Test comment selectors');
        }
        
        // Initialize Pulse article support if on a Pulse page
        if (isPulseArticle() && CONFIG.pulseArticleSupport) {
            log('📰 Pulse article detected, initializing support...');
            observePulseArticleDropdown();
        }
        
        // Monitor for navigation to Pulse articles
        let lastPath = window.location.pathname;
        setInterval(() => {
            if (window.location.pathname !== lastPath) {
                lastPath = window.location.pathname;
                if (isPulseArticle() && CONFIG.pulseArticleSupport) {
                    log('Navigated to Pulse article');
                    observePulseArticleDropdown();
                }
            }
        }, 1000);
        
        log('notionally initialized successfully');
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
