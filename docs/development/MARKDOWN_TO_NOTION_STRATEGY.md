# Markdown to Notion Conversion Strategy (Pulse Articles Only)

**IMPORTANT**: This conversion applies ONLY to LinkedIn Pulse articles. Feed posts should continue using the existing simple text extraction that works perfectly.

## Current State

### Client-Side (Greasemonkey Script v1.15.1)
The `extractPulseFormattedContent` function extracts LinkedIn Pulse articles as markdown:
- `# Heading 1` → h1
- `## Heading 2` → h2  
- `### Heading 3` → h3
- `> Quote text` → blockquote
- `**Bold text**` → bold
- `*Italic text*` → italic
- `` `code` `` → inline code
- ``` ```code block``` ``` → code block
- `[Link text](url)` → link
- `• List item` → bullet list
- `1. Numbered item` → numbered list
- `---` → divider

### Server-Side (local-app/src/notion-client.js)
Currently just splits by `\n\n` and creates paragraph blocks for everything.

## Proposed Enhancement

### Option 1: Parse Markdown on Server (Recommended)
Update `notion-client.js` to parse markdown ONLY for Pulse articles (`type: 'pulse_article'`), while keeping feed posts unchanged:

```javascript
// In notion-client.js createPage method:
async createPage(pageData) {
    // ... existing code ...
    
    // Check if this is a Pulse article
    if (pageData.type === 'pulse_article' && pageData.content) {
        // Use markdown parser for Pulse articles
        blocks.push(...parseMarkdownToNotionBlocks(pageData.content));
    } else {
        // Keep existing logic for feed posts
        const paragraphs = pageData.content.split('\\n\\n').filter(p => p.trim());
        paragraphs.forEach(paragraph => {
            // ... existing paragraph creation logic ...
        });
    }
    
    // ... rest of existing code ...
}

function parseMarkdownToNotionBlocks(content) {
    const blocks = [];
    const lines = content.split('\n');
    let i = 0;
    
    while (i < lines.length) {
        const line = lines[i];
        
        // Headings
        if (line.startsWith('### ')) {
            blocks.push({
                type: 'heading_3',
                heading_3: {
                    rich_text: [{
                        type: 'text',
                        text: { content: line.substring(4) }
                    }]
                }
            });
        }
        else if (line.startsWith('## ')) {
            blocks.push({
                type: 'heading_2',
                heading_2: {
                    rich_text: [{
                        type: 'text',
                        text: { content: line.substring(3) }
                    }]
                }
            });
        }
        else if (line.startsWith('# ')) {
            blocks.push({
                type: 'heading_1',
                heading_1: {
                    rich_text: [{
                        type: 'text',
                        text: { content: line.substring(2) }
                    }]
                }
            });
        }
        // Blockquotes
        else if (line.startsWith('> ')) {
            const quoteLines = [];
            while (i < lines.length && lines[i].startsWith('> ')) {
                quoteLines.push(lines[i].substring(2));
                i++;
            }
            blocks.push({
                type: 'quote',
                quote: {
                    rich_text: [{
                        type: 'text',
                        text: { content: quoteLines.join('\n') }
                    }]
                }
            });
            continue;
        }
        // Bullet lists
        else if (line.startsWith('• ')) {
            const listItems = [];
            while (i < lines.length && lines[i].startsWith('• ')) {
                listItems.push(lines[i].substring(2));
                i++;
            }
            blocks.push({
                type: 'bulleted_list_item',
                bulleted_list_item: {
                    rich_text: listItems.map(item => ({
                        type: 'text',
                        text: { content: item }
                    }))
                }
            });
            continue;
        }
        // Numbered lists
        else if (/^\d+\. /.test(line)) {
            const listItems = [];
            while (i < lines.length && /^\d+\. /.test(lines[i])) {
                listItems.push(lines[i].replace(/^\d+\. /, ''));
                i++;
            }
            blocks.push({
                type: 'numbered_list_item',
                numbered_list_item: {
                    rich_text: listItems.map(item => ({
                        type: 'text',
                        text: { content: item }
                    }))
                }
            });
            continue;
        }
        // Divider
        else if (line === '---') {
            blocks.push({
                type: 'divider',
                divider: {}
            });
        }
        // Code blocks
        else if (line.startsWith('```')) {
            const codeLines = [];
            i++; // Skip opening ```
            while (i < lines.length && !lines[i].startsWith('```')) {
                codeLines.push(lines[i]);
                i++;
            }
            blocks.push({
                type: 'code',
                code: {
                    rich_text: [{
                        type: 'text',
                        text: { content: codeLines.join('\n') }
                    }],
                    language: 'plain text'
                }
            });
        }
        // Regular paragraphs
        else if (line.trim()) {
            // Parse inline formatting (bold, italic, code, links)
            const richText = parseInlineFormatting(line);
            blocks.push({
                type: 'paragraph',
                paragraph: {
                    rich_text: richText
                }
            });
        }
        
        i++;
    }
    
    return blocks;
}

