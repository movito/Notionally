# HTML Entity Handling in LinkedIn Text Extraction

## The Problem

LinkedIn's DOM contains HTML-encoded entities in post content:
- Quotes: `&quot;` instead of `"`
- Apostrophes: `&#x27;` instead of `'`
- Forward slashes: `&#x2F;` instead of `/`
- Ampersands: `&amp;` instead of `&`

When we extracted text using `innerHTML`, these entities were not being properly decoded, resulting in Notion pages containing encoded text like `He said &quot;Hello&quot;` instead of `He said "Hello"`.

## Why It Happened

The issue was introduced when we added line break preservation logic:

```javascript
// PROBLEMATIC CODE (v1.6.0 - v1.7.1):
const html = textElement.innerHTML;
let formattedText = html.replace(/<br\s*\/?>/gi, '\n');
formattedText = formattedText.replace(/<\/p>\s*<p[^>]*>/gi, '\n\n');

const tempDiv = document.createElement('div');
tempDiv.innerHTML = formattedText;  // This doesn't decode entities properly
postText = tempDiv.textContent;     // Entities remain encoded!
```

The problem: When we set `innerHTML` with already-encoded entities, the browser doesn't decode them when we extract with `textContent`.

## The Solution (v1.7.2)

We now use placeholders for line breaks to avoid interference with HTML entity decoding:

```javascript
// FIXED CODE (v1.7.2+):
// Use placeholders that won't be affected by HTML parsing
const brPlaceholder = '___NEWLINE___';
const pPlaceholder = '___PARAGRAPH___';

// Replace line break elements with placeholders
let html = clonedElement.innerHTML;
html = html.replace(/<br\s*\/?>/gi, brPlaceholder);
html = html.replace(/<\/p>\s*<p[^>]*>/gi, pPlaceholder);

// Let the browser decode HTML entities
const tempDiv = document.createElement('div');
tempDiv.innerHTML = html;
postText = tempDiv.textContent;  // Entities are now properly decoded!

// Replace placeholders with actual line breaks
postText = postText.replace(new RegExp(brPlaceholder, 'g'), '\n');
postText = postText.replace(new RegExp(pPlaceholder, 'g'), '\n\n');
```

## Testing

Run the HTML entity test suite:
```bash
npm run test-entities
```

This tests common HTML entities:
- `&quot;` → `"`
- `&#x27;` → `'`
- `&#x2F;` → `/`
- `&amp;` → `&`
- `&lt;` / `&gt;` → `<` / `>`

## Guardrails to Prevent Regression

### 1. Automated Testing
The `test-html-entities.js` script validates that:
- Common HTML entities are decoded correctly
- Already-decoded text is not double-decoded
- Special characters are preserved through JSON transfer

### 2. Debug Logging
The Greasemonkey script now logs when HTML entities are detected and decoded:
```javascript
if (html.includes('&quot;') || html.includes('&#x') || html.includes('&amp;')) {
    log('Decoded HTML entities in post text');
}
```

### 3. Manual Testing Checklist
When testing text extraction changes:
- [ ] Test posts with quotes: `"Hello World"`
- [ ] Test posts with apostrophes: `It's amazing`
- [ ] Test posts with URLs: `https://example.com`
- [ ] Test posts with ampersands: `R&D Department`
- [ ] Test posts with special characters: `< > & " '`

### 4. Code Review Guidelines
When reviewing text extraction changes:
1. Check if `innerHTML` is used - it returns HTML-encoded text
2. Ensure HTML entities are properly decoded before sending to server
3. Verify line break handling doesn't interfere with entity decoding
4. Run `npm test` to validate entity handling

## Common Pitfalls to Avoid

### ❌ DON'T: Use innerHTML without decoding
```javascript
// BAD: Entities remain encoded
const text = element.innerHTML;
sendToServer({ text }); // Sends &quot; instead of "
```

### ❌ DON'T: Mix line break handling with entity decoding
```javascript
// BAD: Can interfere with proper decoding
const html = element.innerHTML.replace(/<br>/g, '\n');
div.innerHTML = html; // May not decode entities properly
```

### ✅ DO: Use placeholders for line breaks
```javascript
// GOOD: Separates concerns
const html = element.innerHTML.replace(/<br>/g, '___NEWLINE___');
div.innerHTML = html; // Decodes entities
text = div.textContent.replace(/___NEWLINE___/g, '\n');
```

### ✅ DO: Test with real LinkedIn posts
Always test with posts containing:
- Quotation marks in text
- URLs with special characters
- Code snippets with symbols
- International characters

## Browser vs Server Behavior

### Browser (Greasemonkey Script)
- `innerHTML` returns HTML-encoded entities
- Setting `innerHTML` and reading `textContent` decodes entities
- Works correctly for all Unicode characters including emoji

### Server (Node.js)
- Receives decoded text via JSON
- Should never receive HTML entities
- If entities are detected server-side, it's a client-side bug

## Monitoring

Look for these warning signs in production:
1. Notion pages containing `&quot;`, `&#x27;`, etc.
2. URLs broken due to encoded slashes
3. User reports of "weird characters" in saved posts

## Version History

- **v1.5.x - v1.7.1**: Had HTML entity encoding issue
- **v1.7.2**: Fixed with placeholder approach
- **Future**: Must maintain entity decoding test coverage