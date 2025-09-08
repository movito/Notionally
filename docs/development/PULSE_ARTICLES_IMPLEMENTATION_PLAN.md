# LinkedIn Pulse Articles Implementation Plan - v1.9.0

## Overview
Add support for saving LinkedIn Pulse articles (long-form blog posts) to Notion, similar to how we currently save feed posts.

## Key Findings from Analysis

### Critical DOM Elements
1. **Container**: `.reader-actions` - Main container for all article actions
2. **Dropdown Trigger**: `.artdeco-dropdown__trigger` with `aria-label="Open article options dropdown menu"`
3. **Dropdown Content**: `.reader-overflow-options__content` - Populated dynamically on click
4. **Save Button**: Separate save button with `aria-label="Save"` (bookmark icon)

### Important Differences from Feed Posts
- Pulse articles use `.reader-actions` container instead of feed-specific containers
- Dropdown class is `.reader-overflow-options__content` (not `.feed-shared-control-menu__content`)
- Article data is embedded in page as JSON within script tags
- Content is structured with typed blocks (textBlock, imageBlock, videoBlock, etc.)

## Current Understanding

### Pulse Article Structure
- **URL Pattern**: `https://www.linkedin.com/pulse/[article-slug]-[author-name]/`
- **Options Menu**: Uses same dropdown structure as feed posts
  - Button: `artdeco-dropdown__trigger` with overflow icon
  - Content: `artdeco-dropdown__content` populated dynamically
  - Class: `reader-overflow-options__content` (specific to Pulse articles)

### Key HTML Elements (from Pulse1.html example)

#### Main Container
- **Reader Actions Container**: `<div class="reader-actions">` - Contains all action buttons including dropdown

#### Dropdown Structure
```html
<div class="reader-actions">
    <!-- Save button -->
    <button aria-label="Save" class="artdeco-button artdeco-button--circle">
        <svg class="artdeco-button__icon">
            <use href="#bookmark-outline-small"></use>
        </svg>
    </button>
    
    <!-- Options dropdown -->
    <div class="artdeco-dropdown artdeco-dropdown--placement-bottom artdeco-dropdown--justification-right">
        <button aria-expanded="false" class="artdeco-dropdown__trigger artdeco-dropdown__trigger--placement-bottom artdeco-button artdeco-button--secondary artdeco-button--muted artdeco-button--1 artdeco-button--circle">
            <svg aria-label="Open article options dropdown menu" class="artdeco-button__icon">
                <use href="#overflow-web-ios-small"></use>
            </svg>
        </button>
        <div class="artdeco-dropdown__content reader-overflow-options__content">
            <!-- Menu items populated dynamically when clicked -->
        </div>
    </div>
</div>
```

## Implementation Requirements

### 1. Article Detection
- Detect when user is on a Pulse article page
- URL pattern matching: `/pulse/`
- DOM element detection: `.reader-overflow-options__content`

### 2. Data Extraction
Need to extract:
- **Title**: Article headline
- **Author**: Writer's name and profile link
- **Content**: Full article text (may be long-form)
- **Published Date**: Article publication timestamp
- **Images**: Hero image and inline images
- **Tags/Topics**: Article categories
- **Reading Time**: Estimated read time
- **Engagement**: Views, likes, comments count

### 3. Menu Integration
- Monitor for dropdown trigger clicks
- Wait for dynamic content loading
- Insert "Save to Notion" option
- Handle click events

### 4. Server-Side Changes
- New endpoint or extend existing `/linkedin/save`
- Handle longer content (articles vs posts)
- Different Notion page template for articles
- Preserve article formatting (headers, lists, etc.)

## Technical Approach

### Phase 1: Detection & Basic Extraction
```javascript
// Detect Pulse article pages
function isPulseArticle() {
    return window.location.pathname.includes('/pulse/') || 
           document.querySelector('.reader-article-content');
}

// Extract article data
function extractPulseArticleData() {
    return {
        type: 'pulse_article',
        title: document.querySelector('.reader-article-header__title')?.textContent,
        author: {
            name: document.querySelector('.reader-author-info__name')?.textContent,
            profileUrl: document.querySelector('.reader-author-info__link')?.href
        },
        content: extractArticleContent(),
        publishedDate: document.querySelector('time')?.getAttribute('datetime'),
        url: window.location.href,
        // ... more fields
    };
}
```