function parseInlineFormatting(text) {
    const richText = [];
    let currentText = '';
    let i = 0;
    
    while (i < text.length) {
        // Bold
        if (text.substring(i, i+2) === '**') {
            if (currentText) {
                richText.push({ type: 'text', text: { content: currentText } });
                currentText = '';
            }
            i += 2;
            const endIndex = text.indexOf('**', i);
            if (endIndex !== -1) {
                richText.push({
                    type: 'text',
                    text: { content: text.substring(i, endIndex) },
                    annotations: { bold: true }
                });
                i = endIndex + 2;
            }
        }
        // Italic
        else if (text[i] === '*' && text[i+1] !== '*') {
            if (currentText) {
                richText.push({ type: 'text', text: { content: currentText } });
                currentText = '';
            }
            i++;
            const endIndex = text.indexOf('*', i);
            if (endIndex !== -1) {
                richText.push({
                    type: 'text',
                    text: { content: text.substring(i, endIndex) },
                    annotations: { italic: true }
                });
                i = endIndex + 1;
            }
        }
        // Inline code
        else if (text[i] === '`') {
            if (currentText) {
                richText.push({ type: 'text', text: { content: currentText } });
                currentText = '';
            }
            i++;
            const endIndex = text.indexOf('`', i);
            if (endIndex !== -1) {
                richText.push({
                    type: 'text',
                    text: { content: text.substring(i, endIndex) },
                    annotations: { code: true }
                });
                i = endIndex + 1;
            }
        }
        // Links [text](url)
        else if (text[i] === '[') {
            const linkMatch = text.substring(i).match(/^\[([^\]]+)\]\(([^)]+)\)/);
            if (linkMatch) {
                if (currentText) {
                    richText.push({ type: 'text', text: { content: currentText } });
                    currentText = '';
                }
                richText.push({
                    type: 'text',
                    text: { 
                        content: linkMatch[1],
                        link: { url: linkMatch[2] }
                    }
                });
                i += linkMatch[0].length;
            } else {
                currentText += text[i];
                i++;
            }
        }
        else {
            currentText += text[i];
            i++;
        }
    }
    
    if (currentText) {
        richText.push({ type: 'text', text: { content: currentText } });
    }
    
    return richText;
}
```

### Option 2: Send Structured Data from Client
Instead of markdown, send structured data:

```javascript
{
    type: 'pulse_article',
    blocks: [
        { type: 'heading2', content: 'Section Title' },
        { type: 'paragraph', content: 'Some text with **bold** and *italic*' },
        { type: 'quote', content: 'A quoted passage' },
        { type: 'bulletList', items: ['Item 1', 'Item 2'] },
        // etc.
    ]
}
```

### Option 3: Use Existing Markdown Parser Library
Install a markdown-to-notion library on the server:
- `md-to-notion` 
- `notion-markdown-parser`
- Custom parser based on `marked` or `markdown-it`

## Recommendation

**Go with Option 1** - Parse markdown on server:
1. Keeps client-side script simpler
2. Server already has access to Notion API
3. Easier to maintain and update conversion logic
4. Can handle edge cases better
5. Single source of truth for Notion formatting

## Implementation Steps

1. **Update server's notion-client.js**:
   - Add `parseMarkdownToNotionBlocks` function for Pulse articles only
   - Add type check: `if (pageData.type === 'pulse_article')`
   - Keep existing paragraph logic for feed posts (`type: 'feed_post'`)
   - Test with various markdown formats from Pulse articles

2. **Keep client-side as-is**:
   - v1.15.1's `extractPulseFormattedContent` already produces clean markdown for Pulse
   - Feed posts continue using direct textContent extraction
   - No changes needed to either extraction method

3. **Test thoroughly**:
   - Headings (h1, h2, h3)
   - Lists (bullet and numbered)
   - Quotes
   - Code blocks
   - Inline formatting (bold, italic, code)
   - Links
   - Mixed content

## Benefits

- Rich, properly formatted Notion pages for Pulse articles
- Preserves article structure and hierarchy
- Better readability in Notion for long-form content
- Feed posts remain simple and clean (no over-formatting)
- Different content types get appropriate treatment
- Professional-looking saved articles without breaking existing functionality