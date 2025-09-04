# Debug Script Usage Guide

## Installation
1. Open the file `linkedin-notion-saver-debug.user.js` in Firefox
2. Greasemonkey will prompt to install it
3. Click "Install"
4. Navigate to LinkedIn feed

## Keyboard Shortcuts
- **Ctrl+Shift+D** - Collect comment data from current page (analyzes first 10 posts)
- **Ctrl+Shift+E** - Export debug log as JSON file
- **Ctrl+Shift+T** - Run specific test scenario

## Console Commands
Open browser console (F12) and use these commands:

### Data Collection
```javascript
// Collect data from all posts on page
notionally_debug.collectData()

// Analyze specific post structure (0-based index)
notionally_debug.analyzePost(0)  // First post
notionally_debug.analyzePost(2)  // Third post

// Trace author identification in specific post
notionally_debug.traceAuthors(0)

// Analyze links in post comments
notionally_debug.analyzeLinkInPost(0)

// Start observing a post for DOM changes
const observer = notionally_debug.observePost(0)
// ... wait for changes ...
observer.stop()  // Stop observing
```

### Debug Management
```javascript
// Export debug log to file
notionally_debug.exportDebugLog()

// Clear debug log from session storage
notionally_debug.clearDebug()

// View/modify debug configuration
notionally_debug.config
```

## Investigation Workflow

### Step 1: Find Target Posts
1. Navigate to LinkedIn feed
2. Scroll to find posts with:
   - "Link in comments" text
   - Author comments with links
   - Multiple comments
   - Lazy-loaded comments

### Step 2: Collect Data
1. Press **Ctrl+Shift+D** to collect data from visible posts
2. Data is automatically copied to clipboard
3. Paste into a JSON file for analysis

### Step 3: Detailed Analysis
For specific posts of interest:
```javascript
// If post #3 has "link in comments"
const structure = notionally_debug.analyzePost(2)
const authors = notionally_debug.traceAuthors(2) 
const links = notionally_debug.analyzeLinkInPost(2)
```

### Step 4: Test Loading Behavior
```javascript
// Start observing before clicking "Show more comments"
const obs = notionally_debug.observePost(0)

// Now click "Show more comments" button manually

// After comments load, check observations
console.log(obs.observations)
obs.stop()
```

### Step 5: Export Findings
1. Press **Ctrl+Shift+E** to export all debug logs
2. Or copy specific analysis from console

## What to Look For

### Selectors
- Comment container classes
- Author element selectors
- Comment text containers
- Show more button selectors

### Patterns
- How author names are displayed
- Link formats (direct, shortened, redirects)
- Comment loading triggers
- DOM mutation patterns

### Edge Cases
- Posts with no comments
- Collapsed comment sections
- Author replies to others
- Company page posts
- Reshared posts with comments

## Output Format
The collected data includes:
- Post structure analysis
- Author identification traces
- Link extraction patterns
- DOM hierarchy mapping
- Loading behavior observations

## Next Steps
After collecting data from 20+ posts:
1. Analyze JSON output for consistent patterns
2. Identify reliable selectors
3. Document edge cases
4. Update implementation plan with findings