// ==UserScript==
// @name         Notionally Link Appender for LinkedIn
// @namespace    http://notionally.app/
// @version      1.0.0
// @description  Manually append links from LinkedIn comments to existing Notion pages
// @author       Notionally Team
// @match        https://www.linkedin.com/feed/*
// @match        https://www.linkedin.com/posts/*
// @match        https://linkedin.com/feed/*
// @match        https://linkedin.com/posts/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        serverUrl: 'http://localhost:8765',
        debugMode: true
    };

    const NAMESPACE = 'notionally-link-appender';

    GM_addStyle(`
        .${NAMESPACE}-container {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 300px;
        }
        
        .${NAMESPACE}-panel {
            background: white;
            border: 2px solid #0077B5;
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: -apple-system, system-ui, sans-serif;
        }
        
        .${NAMESPACE}-header {
            font-weight: bold;
            margin-bottom: 8px;
            color: #0077B5;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .${NAMESPACE}-close {
            cursor: pointer;
            font-size: 18px;
            color: #666;
            background: none;
            border: none;
            padding: 0;
        }
        
        .${NAMESPACE}-post-info {
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
            padding: 4px;
            background: #f3f3f3;
            border-radius: 4px;
        }
        
        .${NAMESPACE}-links-list {
            max-height: 200px;
            overflow-y: auto;
            margin: 8px 0;
        }
        
        .${NAMESPACE}-link-item {
            display: flex;
            align-items: start;
            gap: 8px;
            margin-bottom: 6px;
            padding: 6px;
            background: #f9f9f9;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .${NAMESPACE}-link-item input[type="checkbox"] {
            margin-top: 2px;
            flex-shrink: 0;
        }
        
        .${NAMESPACE}-link-text {
            word-break: break-word;
            flex: 1;
        }
        
        .${NAMESPACE}-author {
            font-weight: 600;
            color: #0077B5;
            margin-right: 4px;
        }
        
        .${NAMESPACE}-button {
            background: #0077B5;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            width: 100%;
            margin-top: 8px;
        }
        
        .${NAMESPACE}-button:hover {
            background: #005885;
        }
        
        .${NAMESPACE}-button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        
        .${NAMESPACE}-fab {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: #0077B5;
            color: white;
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-size: 24px;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .${NAMESPACE}-fab:hover {
            background: #005885;
            transform: scale(1.1);
        }
        
        .${NAMESPACE}-status {
            padding: 8px;
            margin-top: 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .${NAMESPACE}-status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .${NAMESPACE}-status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        
        .${NAMESPACE}-status.info {
            background: #d1ecf1;
            color: #0c5460;
            border: 1px solid #bee5eb;
        }
    `);

    let currentPanel = null;
    let fabButton = null;

    function log(...args) {
        if (CONFIG.debugMode) {
            console.log(`[${NAMESPACE}]`, ...args);
        }
    }

    function extractLinksFromComments(postElement) {
        const links = [];
        const commentContainers = postElement.querySelectorAll('.comments-comment-item, .comment-item, [data-test-comment-entity]');
        
        log(`Found ${commentContainers.length} comment containers`);
        
        commentContainers.forEach((comment, index) => {
            const authorElement = comment.querySelector('.comments-post-meta__name-text, .comment-author, [class*="author"]');
            const contentElement = comment.querySelector('.comments-comment-item__main-content, .comment-content, [class*="comment-text"]');
            
            if (!contentElement) return;
            
            const author = authorElement ? authorElement.textContent.trim() : 'Unknown';
            const content = contentElement.textContent.trim();
            
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const urls = content.match(urlRegex);
            
            if (urls && urls.length > 0) {
                urls.forEach(url => {
                    const cleanUrl = url.replace(/[.,;!?)\]]*$/, '');
                    links.push({
                        author,
                        url: cleanUrl,
                        context: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
                        commentIndex: index
                    });
                });
            }
        });
        
        return links;
    }

    function getPostInfo(postElement) {
        const authorElement = postElement.querySelector('.update-components-actor__name, .feed-shared-actor__name');
        const author = authorElement ? authorElement.textContent.trim() : 'Unknown';
        
        const postUrl = window.location.href;
        const postId = postElement.getAttribute('data-id') || postElement.id || 'unknown';
        
        return {
            author,
            url: postUrl,
            id: postId
        };
    }

    function createLinkPanel(postElement) {
        if (currentPanel) {
            currentPanel.remove();
        }
        
        const postInfo = getPostInfo(postElement);
        const links = extractLinksFromComments(postElement);
        
        const container = document.createElement('div');
        container.className = `${NAMESPACE}-container`;
        
        const panel = document.createElement('div');
        panel.className = `${NAMESPACE}-panel`;
        
        const header = document.createElement('div');
        header.className = `${NAMESPACE}-header`;
        header.innerHTML = `
            <span>🔗 Append Links to Notion</span>
            <button class="${NAMESPACE}-close">✕</button>
        `;
        
        const postInfoDiv = document.createElement('div');
        postInfoDiv.className = `${NAMESPACE}-post-info`;
        postInfoDiv.textContent = `Post by: ${postInfo.author}`;
        
        const linksList = document.createElement('div');
        linksList.className = `${NAMESPACE}-links-list`;
        
        if (links.length === 0) {
            linksList.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">No links found in comments</div>';
        } else {
            links.forEach((link, index) => {
                const linkItem = document.createElement('div');
                linkItem.className = `${NAMESPACE}-link-item`;
                linkItem.innerHTML = `
                    <input type="checkbox" id="${NAMESPACE}-link-${index}" data-url="${link.url}" data-author="${link.author}">
                    <label for="${NAMESPACE}-link-${index}" class="${NAMESPACE}-link-text">
                        <span class="${NAMESPACE}-author">${link.author}:</span>
                        <span>${link.url}</span>
                    </label>
                `;
                linksList.appendChild(linkItem);
            });
        }
        
        const appendButton = document.createElement('button');
        appendButton.className = `${NAMESPACE}-button`;
        appendButton.textContent = 'Append Selected Links';
        appendButton.disabled = links.length === 0;
        
        const statusDiv = document.createElement('div');
        statusDiv.className = `${NAMESPACE}-status`;
        statusDiv.style.display = 'none';
        
        appendButton.addEventListener('click', async () => {
            const selectedLinks = [];
            const checkboxes = linksList.querySelectorAll('input[type="checkbox"]:checked');
            
            checkboxes.forEach(checkbox => {
                selectedLinks.push({
                    url: checkbox.dataset.url,
                    author: checkbox.dataset.author
                });
            });
            
            if (selectedLinks.length === 0) {
                showStatus(statusDiv, 'Please select at least one link', 'error');
                return;
            }
            
            appendButton.disabled = true;
            showStatus(statusDiv, 'Appending links to Notion...', 'info');
            
            try {
                const response = await sendToServer({
                    action: 'append_links',
                    postUrl: postInfo.url,
                    postAuthor: postInfo.author,
                    links: selectedLinks
                });
                
                if (response.success) {
                    showStatus(statusDiv, '✓ Links appended successfully!', 'success');
                    setTimeout(() => {
                        container.remove();
                    }, 2000);
                } else {
                    showStatus(statusDiv, `Error: ${response.error || 'Failed to append links'}`, 'error');
                }
            } catch (error) {
                showStatus(statusDiv, `Error: ${error.message}`, 'error');
            } finally {
                appendButton.disabled = false;
            }
        });
        
        header.querySelector(`.${NAMESPACE}-close`).addEventListener('click', () => {
            container.remove();
        });
        
        panel.appendChild(header);
        panel.appendChild(postInfoDiv);
        panel.appendChild(linksList);
        panel.appendChild(appendButton);
        panel.appendChild(statusDiv);
        container.appendChild(panel);
        
        document.body.appendChild(container);
        currentPanel = container;
    }

    function showStatus(statusDiv, message, type) {
        statusDiv.textContent = message;
        statusDiv.className = `${NAMESPACE}-status ${type}`;
        statusDiv.style.display = 'block';
    }

    async function sendToServer(data) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${CONFIG.serverUrl}/append-links`,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(data),
                onload: function(response) {
                    try {
                        const result = JSON.parse(response.responseText);
                        resolve(result);
                    } catch (error) {
                        reject(new Error('Invalid server response'));
                    }
                },
                onerror: function(error) {
                    reject(new Error('Network error'));
                }
            });
        });
    }

    function findNearestPost(element) {
        return element.closest('[data-id], .feed-shared-update-v2, .occludable-update');
    }

    function createFAB() {
        if (fabButton) return;
        
        fabButton = document.createElement('button');
        fabButton.className = `${NAMESPACE}-fab`;
        fabButton.innerHTML = '🔗';
        fabButton.title = 'Append links from comments to Notion';
        
        fabButton.addEventListener('click', () => {
            const posts = document.querySelectorAll('[data-id], .feed-shared-update-v2, .occludable-update');
            if (posts.length > 0) {
                const firstVisiblePost = Array.from(posts).find(post => {
                    const rect = post.getBoundingClientRect();
                    return rect.top >= 0 && rect.top <= window.innerHeight;
                }) || posts[0];
                
                createLinkPanel(firstVisiblePost);
            }
        });
        
        document.body.appendChild(fabButton);
    }

    function init() {
        log('Initializing Link Appender');
        
        setTimeout(() => {
            createFAB();
        }, 2000);
        
        document.addEventListener('click', (e) => {
            if (e.target.matches('[aria-label*="Comment"], .comment-button, [data-control-name*="comment"]')) {
                const post = findNearestPost(e.target);
                if (post) {
                    setTimeout(() => {
                        if (currentPanel) {
                            const links = extractLinksFromComments(post);
                            log(`Re-scanning found ${links.length} links after comment interaction`);
                        }
                    }, 1000);
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();