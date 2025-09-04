---
title: Greasemonkey Script Development Guide
version: 1.2.0
last_updated: 2025-01-10
category: development
status: active
---

# Greasemonkey Script Development Guide

## Overview
This guide explains how to develop, test, and deploy Greasemonkey scripts for Notionally, specifically for the v1.2.0 links-from-comments feature.

## Prerequisites

1. **Firefox Browser** (recommended) or Chrome with Tampermonkey
2. **Greasemonkey Extension** installed from Firefox Add-ons
3. **Local Notionally server** running on port 8765
4. **LinkedIn account** for testing

## Development Workflow

### 1. Setting Up Development Environment

#### A. Install Greasemonkey Extension
1. Open Firefox
2. Navigate to Add-ons (about:addons)
3. Search for "Greasemonkey"
4. Install the official Greasemonkey extension
5. Restart Firefox if prompted

#### B. Install Current Production Script
1. Open Greasemonkey dashboard (click monkey icon → "Manage scripts")
2. Click "New user script" or "+"
3. Copy contents from `greasemonkey-script/linkedin-notion-saver.user.js`
4. Save as "Notionally - LinkedIn to Notion Saver"

### 2. Creating Debug Version

#### A. Duplicate for Development
1. In Greasemonkey dashboard, find the Notionally script
2. Click "Edit" to open in editor
3. Save As → "Notionally - DEBUG"
4. Update the header:

```javascript
// ==UserScript==
// @name         Notionally - DEBUG - Links from Comments
// @namespace    http://tampermonkey.net/
// @version      1.6.1-debug
// @description  Debug version for comment extraction investigation
// @author       Your Name
// @match        https://www.linkedin.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=notion.so
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// ==/UserScript==
```

#### B. Add Debug Configuration
At the top of your script, after the header:

```javascript
// ============================================
// DEBUG CONFIGURATION
// ============================================
const DEBUG_MODE = true;  // Set to false for production
const DEBUG_VERSION = '1.6.1-debug';

// Debug settings
const DEBUG_CONFIG = {
    enabled: DEBUG_MODE,
    logToConsole: true,
    logToStorage: true,
    showDebugPanel: true,
    categories: {
        COMMENT_DISCOVERY: true,
        AUTHOR_MATCHING: true,
        LINK_EXTRACTION: true,
        DOM_STRUCTURE: true,
        TIMING: true,
        ERRORS: true
    }
};

// Override production logging if in debug mode
if (DEBUG_MODE) {
    console.log(`[Notionally] Debug mode enabled - Version ${DEBUG_VERSION}`);
    console.log('[Notionally] Debug config:', DEBUG_CONFIG);
}
```

### 3. Development Testing Cycle

#### A. Making Changes
1. Edit script in Greasemonkey editor
2. Save changes (Ctrl+S / Cmd+S)
3. Refresh LinkedIn page to reload script
4. Check console for debug output

#### B. Console Testing
Open browser console (F12) and test functions directly:

```javascript
// Test individual functions
notionally_debug.collectData();
notionally_debug.analyzePost(0);

// Check debug logs
console.table(JSON.parse(sessionStorage.getItem('notionally_debug')));

// Export findings
notionally_debug.exportDebugLog();
```

#### C. Visual Debug Panel (Optional)
Add a floating debug panel for easier testing:

```javascript
function createDebugPanel() {
    if (!DEBUG_CONFIG.showDebugPanel) return;
    
    const panel = document.createElement('div');
    panel.id = 'notionally-debug-panel';
    panel.innerHTML = `
        <div style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 12px;
            z-index: 10000;
            max-width: 400px;
        ">
            <h3 style="margin: 0 0 10px 0;">🔍 Notionally Debug</h3>
            <div id="notionally-debug-info">Ready</div>
            <div style="margin-top: 10px;">
                <button onclick="notionally_debug.collectData()" style="margin-right: 5px;">Collect Data</button>
                <button onclick="notionally_debug.analyzePost()" style="margin-right: 5px;">Analyze Post</button>
                <button onclick="notionally_debug.exportDebugLog()">Export Log</button>
            </div>
        </div>
    `;
    document.body.appendChild(panel);
}

// Initialize debug panel
if (DEBUG_MODE) {
    window.addEventListener('load', createDebugPanel);
}
```

### 4. Investigation Workflow

#### Step 1: Copy Investigation Code
From `/docs/development/COMMENT_EXTRACTION_INVESTIGATION.md`, copy all debug functions into your debug script:
- `debugLog()`
- `analyzeCommentStructure()`
- `traceAuthorIdentification()`
- `observeCommentLoading()`
- `analyzeLinkPatterns()`
- `collectCommentData()`

#### Step 2: Navigate to Test Posts
1. Go to LinkedIn feed
2. Find posts with "link in comments"
3. Ensure comments are loaded
4. Run investigation functions

#### Step 3: Collect Data
```javascript
// In browser console
const data = notionally_debug.collectData();
console.log('Collected data:', data);

// Copy to clipboard
copy(JSON.stringify(data, null, 2));
```