### Phase 2: Dropdown Integration
```javascript
// Watch for Pulse article dropdown - Updated with correct selectors
function observePulseDropdown() {
    // First, check if we're on a Pulse article page
    if (!isPulseArticle()) return;
    
    // Find the reader-actions container
    const readerActions = document.querySelector('.reader-actions');
    if (!readerActions) return;
    
    // Find the dropdown trigger button
    const dropdownTrigger = readerActions.querySelector('.artdeco-dropdown__trigger[aria-label*="article options"]');
    if (!dropdownTrigger) return;
    
    // Add click listener to the trigger
    dropdownTrigger.addEventListener('click', function() {
        // Wait for dropdown content to populate
        setTimeout(() => {
            const dropdownContent = readerActions.querySelector('.reader-overflow-options__content');
            if (dropdownContent && !dropdownContent.querySelector('.save-to-notion-option')) {
                addSaveToPulseDropdown(dropdownContent);
            }
        }, 100);
    });
    
    // Also observe for dynamic changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            // Look for reader-overflow-options__content
            if (mutation.target.classList?.contains('reader-overflow-options__content')) {
                // Add save option when menu populates
                if (mutation.addedNodes.length > 0) {
                    addSaveToPulseDropdown(mutation.target);
                }
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}
```

### Phase 3: Content Preservation
- Maintain article structure (headers, paragraphs, lists)
- Convert LinkedIn formatting to Notion blocks
- Handle code blocks if present
- Preserve inline links

## Implementation Steps

### Step 1: Research & Analysis
- [ ] Analyze full Pulse article DOM structure
- [ ] Document all data fields available
- [ ] Test dropdown behavior on multiple articles
- [ ] Identify differences from feed posts

### Step 2: Client-Side Implementation
- [ ] Add Pulse article detection
- [ ] Implement article data extraction
- [ ] Add dropdown observer for Pulse pages
- [ ] Create "Save to Notion" menu item
- [ ] Test extraction on various article types

### Step 3: Server-Side Updates
- [ ] Extend sanitization for long-form content
- [ ] Add article-specific Notion formatting
- [ ] Handle larger payloads
- [ ] Test with various article lengths

### Step 4: Integration Testing
- [ ] Test full pipeline (extraction → server → Notion)
- [ ] Verify formatting preservation
- [ ] Test error handling
- [ ] Ensure no regression on feed posts

### Step 5: Polish & Release
- [ ] Add loading states for long articles
- [ ] Implement success/error notifications
- [ ] Update documentation
- [ ] Version bump to 1.9.0

## Differences from Feed Posts

| Aspect | Feed Posts | Pulse Articles |
|--------|------------|----------------|
| Content Length | Short (< 3000 chars) | Long (5000+ chars) |
| Structure | Simple text + media | Headers, sections, lists |
| URL Pattern | `/feed/update/` | `/pulse/` |
| Dropdown Class | `feed-shared-control-menu__content` | `reader-overflow-options__content` |
| Author Info | Profile badge | Author bio section |
| Media | Attached images/videos | Inline images, hero image |
| Engagement | Reactions, comments | Views, reads, shares |

## Risk Mitigation

### Performance
- **Risk**: Large articles may slow down extraction
- **Mitigation**: Implement progressive extraction, send in chunks

### Content Formatting
- **Risk**: Complex formatting lost in translation
- **Mitigation**: Map LinkedIn elements to Notion blocks carefully

### DOM Changes
- **Risk**: LinkedIn updates article structure
- **Mitigation**: Use multiple selectors, graceful fallbacks

## Success Criteria
1. ✅ Can detect Pulse article pages
2. ✅ "Save to Notion" appears in article dropdown
3. ✅ Full article content saved to Notion
4. ✅ Formatting preserved (headers, lists, links)
5. ✅ Images downloaded and embedded
6. ✅ No regression on feed post functionality

## Timeline Estimate
- Research & Analysis: 2 hours
- Client-side implementation: 3 hours
- Server-side updates: 2 hours
- Testing & refinement: 2 hours
- **Total: ~9 hours**

## Next Steps
1. Get full HTML of a Pulse article page for analysis
2. Create test article dataset
3. Begin implementation with detection logic
4. Iterate based on findings