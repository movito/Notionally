// ==UserScript==
// @name         notionally - Pulse Article Debug v1.11.1
// @namespace    http://tampermonkey.net/
// @version      1.11.1-debug
// @description  Debug version to find Pulse article buttons
// @author       Fredrik Matheson
// @match        https://www.linkedin.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    console.log('[Pulse Debug v1.11.1] Script loaded on:', window.location.href);
    
    // Check if we're on a Pulse article
    function isPulseArticle() {
        return window.location.pathname.includes('/pulse/');
    }
    
    if (!isPulseArticle()) {
        console.log('[Pulse Debug] Not a Pulse article, exiting');
        return;
    }
    
    console.log('[Pulse Debug] 🎯 PULSE ARTICLE DETECTED!');
    
    // Function to scan for buttons
    function scanForButtons() {
        console.log('\n[Pulse Debug] === SCANNING FOR BUTTONS ===');
        
        // Look for any button with various selectors
        const selectors = [
            'button[aria-label*="More"]',
            'button[aria-label*="more"]',
            'button[aria-label*="Open"]',
            'button[aria-label*="open"]',
            'button[aria-label*="Options"]',
            'button[aria-label*="options"]',
            'button.artdeco-dropdown__trigger',
            'button[data-control-name*="overflow"]',
            'button.reader-actions__overflow-button',
            '.reader-actions button',
            '.reader-article-toolbar button',
            'button[id*="overflow"]',
            'button[class*="overflow"]'
        ];
        
        const foundButtons = [];
        
        selectors.forEach(selector => {
            const buttons = document.querySelectorAll(selector);
            if (buttons.length > 0) {
                console.log(`✅ Found ${buttons.length} button(s) with selector: "${selector}"`);
                buttons.forEach((btn, idx) => {
                    const info = {
                        selector: selector,
                        index: idx,
                        ariaLabel: btn.getAttribute('aria-label'),
                        className: btn.className,
                        id: btn.id,
                        text: btn.textContent.trim().substring(0, 50),
                        dataControlName: btn.getAttribute('data-control-name')
                    };
                    foundButtons.push(info);
                    console.log('  Button details:', info);
                });
            }
        });
        
        if (foundButtons.length === 0) {
            console.log('❌ No buttons found with any selector');
        }
        
        // Also scan for any containers that might hold the button
        const containerSelectors = [
            '.reader-actions',
            '.reader-article-toolbar',
            '.reader-article-actions',
            '.article-actions',
            '[class*="reader"]',
            '[class*="article-toolbar"]'
        ];
        
        console.log('\n[Pulse Debug] === SCANNING FOR CONTAINERS ===');
        containerSelectors.forEach(selector => {
            const containers = document.querySelectorAll(selector);
            if (containers.length > 0) {
                console.log(`Found ${containers.length} container(s) with selector: "${selector}"`);
                containers.forEach((container, idx) => {
                    const buttons = container.querySelectorAll('button');
                    if (buttons.length > 0) {
                        console.log(`  Container ${idx} has ${buttons.length} button(s):`);
                        buttons.forEach((btn, btnIdx) => {
                            console.log(`    Button ${btnIdx}: aria-label="${btn.getAttribute('aria-label')}", class="${btn.className}"`);
                        });
                    }
                });
            }
        });
        
        // Add click listeners to all buttons for monitoring
        document.querySelectorAll('button').forEach((btn, idx) => {
            btn.addEventListener('click', function() {
                console.log(`[Pulse Debug] Button clicked! Index: ${idx}, aria-label: "${btn.getAttribute('aria-label')}", class: "${btn.className}"`);
                
                // Check for dropdown appearance after click
                setTimeout(() => {
                    const dropdowns = document.querySelectorAll('.artdeco-dropdown__content, [class*="dropdown"], [class*="overflow-options"], [class*="menu"]');
                    if (dropdowns.length > 0) {
                        console.log(`[Pulse Debug] Found ${dropdowns.length} dropdown(s) after click:`);
                        dropdowns.forEach((dd, ddIdx) => {
                            console.log(`  Dropdown ${ddIdx}: class="${dd.className}"`);
                            const items = dd.querySelectorAll('li, [role="menuitem"], .artdeco-dropdown__item');
                            console.log(`    Contains ${items.length} menu items`);
                        });
                    }
                }, 100);
            });
        });
        
        return foundButtons;
    }
    
    // Initial scan
    setTimeout(() => {
        console.log('[Pulse Debug] Initial scan after 2 seconds...');
        scanForButtons();
    }, 2000);
    
    // Scan again after more time
    setTimeout(() => {
        console.log('[Pulse Debug] Second scan after 5 seconds...');
        scanForButtons();
    }, 5000);
    
    // Add a floating debug button
    const debugBtn = document.createElement('button');
    debugBtn.textContent = '🔍 Scan Pulse Buttons';
    debugBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        background: #0073b1;
        color: white;
        padding: 10px 20px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
    `;
    debugBtn.onclick = () => {
        console.log('[Pulse Debug] Manual scan triggered');
        scanForButtons();
    };
    document.body.appendChild(debugBtn);
    
    console.log('[Pulse Debug] Debug button added. Click it to manually scan for buttons.');
    
    // Monitor for DOM changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        if (node.tagName === 'BUTTON' || node.querySelector && node.querySelector('button')) {
                            console.log('[Pulse Debug] New button(s) detected via MutationObserver');
                        }
                        if (node.className && node.className.includes && (node.className.includes('dropdown') || node.className.includes('overflow'))) {
                            console.log('[Pulse Debug] Dropdown/overflow element appeared:', node.className);
                        }
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('[Pulse Debug] MutationObserver active');
})();