#### Step 4: Document Findings
Create a file `investigation-results.json`:
```json
{
  "timestamp": "2025-01-10T10:00:00Z",
  "findings": {
    "selectors": {
      "working": [...],
      "unreliable": [...]
    },
    "patterns": {...}
  }
}
```

### 5. Implementing Features

#### A. Test Incrementally
1. Implement one function at a time
2. Test in isolation first
3. Integrate with main script
4. Test full workflow

#### B. Version Control Integration
```bash
# Don't commit debug version to main branch
# Instead, keep debug code in separate file during development

# Create development file
cp greasemonkey-script/linkedin-notion-saver.user.js \
   greasemonkey-script/linkedin-notion-saver.debug.js

# Work on debug version
# When ready, merge changes back to main script
```

#### C. Testing Checklist
- [ ] Script loads without errors
- [ ] Debug functions available in console
- [ ] Can detect comments section
- [ ] Can identify post author
- [ ] Can match author in comments
- [ ] Can extract links from comments
- [ ] Data sends to local server correctly
- [ ] No performance degradation

### 6. Debugging Common Issues

#### Issue: Script Not Loading
```javascript
// Check if script is active
console.log('[Notionally] Script loaded:', typeof extractPostData === 'function');

// Check for conflicts
console.log('Other scripts:', GM_info.script.matches);
```

#### Issue: Selectors Not Working
```javascript
// Test selectors directly
function testSelector(selector) {
    const elements = document.querySelectorAll(selector);
    console.log(`Selector "${selector}": Found ${elements.length} elements`);
    return elements;
}

// Test multiple variants
const selectors = [
    '[aria-label*="comment"]',
    '.comments-comments-list',
    '[class*="comments-comment-item"]'
];

selectors.forEach(testSelector);
```

#### Issue: Comments Not Loading
```javascript
// Monitor for lazy loading
const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => {
        if (m.target.className?.includes('comment')) {
            console.log('Comment mutation:', m);
        }
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
```

### 7. Production Deployment

#### A. Remove Debug Code
1. Set `DEBUG_MODE = false`
2. Remove debug panel
3. Comment out console.logs (or use conditional logging)
4. Remove investigation functions

#### B. Update Version
```javascript
// @version      1.7.0  // Increment from 1.6.0 to 1.7.0 for new feature
```

#### C. Test Production Version
1. Disable debug script in Greasemonkey
2. Update main script
3. Test all functionality
4. Verify no debug output in console

#### D. Commit Changes
```bash
# Only commit the production version
git add greasemonkey-script/linkedin-notion-saver.user.js
git commit -m "feat: Add comment extraction for links"
```

### 8. Rollback Procedure

If issues occur in production:

1. **Quick Rollback in Browser**
   - Open Greasemonkey dashboard
   - Edit script
   - Revert version number
   - Copy previous version from git

2. **Git Rollback**
   ```bash
   # View previous version
   git show HEAD~1:greasemonkey-script/linkedin-notion-saver.user.js
   
   # Revert if needed
   git revert HEAD
   ```

### 9. Tips and Best Practices

#### Performance
- Minimize DOM queries
- Cache selectors
- Use efficient event delegation
- Debounce scroll/mutation handlers

#### Reliability
- Always check element exists before accessing properties
- Use try-catch for critical sections
- Provide fallback selectors
- Test with different LinkedIn layouts

#### Maintainability
- Comment complex selectors
- Document LinkedIn-specific behavior
- Keep debug functions modular
- Version your changes clearly

### 10. Advanced Debugging

#### Network Monitoring
```javascript
// Intercept fetch requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
    console.log('[Notionally] Fetch:', args[0]);
    return originalFetch.apply(this, args);
};
```

#### Performance Profiling
```javascript
// Measure function execution time
function timeFunction(fn, label) {
    return function(...args) {
        console.time(label);
        const result = fn.apply(this, args);
        console.timeEnd(label);
        return result;
    };
}

// Use it
extractPostData = timeFunction(extractPostData, 'extractPostData');
```

#### State Debugging
```javascript
// Save state for analysis
window.notionally_state = {
    posts: [],
    comments: [],
    errors: []
};

// Update during execution
notionally_state.posts.push(postData);
```

## Quick Reference

### Essential Commands

```javascript
// Check script version
console.log(GM_info.script.version);

// Reload script without page refresh (in Greasemonkey editor)
// Ctrl+S / Cmd+S then close and reopen tab

// Clear debug data
sessionStorage.removeItem('notionally_debug');

// Enable verbose logging
DEBUG_CONFIG.verbosity = 5;

// Test specific post
const post = document.querySelector('[data-id]');
const result = extractPostData(post);
console.log(result);
```

### File Locations

- **Production Script**: `greasemonkey-script/linkedin-notion-saver.user.js`
- **Investigation Code**: `docs/development/COMMENT_EXTRACTION_INVESTIGATION.md`
- **Task Details**: `coordination/tasks/TASK-009-v1.2.0-links-from-comments.md`
- **Feature Plan**: `docs/development/FEATURE_V1.2.0_LINKS_FROM_COMMENTS.md`

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify local server is running
3. Ensure Greasemonkey is enabled
4. Test with debug version
5. Document findings in task notes

---

Remember: Always test thoroughly before deploying to production!