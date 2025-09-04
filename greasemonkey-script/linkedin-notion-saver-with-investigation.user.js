// ==UserScript==
// @name         Notionally - LinkedIn to Notion Saver (with Investigation)
// @namespace    http://tampermonkey.net/
// @version      1.7.0
// @description  Save LinkedIn posts directly to Notion with comment investigation features
// @author       Fredrik Matheson
// @match        https://www.linkedin.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
// @grant        none
// ==/UserScript==

/**
 * Version 1.7.0 - Add comment investigation features for v1.2.0 development
 * Version 1.6.0 - Add comprehensive debug info collection for troubleshooting
 * 
 * This version includes BOTH:
 * 1. All existing Save to Notion functionality (unchanged)
 * 2. New investigation button for comment analysis
 */

(function() {
    'use strict';
    
    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = {
        serverUrl: 'http://localhost:8765',
        buttonClass: 'save-to-notion-btn',
        investigationClass: 'investigate-comments-btn',
        investigationMode: true, // Toggle investigation features
        debug: true
    };
    
    // ============================================
    // EXISTING FUNCTIONALITY (UNCHANGED)
    // ============================================
    
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
        let attempts = 0;
        const maxAttempts = 20; // Try for up to 10 seconds
        
        const tryCapture = () => {
            attempts++;
            console.log(`[Notionally] Capture attempt ${attempts}/${maxAttempts}`);
            
            const url = findDestinationUrl();
            if (url) {
                console.log('[Notionally] ✅ Successfully captured destination URL:', url);
                console.log('[Notionally] URL has been stored in localStorage for main script');
            } else if (attempts < maxAttempts) {
                setTimeout(tryCapture, 500); // Try again in 500ms
            } else {
                console.log('[Notionally] ❌ Could not capture destination URL after', maxAttempts, 'attempts');
                console.log('[Notionally] Page might not be a standard redirect page');
            }
        };
        
        // Start capture attempts
        tryCapture();
        
        // Don't continue with the rest of the script on redirect pages
        return;
    }
    
    // Only run on LinkedIn feed pages
    if (!window.location.pathname.includes('/feed') && !window.location.pathname.includes('/detail')) {
        console.log('[Notionally] Not on feed or detail page, skipping');
        return;
    }
    
    console.log('[Notionally] Running on feed/detail page');
    
    // Debug function for detailed logging
    function log(...args) {
        if (CONFIG.debug) {
            console.log('[Notionally Debug]', ...args);
        }
    }
    
    // Helper function to extract URLs from text
    function extractUrls(text) {
        if (!text) return [];
        
        // Updated regex to catch more URL formats
        const urlRegex = /(?:(?:https?:\/\/)?(?:www\.)?(?:lnkd\.in\/[a-zA-Z0-9_-]+|linkedin\.com\/redir[^"\s]*|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.)+[a-zA-Z]{2,}(?:\/[^"\s]*)?)/gi;
        const matches = text.match(urlRegex) || [];
        
        // Filter and clean URLs
        const urls = matches
            .map(url => {
                // Add protocol if missing
                if (!url.startsWith('http')) {
                    url = 'https://' + url;
                }
                return url;
            })
            .filter(url => {
                // Filter out LinkedIn profile and company URLs, but keep shortened links and external URLs
                return !url.includes('linkedin.com/in/') && 
                       !url.includes('linkedin.com/company/') &&
                       !url.includes('linkedin.com/feed/') &&
                       !url.includes('linkedin.com/posts/') &&
                       (url.includes('lnkd.in') || !url.includes('linkedin.com'));
            });
        
        // Remove duplicates
        return [...new Set(urls)];
    }
    
    // Function to extract video metadata
    function extractVideoMetadata(videoElement) {
        const metadata = {
            duration: videoElement.duration,
            currentTime: videoElement.currentTime,
            paused: videoElement.paused,
            muted: videoElement.muted,
            volume: videoElement.volume,
            readyState: videoElement.readyState,
            networkState: videoElement.networkState,
            videoWidth: videoElement.videoWidth,
            videoHeight: videoElement.videoHeight,
            attributes: {}
        };
        
        // Capture all attributes
        for (let attr of videoElement.attributes) {
            metadata.attributes[attr.name] = attr.value;
        }
        
        return metadata;
    }
    
    // Function to capture comprehensive debug info
    function captureDebugInfo(postElement) {
        const debugInfo = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            postClasses: postElement.className,
            postId: postElement.getAttribute('data-id'),
            hasVideos: false,
            videoElements: [],
            textSelectors: {},
            authorSelectors: {},
            mediaSelectors: {},
            domStructure: {}
        };
        
        // Check for videos
        const videos = postElement.querySelectorAll('video');
        debugInfo.hasVideos = videos.length > 0;
        
        if (videos.length > 0) {
            videos.forEach((video, index) => {
                debugInfo.videoElements.push({
                    index,
                    src: video.src,
                    currentSrc: video.currentSrc,
                    sources: Array.from(video.querySelectorAll('source')).map(s => ({
                        src: s.src,
                        type: s.type
                    })),
                    metadata: extractVideoMetadata(video),
                    parentClasses: video.parentElement?.className
                });
            });
        }
        
        // Test various selectors
        const textSelectors = [
            '.update-components-text span[dir="ltr"]',
            '.feed-shared-update-v2__description span[dir="ltr"]',
            '.feed-shared-text__text-view span[dir="ltr"]'
        ];
        
        textSelectors.forEach(selector => {
            const elem = postElement.querySelector(selector);
            debugInfo.textSelectors[selector] = elem ? 'found' : 'not found';
        });
        
        // Check DOM structure
        debugInfo.domStructure = {
            depth: 0,
            childrenCount: postElement.children.length,
            classNames: Array.from(postElement.classList)
        };
        
        return debugInfo;
    }
    
    // Main function to extract post data
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
                const textWithBreaks = html
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<\/p><p>/gi, '\n\n')
                    .replace(/<\/div><div>/gi, '\n');
                
                // Create a temporary element to extract text
                const temp = document.createElement('div');
                temp.innerHTML = textWithBreaks;
                postText = temp.textContent || temp.innerText || '';
                
                // Clean up extra whitespace while preserving intentional line breaks
                postText = postText
                    .split('\n')
                    .map(line => line.trim())
                    .join('\n')
                    .replace(/\n{3,}/g, '\n\n'); // Replace 3+ newlines with just 2
            } else {
                // Fallback: try to get any text from the post
                const anyText = postElement.querySelector('.feed-shared-text, .update-components-text');
                if (anyText) {
                    postText = anyText.innerText || anyText.textContent || '';
                }
            }
            log('Extracted text (first 200 chars):', postText.substring(0, 200));
            
            // Extract author - Updated selectors based on YOUR HTML
            const authorSelectors = [
                '.update-components-actor__title strong', // From your HTML
                '.update-components-actor__name',
                '.feed-shared-actor__name',
                '.update-components-actor__title',
                '[data-control-name="actor"] span'
            ];
            
            let author = '';
            for (const selector of authorSelectors) {
                const authorElement = postElement.querySelector(selector);
                if (authorElement) {
                    author = authorElement.textContent.trim();
                    log(`Found author with selector: ${selector}`, author);
                    break;
                }
            }
            
            // Extract author profile URL - Get the link that contains the author name
            let authorProfileUrl = '';
            const authorLink = postElement.querySelector('.update-components-actor__container a, .feed-shared-actor__container-link');
            if (authorLink) {
                authorProfileUrl = authorLink.href;
                log('Found author profile URL:', authorProfileUrl);
            }
            
            // Get post URL if not provided
            if (!postUrl) {
                // Updated: Look for the share button or dropdown menu first
                const menuButton = postElement.querySelector('[aria-label*="Open control menu"], [aria-label*="More actions"]');
                if (menuButton) {
                    // The post URL might be in a data attribute or we need to construct it
                    const postId = postElement.getAttribute('data-id');
                    if (postId) {
                        postUrl = `https://www.linkedin.com/feed/update/${postId}`;
                    }
                }
                
                // Fallback: try to find any link to the post
                if (!postUrl) {
                    const activityLink = postElement.querySelector('a[href*="/detail/"], a[href*="/ugcPost/"]');
                    if (activityLink) {
                        postUrl = activityLink.href;
                    }
                }
                
                log('Extracted post URL:', postUrl);
            }
            
            // Try to capture stream URLs from video elements
            const videoElements = postElement.querySelectorAll('video');
            videoElements.forEach((video, index) => {
                log(`Analyzing video ${index + 1}:`, {
                    src: video.src,
                    currentSrc: video.currentSrc,
                    readyState: video.readyState,
                    networkState: video.networkState
                });
                
                // Try to extract from data attributes or nearby elements
                const container = video.closest('[data-sponsored="false"], .feed-shared-update-v2');
                if (container) {
                    const allDataAttributes = [];
                    const elements = container.querySelectorAll('[data-sources], [data-video-url], [data-playlist]');
                    elements.forEach(el => {
                        for (let attr of el.attributes) {
                            if (attr.name.startsWith('data-') && attr.value.includes('http')) {
                                allDataAttributes.push({
                                    name: attr.name,
                                    value: attr.value
                                });
                            }
                        }
                    });
                    
                    if (allDataAttributes.length > 0) {
                        log(`Found data attributes with URLs:`, allDataAttributes);
                    }
                }
            });
            
            // Extract videos with improved source detection
            const videos = Array.from(postElement.querySelectorAll('video')).map(video => {
                const src = video.src || video.currentSrc;
                
                // Try to find the actual stream URL
                let streamUrl = null;
                
                // Method 1: Check for source elements
                const sourceElement = video.querySelector('source');
                if (sourceElement) {
                    streamUrl = sourceElement.src;
                }
                
                // Method 2: Check data attributes
                if (!streamUrl && video.dataset.sources) {
                    try {
                        const sources = JSON.parse(video.dataset.sources);
                        if (sources && sources.length > 0) {
                            streamUrl = sources[0].src || sources[0].url;
                        }
                    } catch (e) {
                        log('Failed to parse data-sources:', e);
                    }
                }
                
                // Method 3: Check for playlist/manifest URLs
                if (!streamUrl && video.dataset.playlistUrl) {
                    streamUrl = video.dataset.playlistUrl;
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
            
        } catch (error) {
            console.error('[Notionally] Error extracting post data:', error);
            // Include debug info in error case
            const debugInfo = captureDebugInfo(postElement);
            throw new Error(`Extraction failed: ${error.message}. Debug info: ${JSON.stringify(debugInfo)}`);
        }
    }
    
    // [REST OF THE EXISTING FUNCTIONS REMAIN THE SAME - createSaveButton, addSaveToDropdown, etc.]
    // ... [Include all the existing functionality here] ...
    
    // ============================================
    // NEW INVESTIGATION FEATURES (v1.2.0)
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
            '.update-components-actor__name',
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
        investigateItem.className = 'notionally-investigate-item';
        investigateItem.innerHTML = `
            <div role="button" tabindex="0" class="artdeco-dropdown__item artdeco-dropdown__item--is-dropdown ember-view" style="cursor: pointer;">
                <div style="display: flex; align-items: center; padding: 8px 12px;">
                    <div style="margin-right: 8px;">
                        🔍
                    </div>
                    <div style="flex-grow: 1;">
                        <div style="font-weight: 600; font-size: 14px;">
                            Check Comments
                        </div>
                        <div style="font-size: 12px; color: #666;">
                            Analyze for author links
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const clickableDiv = investigateItem.querySelector('[role="button"]');
        clickableDiv.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            log('Investigation clicked');
            
            // Close dropdown
            dropdown.style.display = 'none';
            
            // Run investigation
            await runInvestigation(post);
        });
        
        // Insert after Save to Notion option if it exists
        const saveOption = dropdown.querySelector('.notionally-menu-item');
        if (saveOption) {
            saveOption.parentNode.insertBefore(investigateItem, saveOption.nextSibling);
        } else {
            menuList.insertBefore(investigateItem, menuList.firstChild.nextSibling);
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
                    scriptVersion: '1.7.0',
                    mode: 'single',
                    url: window.location.href,
                    timestamp: new Date().toISOString()
                }
            };
            
            const response = await fetch(`${CONFIG.serverUrl}/investigation/comments`, {
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
                showToast('💭 No comments found on this post', 'warning');
            }
            
        } catch (error) {
            console.error('[Notionally Investigation] Error:', error);
            showToast('❌ Investigation failed: ' + error.message, 'error');
        }
    }
    
    // Show toast notification (reuse existing function or add if not present)
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'notionally-toast';
        
        const colors = {
            info: '#0073b1',
            success: '#057642',
            warning: '#dd5900',
            error: '#cc1016'
        };
        
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    // Watch for dropdown menus
    function watchForDropdowns() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Check if it's a dropdown
                        if (node.classList && node.classList.contains('artdeco-dropdown__content')) {
                            log('Dropdown detected');
                            
                            // Find the associated post
                            let post = node.closest('[data-id]');
                            if (!post) {
                                // Try to find post from trigger button
                                const trigger = document.querySelector('[aria-expanded="true"]');
                                if (trigger) {
                                    post = trigger.closest('[data-id]');
                                }
                            }
                            
                            if (post) {
                                // Add Save to Notion option
                                addSaveToDropdown(node, post);
                                
                                // Add Investigation option if enabled
                                if (CONFIG.investigationMode) {
                                    addInvestigationToDropdown(node, post);
                                }
                            }
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        log('Watching for dropdowns');
    }
    
    // Initialize the script
    function init() {
        log('Notionally script initializing...');
        
        // Start watching for dropdowns
        watchForDropdowns();
        
        // Console helpers for investigation mode
        if (CONFIG.investigationMode) {
            window.notionally = {
                analyzePost: (index = 0) => {
                    const posts = document.querySelectorAll('[data-id][class*="feed-shared-update"]');
                    if (posts[index]) {
                        return analyzeCommentStructure(posts[index]);
                    }
                    return null;
                },
                findAuthorComments: () => {
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
                runBulkInvestigation: async () => {
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
                            scriptVersion: '1.7.0',
                            mode: 'bulk',
                            url: window.location.href,
                            timestamp: new Date().toISOString(),
                            postCount: data.length
                        }
                    };
                    
                    const response = await fetch(`${CONFIG.serverUrl}/investigation/comments`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(investigationData)
                    });
                    
                    const result = await response.json();
                    console.log('Bulk investigation complete:', result);
                    return result;
                }
            };
            
            console.log('[Notionally] Investigation mode enabled!');
            console.log('Console helpers available: window.notionally');
            console.log('- analyzePost(index)');
            console.log('- findAuthorComments()');
            console.log('- runBulkInvestigation()');
        }
        
        log('Notionally initialized successfully');
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();