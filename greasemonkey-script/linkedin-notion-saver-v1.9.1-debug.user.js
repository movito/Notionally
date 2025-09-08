// ==UserScript==
// @name         Notionally - LinkedIn Pulse Article Debugger
// @namespace    http://tampermonkey.net/
// @version      1.9.1
// @description  Debug version to capture LinkedIn Pulse article dropdown behavior
// @author       Fredrik Matheson
// @match        https://www.linkedin.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
// @grant        none
// ==/UserScript==

/**
 * Version 1.9.1 - Enhanced debugging for Pulse article dropdown detection
 * 
 * This debug version logs extensive information about:
 * - DOM structure when buttons are clicked
 * - Dropdown content changes
 * - Element attributes and classes
 * - Mutation observer activity
 */

(function() {
    'use strict';
    
    // ============ DEBUG CONFIGURATION ============
    const DEBUG_CONFIG = {
        serverUrl: 'http://localhost:7777',
        captureSnapshots: true,
        logMutations: true,
        verboseLogging: true,
        sendTelemetry: false // Set to true to send data to server
    };
    
    // Enhanced logging system
    const debugLog = {
        entries: [],
        
        log(category, message, data = null) {
            const entry = {
                timestamp: Date.now(),
                category,
                message,
                data,
                url: window.location.href
            };
            
            this.entries.push(entry);
            
            // Console output with styling
            const style = this.getStyle(category);
            console.log(`%c[Pulse Debug ${category}]%c ${message}`, style, 'color: inherit', data || '');
            
            // Keep only last 100 entries
            if (this.entries.length > 100) {
                this.entries.shift();
            }
        },
        
        getStyle(category) {
            const styles = {
                'INIT': 'color: #10b981; font-weight: bold',
                'DETECT': 'color: #3b82f6; font-weight: bold',
                'CLICK': 'color: #f59e0b; font-weight: bold',
                'MUTATION': 'color: #8b5cf6; font-weight: bold',
                'DROPDOWN': 'color: #ef4444; font-weight: bold',
                'SNAPSHOT': 'color: #ec4899; font-weight: bold',
                'ERROR': 'color: #dc2626; font-weight: bold',
                'SUCCESS': 'color: #22c55e; font-weight: bold'
            };
            return styles[category] || 'color: #6b7280';
        },
        
        getRecent(count = 20) {
            return this.entries.slice(-count);
        }
    };
    
    // ============ DOM SNAPSHOT UTILITIES ============
    function captureElementSnapshot(element, maxDepth = 3, currentDepth = 0) {
        if (!element || currentDepth >= maxDepth) return null;
        
        const snapshot = {
            tagName: element.tagName,
            className: element.className,
            id: element.id,
            attributes: {},
            computedStyle: {},
            dimensions: {
                width: element.offsetWidth,
                height: element.offsetHeight,
                visible: element.offsetWidth > 0 && element.offsetHeight > 0
            },
            text: element.textContent?.substring(0, 100),
            children: []
        };
        
        // Capture all attributes
        for (let attr of element.attributes || []) {
            snapshot.attributes[attr.name] = attr.value;
        }
        
        // Capture key computed styles
        if (window.getComputedStyle) {
            const styles = window.getComputedStyle(element);
            snapshot.computedStyle = {
                display: styles.display,
                visibility: styles.visibility,
                position: styles.position,
                zIndex: styles.zIndex
            };
        }
        
        // Capture children
        if (element.children && currentDepth < maxDepth - 1) {
            for (let child of element.children) {
                if (child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE') {
                    const childSnapshot = captureElementSnapshot(child, maxDepth, currentDepth + 1);
                    if (childSnapshot) {
                        snapshot.children.push(childSnapshot);
                    }
                }
            }
        }
        
        return snapshot;
    }
    
    // ============ PULSE ARTICLE DETECTION ============
    function isPulseArticle() {
        const isPulse = window.location.pathname.includes('/pulse/');
        if (isPulse) {
            debugLog.log('DETECT', 'Pulse article detected', {
                url: window.location.href,
                pathname: window.location.pathname
            });
        }
        return isPulse;
    }
    
    // ============ COMPREHENSIVE DROPDOWN INVESTIGATION ============
    function investigateDropdownStructure() {
        debugLog.log('DROPDOWN', '🔍 Starting comprehensive dropdown investigation');
        
        const investigation = {
            timestamp: Date.now(),
            url: window.location.href,
            readerActions: null,
            dropdownElements: [],
            overflowButtons: [],
            allDropdowns: [],
            potentialTriggers: []
        };
        
        // 1. Look for reader-actions container
        const readerActions = document.querySelector('.reader-actions');
        if (readerActions) {
            debugLog.log('DROPDOWN', '✅ Found .reader-actions container');
            investigation.readerActions = captureElementSnapshot(readerActions, 4);
        } else {
            debugLog.log('DROPDOWN', '❌ No .reader-actions container found');
        }
        
        // 2. Find all elements with 'overflow' in their attributes
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            // Check for overflow in class names
            if (el.className && typeof el.className === 'string' && el.className.includes('overflow')) {
                investigation.overflowButtons.push({
                    className: el.className,
                    tagName: el.tagName,
                    ariaLabel: el.getAttribute('aria-label'),
                    role: el.getAttribute('role'),
                    snapshot: captureElementSnapshot(el, 2)
                });
            }
            
            // Check for aria-label containing 'options' or 'menu'
            const ariaLabel = el.getAttribute('aria-label');
            if (ariaLabel && (ariaLabel.includes('option') || ariaLabel.includes('menu'))) {
                investigation.potentialTriggers.push({
                    ariaLabel,
                    className: el.className,
                    tagName: el.tagName,
                    snapshot: captureElementSnapshot(el, 2)
                });
            }
        });
        
        // 3. Find all dropdown-related elements
        const dropdownSelectors = [
            '.artdeco-dropdown',
            '.artdeco-dropdown__trigger',
            '.artdeco-dropdown__content',
            '[class*="dropdown"]',
            '[class*="overflow-options"]',
            '[class*="reader-overflow"]'
        ];
        
        dropdownSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                debugLog.log('DROPDOWN', `Found ${elements.length} elements with selector: ${selector}`);
                elements.forEach(el => {
                    investigation.dropdownElements.push({
                        selector,
                        className: el.className,
                        tagName: el.tagName,
                        attributes: {
                            'aria-expanded': el.getAttribute('aria-expanded'),
                            'aria-label': el.getAttribute('aria-label'),
                            'role': el.getAttribute('role')
                        },
                        snapshot: captureElementSnapshot(el, 2)
                    });
                });
            }
        });
        
        // 4. Look for SVG icons that might be dropdown triggers
        const svgs = document.querySelectorAll('svg[aria-label*="menu"], svg[aria-label*="option"], use[href*="overflow"]');
        svgs.forEach(svg => {
            const button = svg.closest('button');
            if (button) {
                investigation.potentialTriggers.push({
                    type: 'svg-button',
                    buttonClass: button.className,
                    svgLabel: svg.getAttribute('aria-label'),
                    useHref: svg.querySelector('use')?.getAttribute('href'),
                    snapshot: captureElementSnapshot(button, 3)
                });
            }
        });
        
        // Log summary
        debugLog.log('DROPDOWN', 'Investigation complete', {
            foundReaderActions: !!investigation.readerActions,
            overflowButtonCount: investigation.overflowButtons.length,
            dropdownElementCount: investigation.dropdownElements.length,
            potentialTriggerCount: investigation.potentialTriggers.length
        });
        
        return investigation;
    }
    
    // ============ CLICK HANDLER WITH EXTENSIVE LOGGING ============
    function attachDebugClickHandler(element, description) {
        if (!element) return;
        
        // Remove any existing debug handler
        if (element._debugClickHandler) {
            element.removeEventListener('click', element._debugClickHandler);
        }
        
        const handler = function(e) {
            debugLog.log('CLICK', `🖱️ Click detected on: ${description}`, {
                target: e.target.tagName,
                currentTarget: e.currentTarget.tagName,
                className: element.className,
                ariaExpanded: element.getAttribute('aria-expanded')
            });
            
            // Capture pre-click state
            const preClickState = {
                timestamp: Date.now(),
                dropdownsPresent: document.querySelectorAll('.artdeco-dropdown__content').length,
                visibleMenus: document.querySelectorAll('.artdeco-dropdown__content:not(:empty)').length
            };
            
            debugLog.log('CLICK', 'Pre-click state', preClickState);
            
            // Set up observer to watch for changes after click
            let changeDetected = false;
            const clickObserver = new MutationObserver((mutations) => {
                if (!changeDetected) {
                    changeDetected = true;
                    
                    debugLog.log('CLICK', '✨ DOM changed after click!');
                    
                    // Look for new dropdown content
                    const dropdownContents = document.querySelectorAll('.artdeco-dropdown__content, .reader-overflow-options__content');
                    dropdownContents.forEach(content => {
                        if (content.children.length > 0) {
                            debugLog.log('DROPDOWN', '📋 Dropdown content populated!', {
                                className: content.className,
                                childCount: content.children.length,
                                hasUL: !!content.querySelector('ul'),
                                snapshot: captureElementSnapshot(content, 3)
                            });
                            
                            // Check for menu items
                            const menuItems = content.querySelectorAll('li, [role="menuitem"]');
                            debugLog.log('DROPDOWN', `Found ${menuItems.length} menu items`);
                            
                            menuItems.forEach((item, index) => {
                                debugLog.log('DROPDOWN', `Menu item ${index + 1}:`, {
                                    text: item.textContent?.trim().substring(0, 50),
                                    className: item.className,
                                    role: item.getAttribute('role')
                                });
                            });
                        }
                    });
                    
                    // Stop observing after 2 seconds
                    setTimeout(() => {
                        clickObserver.disconnect();
                        debugLog.log('CLICK', 'Click observer stopped');
                    }, 2000);
                }
            });
            
            clickObserver.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['aria-expanded', 'class']
            });
            
            // Also check after a delay
            setTimeout(() => {
                const postClickState = {
                    timestamp: Date.now(),
                    dropdownsPresent: document.querySelectorAll('.artdeco-dropdown__content').length,
                    visibleMenus: document.querySelectorAll('.artdeco-dropdown__content:not(:empty)').length,
                    readerOverflowContent: document.querySelector('.reader-overflow-options__content')
                };
                
                debugLog.log('CLICK', 'Post-click state (after 500ms)', postClickState);
                
                if (postClickState.readerOverflowContent) {
                    debugLog.log('SUCCESS', '🎉 reader-overflow-options__content found!', {
                        snapshot: captureElementSnapshot(postClickState.readerOverflowContent, 4)
                    });
                }
            }, 500);
        };
        
        element._debugClickHandler = handler;
        element.addEventListener('click', handler);
        
        debugLog.log('CLICK', `✅ Click handler attached to: ${description}`);
    }
    
    // ============ MAIN PULSE ARTICLE OBSERVER ============
    function setupPulseArticleDebugger() {
        if (!isPulseArticle()) return;
        
        debugLog.log('INIT', '🚀 Setting up Pulse article debugger');
        
        // Initial investigation
        const initialInvestigation = investigateDropdownStructure();
        
        // Try to find and attach to dropdown triggers
        const attachToTriggers = () => {
            // Method 1: Look for buttons in reader-actions
            const readerActions = document.querySelector('.reader-actions');
            if (readerActions) {
                const buttons = readerActions.querySelectorAll('button');
                buttons.forEach((button, index) => {
                    const label = button.getAttribute('aria-label') || `Button ${index + 1}`;
                    attachDebugClickHandler(button, `reader-actions button: ${label}`);
                });
            }
            
            // Method 2: Look for any overflow buttons
            const overflowButtons = document.querySelectorAll('[aria-label*="overflow"], [aria-label*="option"], [aria-label*="menu"]');
            overflowButtons.forEach(button => {
                const label = button.getAttribute('aria-label') || 'Overflow button';
                attachDebugClickHandler(button, `Overflow: ${label}`);
            });
            
            // Method 3: Artdeco dropdown triggers
            const dropdownTriggers = document.querySelectorAll('.artdeco-dropdown__trigger');
            dropdownTriggers.forEach((trigger, index) => {
                attachDebugClickHandler(trigger, `Dropdown trigger ${index + 1}`);
            });
        };
        
        // Attach initially
        attachToTriggers();
        
        // Set up mutation observer for the entire page
        const globalObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                // Log significant mutations
                if (DEBUG_CONFIG.logMutations) {
                    if (mutation.target.className && 
                        (mutation.target.className.includes('dropdown') || 
                         mutation.target.className.includes('overflow') ||
                         mutation.target.className.includes('reader'))) {
                        
                        debugLog.log('MUTATION', 'Relevant mutation detected', {
                            targetClass: mutation.target.className,
                            type: mutation.type,
                            addedNodes: mutation.addedNodes.length,
                            removedNodes: mutation.removedNodes.length
                        });
                    }
                }
                
                // Check for dropdown content being added
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        // Check if it's dropdown content
                        if (node.classList?.contains('reader-overflow-options__content') ||
                            node.classList?.contains('artdeco-dropdown__content')) {
                            
                            debugLog.log('DROPDOWN', '🎯 Dropdown content node added!', {
                                className: node.className,
                                isEmpty: node.children.length === 0,
                                snapshot: captureElementSnapshot(node, 3)
                            });
                            
                            // Watch for content population
                            const contentObserver = new MutationObserver((contentMutations) => {
                                if (node.children.length > 0) {
                                    debugLog.log('DROPDOWN', '📝 Dropdown content populated!', {
                                        childCount: node.children.length,
                                        firstChild: node.firstElementChild?.tagName,
                                        snapshot: captureElementSnapshot(node, 4)
                                    });
                                    
                                    // Look for UL element
                                    const ul = node.querySelector('ul');
                                    if (ul) {
                                        debugLog.log('SUCCESS', '✅ Found UL in dropdown!', {
                                            itemCount: ul.children.length,
                                            items: Array.from(ul.children).map(li => ({
                                                text: li.textContent?.trim().substring(0, 30),
                                                className: li.className
                                            }))
                                        });
                                        
                                        // This is where we would inject our menu item
                                        debugLog.log('SUCCESS', '💉 Ready to inject Save to Notion option!');
                                    }
                                    
                                    contentObserver.disconnect();
                                }
                            });
                            
                            contentObserver.observe(node, {
                                childList: true,
                                subtree: true
                            });
                        }
                        
                        // Check if new buttons were added
                        if (node.querySelector && node.querySelector('button[aria-label*="option"], button[aria-label*="menu"]')) {
                            debugLog.log('MUTATION', 'New menu button detected, reattaching handlers');
                            setTimeout(attachToTriggers, 100);
                        }
                    }
                });
            });
        });
        
        globalObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['aria-expanded', 'aria-hidden']
        });
        
        debugLog.log('INIT', '✅ Global observer started');
        
        // Add debug button for manual investigation
        addDebugButton();
    }
    
    // ============ DEBUG BUTTON FOR MANUAL TESTING ============
    function addDebugButton() {
        // Remove existing debug button if present
        const existing = document.querySelector('.pulse-debug-button');
        if (existing) existing.remove();
        
        const debugButton = document.createElement('button');
        debugButton.className = 'pulse-debug-button';
        debugButton.innerHTML = '🐛 Debug Pulse Article';
        debugButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 30px;
            cursor: pointer;
            z-index: 10000;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            transition: transform 0.2s;
        `;
        
        debugButton.addEventListener('mouseenter', () => {
            debugButton.style.transform = 'scale(1.05)';
        });
        
        debugButton.addEventListener('mouseleave', () => {
            debugButton.style.transform = 'scale(1)';
        });
        
        debugButton.addEventListener('click', () => {
            debugLog.log('SNAPSHOT', '📸 Manual investigation triggered');
            
            const investigation = investigateDropdownStructure();
            
            // Create detailed report
            const report = {
                timestamp: new Date().toISOString(),
                url: window.location.href,
                investigation,
                recentLogs: debugLog.getRecent(30),
                domStats: {
                    totalElements: document.querySelectorAll('*').length,
                    buttons: document.querySelectorAll('button').length,
                    dropdowns: document.querySelectorAll('.artdeco-dropdown').length,
                    readerActions: !!document.querySelector('.reader-actions')
                }
            };
            
            // Log to console
            console.group('🔍 Pulse Article Debug Report');
            console.log('Investigation:', investigation);
            console.log('Recent logs:', debugLog.getRecent(30));
            console.log('Full report:', report);
            console.groupEnd();
            
            // Send telemetry if enabled
            if (DEBUG_CONFIG.sendTelemetry) {
                sendTelemetry(report);
            }
            
            // Show summary alert
            alert(`
Pulse Article Debug Report
==========================
URL: ${window.location.pathname}
Reader Actions Found: ${!!investigation.readerActions}
Overflow Buttons: ${investigation.overflowButtons.length}
Dropdown Elements: ${investigation.dropdownElements.length}
Potential Triggers: ${investigation.potentialTriggers.length}

Check console for detailed information.
            `.trim());
        });
        
        document.body.appendChild(debugButton);
        debugLog.log('INIT', '✅ Debug button added');
    }
    
    // ============ TELEMETRY ============
    async function sendTelemetry(data) {
        try {
            const response = await fetch(`${DEBUG_CONFIG.serverUrl}/debug/pulse`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                debugLog.log('SUCCESS', '📤 Telemetry sent successfully');
            }
        } catch (error) {
            debugLog.log('ERROR', 'Failed to send telemetry', error);
        }
    }
    
    // ============ INITIALIZATION ============
    function init() {
        debugLog.log('INIT', '🎬 Pulse Article Debugger v1.9.1 starting...');
        
        // Check if on Pulse article
        if (isPulseArticle()) {
            debugLog.log('INIT', '📰 On Pulse article page, initializing debugger');
            setupPulseArticleDebugger();
        } else {
            debugLog.log('INIT', '📋 Not on Pulse article, waiting for navigation');
        }
        
        // Watch for navigation to Pulse articles
        let lastPath = window.location.pathname;
        setInterval(() => {
            if (window.location.pathname !== lastPath) {
                lastPath = window.location.pathname;
                debugLog.log('INIT', '🔄 Navigation detected');
                
                if (isPulseArticle()) {
                    setupPulseArticleDebugger();
                }
            }
        }, 1000);
        
        // Add console helper
        window.pulseDebug = {
            investigate: investigateDropdownStructure,
            logs: () => debugLog.getRecent(50),
            snapshot: (selector) => {
                const element = document.querySelector(selector);
                if (element) {
                    return captureElementSnapshot(element, 5);
                }
                return null;
            },
            findDropdowns: () => {
                return {
                    artdecoDropdowns: document.querySelectorAll('.artdeco-dropdown'),
                    dropdownContents: document.querySelectorAll('.artdeco-dropdown__content'),
                    readerOverflow: document.querySelectorAll('.reader-overflow-options__content'),
                    readerActions: document.querySelector('.reader-actions')
                };
            }
        };
        
        console.log('%c🐛 Pulse Article Debugger Active', 'color: #667eea; font-size: 16px; font-weight: bold');
        console.log('Available commands:');
        console.log('  pulseDebug.investigate() - Run full investigation');
        console.log('  pulseDebug.logs() - View recent debug logs');
        console.log('  pulseDebug.snapshot(selector) - Capture element snapshot');
        console.log('  pulseDebug.findDropdowns() - Find all dropdown elements');
    }
    
    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();