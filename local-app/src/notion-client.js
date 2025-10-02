const { Client } = require('@notionhq/client');

class NotionClient {
    constructor(config) {
        this.config = config;

        // v3.0.0: Require data source ID
        this.dataSourceId = config.notion.dataSourceId;
        if (!this.dataSourceId) {
            throw new Error(
                '❌ dataSourceId is required in v3.0.0\n' +
                '   Run: npm run fetch-data-source-id\n' +
                '   Then add NOTION_DATA_SOURCE_ID to your config'
            );
        }

        // v3.0.0: Default to API version 2025-09-03
        this.notion = new Client({
            auth: config.notion.apiKey,
            notionVersion: config.notion.apiVersion || '2025-09-03',
        });

        this.databaseId = config.notion.databaseId;
        this.apiVersion = config.notion.apiVersion || '2025-09-03';
    }
    
    /**
     * Check if Notion client is properly configured
     * @returns {boolean} True if configured with API key and database ID
     */
    isConfigured() {
        return !!(this.config.notion?.apiKey && this.databaseId);
    }

    /**
     * Fetch data source ID for the configured database (v3.0.0)
     * Required by Notion API 2025-09-03 for multi-source database support
     * @returns {Promise<string>} The data source ID
     */
    async fetchDataSourceId() {
        console.log('🔍 Fetching data source ID for database...');

        try {
            // First, try to get the database to see if it has data source info
            const database = await this.notion.databases.retrieve({
                database_id: this.databaseId,
            });

            // Check if the database response includes data source information
            // In the new API, databases are themselves data sources
            if (database.id) {
                this.dataSourceId = database.id;
                console.log(`✅ Data source ID retrieved: ${this.dataSourceId}`);
                console.log('💡 Save this ID in your config.json under notion.dataSourceId for future compatibility');
                return this.dataSourceId;
            }

            throw new Error('Could not determine data source ID');

        } catch (error) {
            console.error('❌ Failed to fetch data source ID:', error.message);
            console.error('💡 This is OK for now but may be required in future versions');
            // For backward compatibility, use database ID as fallback
            this.dataSourceId = this.databaseId;
            return this.dataSourceId;
        }
    }

    /**
     * Ensure we have a data source ID (v3.0.0)
     * Required - constructor will throw if not set
     */
    async ensureDataSourceId() {
        if (!this.dataSourceId) {
            await this.fetchDataSourceId();
        }
        return this.dataSourceId;
    }

    /**
     * Create a new Notion page with LinkedIn post content
     * @param {Object} pageData - Post data and media
     * @returns {Object} Created page info
     */
    async createPage(pageData) {
        console.log(`📋 Creating Notion page: "${pageData.title.substring(0, 50)}..."`);
        
        try {
            // Build the page content blocks
            const contentBlocks = this.buildContentBlocks(pageData);
            
            // Create the page (v3.0.0: Uses data_source_id with correct ID from data_sources array)
            const response = await this.notion.pages.create({
                parent: {
                    type: 'data_source_id',
                    data_source_id: this.dataSourceId,
                },
                properties: {
                    // Using hybrid schema: existing fields + new Notionally fields
                    'Name': {
                        title: [
                            {
                                text: {
                                    content: pageData.title
                                }
                            }
                        ]
                    },
                    'URL': {
                        url: pageData.sourceUrl
                    },
                    'Created': {
                        date: {
                            start: new Date(pageData.timestamp).toISOString()
                        }
                    },
                    'Type ': {
                        select: {
                            name: pageData.type === 'pulse_article' ? 'LinkedIn Article' : 'LinkedIn Post'
                        }
                    },
                    'Tags': {
                        multi_select: [
                            {
                                name: 'LinkedIn'
                            },
                            ...(pageData.type === 'pulse_article' ? [{ name: 'Article' }] : []),
                            ...(pageData.videos && pageData.videos.length > 0 ? [{ name: 'Video' }] : []),
                            {
                                name: pageData.author.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 30)
                            }
                        ]
                    },
                    // New Notionally-specific fields
                    'Author': {
                        rich_text: [
                            {
                                text: {
                                    content: pageData.author
                                }
                            }
                        ]
                    },
                    'Author Profile': {
                        url: pageData.authorProfileUrl || null
                    },
                    'Has Video': {
                        checkbox: pageData.videos && pageData.videos.length > 0
                    },
                    'Video Count': {
                        number: pageData.videos ? pageData.videos.length : 0
                    },
                    'Source Platform': {
                        select: {
                            name: 'LinkedIn'
                        }
                    },
                    'Status': {
                        select: {
                            name: 'Saved'
                        }
                    },
                    'Content preview': {
                        rich_text: [
                            {
                                text: {
                                    content: pageData.content ? pageData.content.substring(0, 200) + (pageData.content.length > 200 ? '...' : '') : ''
                                }
                            }
                        ]
                    },
                    'Script version': {
                        select: {
                            name: pageData.scriptVersion || 'Unknown'
                        }
                    }
                },
                children: contentBlocks
            });

            const pageUrl = `https://www.notion.so/${response.id.replace(/-/g, '')}`;
            
            console.log(`✅ Notion page created: ${pageUrl}`);
            
            return {
                id: response.id,
                url: pageUrl,
                title: pageData.title,
                created: response.created_time
            };
            
        } catch (error) {
            console.error('❌ Failed to create Notion page:', error.message);
            
            if (error.code === 'validation_error') {
                throw new Error(`Notion validation error: ${error.message}. Check your database schema and property names.`);
            } else if (error.code === 'unauthorized') {
                throw new Error('Notion API authorization failed. Check your API key and database permissions.');
            } else {
                throw new Error(`Notion API error: ${error.message}`);
            }
        }
    }

    /**
     * Add image blocks to an existing Notion page
     * @param {String} pageId - The Notion page ID
     * @param {Array} images - Array of image objects with base64 data
     * @param {String} sourceUrl - The original LinkedIn post URL
     */
    async addImagesToPage(pageId, images, sourceUrl = null) {
        console.log(`📸 Adding ${images.length} image(s) to Notion page...`);
        
        const blocks = [];
        
        // Add a divider before images
        blocks.push({
            object: 'block',
            type: 'divider',
            divider: {}
        });
        
        // Add heading for images section
        blocks.push({
            object: 'block',
            type: 'heading_3',
            heading_3: {
                rich_text: [
                    {
                        type: 'text',
                        text: {
                            content: `🖼️ Images (${images.length})`
                        }
                    }
                ]
            }
        });
        
        for (const image of images) {
            // Try to embed if we have a proper shareable URL, otherwise use callout
            if (image.shareableUrl && (typeof image.shareableUrl === 'object' ? image.shareableUrl.streamingUrl : image.shareableUrl)) {
                // Extract the streaming URL
                let streamingUrl;
                if (typeof image.shareableUrl === 'object' && image.shareableUrl.streamingUrl) {
                    streamingUrl = image.shareableUrl.streamingUrl;
                } else if (typeof image.shareableUrl === 'string') {
                    // Convert regular Dropbox URL to streaming format
                    streamingUrl = image.shareableUrl
                        .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
                        .replace('?dl=0', '');
                }
                
                // Try to embed the image
                blocks.push({
                    object: 'block',
                    type: 'image',
                    image: {
                        type: 'external',
                        external: {
                            url: streamingUrl
                        },
                        caption: image.alt ? [
                            {
                                type: 'text',
                                text: {
                                    content: image.alt
                                }
                            }
                        ] : []
                    }
                });
                
                // Add success message
                blocks.push({
                    object: 'block',
                    type: 'callout',
                    callout: {
                        rich_text: [
                            {
                                type: 'text',
                                text: {
                                    content: `✅ Image saved to Dropbox: ${image.dropboxPath || image.filename}`
                                }
                            }
                        ],
                        icon: {
                            emoji: '🖼️'
                        },
                        color: 'green_background'
                    }
                });
            } else if (image.dropboxPath || image.filename) {
                // Fallback: Since localhost URLs don't work in Notion, we'll add a descriptive block
                blocks.push({
                    object: 'block',
                    type: 'callout',
                    callout: {
                        rich_text: [
                            {
                                type: 'text',
                                text: {
                                    content: `📸 Image ${images.indexOf(image) + 1}: ${image.filename || 'LinkedIn Image'}\n`
                                }
                            },
                            {
                                type: 'text', 
                                text: {
                                    content: image.alt ? `Alt text: "${image.alt}"\n` : ''
                                }
                            },
                            {
                                type: 'text',
                                text: {
                                    content: `💾 Saved to Dropbox: ${image.dropboxPath}\n`
                                }
                            },
                            {
                                type: 'text',
                                text: {
                                    content: `📂 Location: ~/Dropbox (Personal)/LinkedIn_Videos/${image.dropboxPath}`
                                }
                            }
                        ],
                        icon: {
                            emoji: '🖼️'
                        },
                        color: 'blue_background'
                    }
                });
                
                // Add a note about viewing the image
                blocks.push({
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [
                            {
                                type: 'text',
                                text: {
                                    content: '💡 Image saved locally in your Dropbox folder. To embed in Notion, wait for Dropbox sync and use the share link.'
                                }
                            }
                        ]
                    }
                });
            }
        }
        
        try {
            // Append blocks to the existing page
            await this.notion.blocks.children.append({
                block_id: pageId,
                children: blocks
            });
            
            console.log(`✅ Successfully added ${images.length} image(s) to Notion page`);
            return true;
            
        } catch (error) {
            console.error('❌ Failed to add images to Notion page:', error.message);
            throw new Error(`Failed to add images: ${error.message}`);
        }
    }

    /**
     * Parse markdown content to Notion blocks (for Pulse articles only)
     */
    parseMarkdownToNotionBlocks(content) {
        const blocks = [];
        const lines = content.split('\n');
        let i = 0;
        
        while (i < lines.length) {
            const line = lines[i];
            
            // Skip empty lines
            if (!line.trim()) {
                i++;
                continue;
            }
            
            // Headings
            if (line.startsWith('### ')) {
                blocks.push({
                    object: 'block',
                    type: 'heading_3',
                    heading_3: {
                        rich_text: [{
                            type: 'text',
                            text: { content: line.substring(4).trim() }
                        }]
                    }
                });
            }
            else if (line.startsWith('## ')) {
                blocks.push({
                    object: 'block',
                    type: 'heading_2',
                    heading_2: {
                        rich_text: [{
                            type: 'text',
                            text: { content: line.substring(3).trim() }
                        }]
                    }
                });
            }
            else if (line.startsWith('# ')) {
                blocks.push({
                    object: 'block',
                    type: 'heading_1',
                    heading_1: {
                        rich_text: [{
                            type: 'text',
                            text: { content: line.substring(2).trim() }
                        }]
                    }
                });
            }
            // Blockquotes
            else if (line.startsWith('> ')) {
                const quoteLines = [];
                while (i < lines.length && lines[i].startsWith('> ')) {
                    quoteLines.push(lines[i].substring(2).trim());
                    i++;
                }
                i--; // Back up one since we'll increment at the end
                blocks.push({
                    object: 'block',
                    type: 'quote',
                    quote: {
                        rich_text: [{
                            type: 'text',
                            text: { content: quoteLines.join(' ') }
                        }]
                    }
                });
            }
            // Bullet lists
            else if (line.startsWith('• ')) {
                while (i < lines.length && lines[i].startsWith('• ')) {
                    blocks.push({
                        object: 'block',
                        type: 'bulleted_list_item',
                        bulleted_list_item: {
                            rich_text: [{
                                type: 'text',
                                text: { content: lines[i].substring(2).trim() }
                            }]
                        }
                    });
                    i++;
                }
                i--; // Back up one since we'll increment at the end
            }
            // Numbered lists
            else if (/^\d+\.\s/.test(line)) {
                while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
                    blocks.push({
                        object: 'block',
                        type: 'numbered_list_item',
                        numbered_list_item: {
                            rich_text: [{
                                type: 'text',
                                text: { content: lines[i].replace(/^\d+\.\s/, '').trim() }
                            }]
                        }
                    });
                    i++;
                }
                i--; // Back up one since we'll increment at the end
            }
            // Divider
            else if (line.trim() === '---') {
                blocks.push({
                    object: 'block',
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
                // Skip closing ``` if found
                if (i < lines.length && lines[i].startsWith('```')) {
                    i++;
                }
                blocks.push({
                    object: 'block',
                    type: 'code',
                    code: {
                        rich_text: [{
                            type: 'text',
                            text: { content: codeLines.join('\n') || ' ' } // Notion requires non-empty content
                        }],
                        language: 'plain text'
                    }
                });
                i--; // Back up one since we'll increment at the end
            }
            // Regular paragraphs
            else {
                // Collect continuous lines until we hit a blank line or special formatting
                const paragraphLines = [];
                while (i < lines.length && lines[i].trim() && 
                       !lines[i].startsWith('#') && !lines[i].startsWith('>') && 
                       !lines[i].startsWith('•') && !/^\d+\.\s/.test(lines[i]) && 
                       !lines[i].startsWith('```') && lines[i].trim() !== '---') {
                    paragraphLines.push(lines[i].trim());
                    i++;
                }
                i--; // Back up one since we'll increment at the end
                
                if (paragraphLines.length > 0) {
                    const paragraphText = paragraphLines.join(' ');
                    // Parse inline formatting
                    const richText = this.parseInlineFormatting(paragraphText);
                    
                    // Split long paragraphs if needed
                    const maxLength = 2000;
                    if (paragraphText.length <= maxLength) {
                        blocks.push({
                            object: 'block',
                            type: 'paragraph',
                            paragraph: {
                                rich_text: richText
                            }
                        });
                    } else {
                        // For long paragraphs, use simple text splitting
                        let remainingText = paragraphText;
                        while (remainingText.length > 0) {
                            const chunk = remainingText.substring(0, maxLength);
                            blocks.push({
                                object: 'block',
                                type: 'paragraph',
                                paragraph: {
                                    rich_text: [{
                                        type: 'text',
                                        text: { content: chunk }
                                    }]
                                }
                            });
                            remainingText = remainingText.substring(maxLength);
                        }
                    }
                }
            }
            
            i++;
        }
        
        return blocks;
    }
    
    /**
     * Parse inline markdown formatting (bold, italic, code, links)
     */
    parseInlineFormatting(text) {
        // For now, return simple text. Full inline parsing can be added later
        // This is complex due to nested formatting and would benefit from a proper parser
        return [{
            type: 'text',
            text: { content: text }
        }];
    }

    /**
     * Build content blocks for the Notion page
     */
    buildContentBlocks(pageData) {
        const blocks = [];

        // For Pulse articles, add cover image right at the top if available
        if (pageData.type === 'pulse_article' && pageData.coverImage) {
            console.log('🖼️ Adding Pulse article cover image');
            
            // Add the cover image
            if (pageData.coverImage.shareableUrl) {
                // Extract streaming URL for Dropbox
                let streamingUrl;
                if (typeof pageData.coverImage.shareableUrl === 'object' && pageData.coverImage.shareableUrl.streamingUrl) {
                    streamingUrl = pageData.coverImage.shareableUrl.streamingUrl;
                } else if (typeof pageData.coverImage.shareableUrl === 'string') {
                    streamingUrl = pageData.coverImage.shareableUrl
                        .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
                        .replace('?dl=0', '');
                }
                
                blocks.push({
                    object: 'block',
                    type: 'image',
                    image: {
                        type: 'external',
                        external: {
                            url: streamingUrl
                        },
                        caption: pageData.coverImage.caption ? [
                            {
                                type: 'text',
                                text: {
                                    content: pageData.coverImage.caption
                                }
                            }
                        ] : []
                    }
                });
            } else if (pageData.coverImage.url) {
                // Fallback: Add as callout if no shareable URL yet
                blocks.push({
                    object: 'block',
                    type: 'callout',
                    callout: {
                        rich_text: [
                            {
                                type: 'text',
                                text: {
                                    content: `📸 Cover Image: ${pageData.coverImage.caption || 'Pulse Article Cover'}`
                                }
                            }
                        ],
                        icon: {
                            emoji: '🖼️'
                        },
                        color: 'blue_background'
                    }
                });
            }
            
            // Add spacing after cover image
            blocks.push({
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [{
                        type: 'text',
                        text: { content: ' ' }
                    }]
                }
            });
        }

        // Add post content as rich text
        if (pageData.content) {
            // Check if this is a Pulse article - use markdown parser
            if (pageData.type === 'pulse_article') {
                console.log('📝 Parsing Pulse article markdown to Notion blocks');
                const markdownBlocks = this.parseMarkdownToNotionBlocks(pageData.content);
                blocks.push(...markdownBlocks);
            } else {
                // Keep existing logic for feed posts
                console.log('📄 Processing feed post content as paragraphs');
                // Split long content into paragraphs
                const paragraphs = pageData.content.split('\\n\\n').filter(p => p.trim());
                
                paragraphs.forEach(paragraph => {
                // Notion has a 2000 character limit per text block
                // Split long paragraphs into chunks
                const maxLength = 2000;
                const trimmedParagraph = paragraph.trim();
                
                if (trimmedParagraph.length <= maxLength) {
                    blocks.push({
                        object: 'block',
                        type: 'paragraph',
                        paragraph: {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: trimmedParagraph
                                    }
                                }
                            ]
                        }
                    });
                } else {
                    // Split long paragraph into multiple blocks
                    let remainingText = trimmedParagraph;
                    while (remainingText.length > 0) {
                        // Try to split at a sentence or word boundary
                        let splitPoint = maxLength;
                        if (remainingText.length > maxLength) {
                            // Look for sentence end
                            const sentenceEnd = remainingText.lastIndexOf('. ', maxLength);
                            if (sentenceEnd > maxLength * 0.7) {
                                splitPoint = sentenceEnd + 1;
                            } else {
                                // Look for word boundary
                                const wordEnd = remainingText.lastIndexOf(' ', maxLength);
                                if (wordEnd > maxLength * 0.7) {
                                    splitPoint = wordEnd;
                                }
                            }
                        }
                        
                        const chunk = remainingText.substring(0, splitPoint).trim();
                        remainingText = remainingText.substring(splitPoint).trim();
                        
                        blocks.push({
                            object: 'block',
                            type: 'paragraph',
                            paragraph: {
                                rich_text: [
                                    {
                                        type: 'text',
                                        text: {
                                            content: chunk
                                        }
                                    }
                                ]
                            }
                        });
                    }
                }
            });
            } // Close the else block for feed posts
        }

        // Add URLs/Links section if present
        if (pageData.processedUrls?.length > 0) {
            blocks.push({
                object: 'block',
                type: 'divider',
                divider: {}
            });
            
            blocks.push({
                object: 'block',
                type: 'heading_3',
                heading_3: {
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: `🔗 Links (${pageData.processedUrls.length})`
                            }
                        }
                    ]
                }
            });
            
            // Add each URL as a bulleted list item with clickable link
            pageData.processedUrls.forEach(urlInfo => {
                const richTextElements = [];
                
                // Add the clickable URL
                richTextElements.push({
                    type: 'text',
                    text: {
                        content: urlInfo.resolved,
                        link: {
                            url: urlInfo.resolved
                        }
                    }
                });
                
                // Add note about shortening if applicable AND if it was actually expanded
                if (urlInfo.wasShortened && urlInfo.original !== urlInfo.resolved) {
                    richTextElements.push({
                        type: 'text',
                        text: {
                            content: ` (expanded from: ${urlInfo.original})`
                        }
                    });
                } else if (urlInfo.wasShortened) {
                    // URL was detected as shortened but couldn't be expanded
                    richTextElements.push({
                        type: 'text',
                        text: {
                            content: ` (LinkedIn shortened URL)`
                        }
                    });
                }
                
                blocks.push({
                    object: 'block',
                    type: 'bulleted_list_item',
                    bulleted_list_item: {
                        rich_text: richTextElements
                    }
                });
            });
        }
        
        // Add divider before media
        if (pageData.videos?.length > 0 || pageData.images?.length > 0) {
            blocks.push({
                object: 'block',
                type: 'divider',
                divider: {}
            });
        }

        // Add videos
        if (pageData.videos?.length > 0) {
            blocks.push({
                object: 'block',
                type: 'heading_3',
                heading_3: {
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: `📹 Videos (${pageData.videos.length})`
                            }
                        }
                    ]
                }
            });

            pageData.videos.forEach((video, index) => {
                if (video.failed) {
                    // Add note about failed video download
                    blocks.push({
                        object: 'block',
                        type: 'callout',
                        callout: {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: `⚠️ Video ${index + 1} could not be downloaded\n` +
                                                `LinkedIn videos are often protected and cannot be saved automatically.\n` +
                                                `Original URL: ${video.originalUrl?.substring(0, 50)}...`
                                    }
                                }
                            ],
                            icon: {
                                emoji: '🎥'
                            },
                            color: 'yellow_background'
                        }
                    });
                } else {
                    // Add video embed block
                    blocks.push({
                        object: 'block',
                        type: 'video',
                        video: {
                            type: 'external',
                            external: {
                                url: video.shareableUrl.streamingUrl
                            }
                        }
                    });

                    // Add video details as a callout
                    blocks.push({
                        object: 'block',
                        type: 'callout',
                        callout: {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content: `Video ${index + 1}: ${video.filename}\\n` +
                                               `Size: ${this.formatFileSize(video.size)}\\n` +
                                               `Dropbox: ${video.dropboxPath}\\n` +
                                               `Share Link: ${video.shareableUrl.viewUrl}`
                                    }
                                }
                            ],
                            icon: {
                                emoji: '🎬'
                            },
                            color: 'blue_background'
                        }
                    });
                }
            });
        }

        // Images will be added in a separate step after page creation

        // Add metadata footer
        blocks.push({
            object: 'block',
            type: 'divider',
            divider: {}
        });

        // Build metadata footer with rich text formatting
        const metadataRichText = [
            {
                type: 'text',
                text: {
                    content: `📊 Saved via Notionally on ${new Date().toLocaleString()}\n`
                }
            },
            {
                type: 'text',
                text: {
                    content: 'Original LinkedIn post: '
                }
            },
            {
                type: 'text',
                text: {
                    content: pageData.sourceUrl,
                    link: {
                        url: pageData.sourceUrl
                    }
                }
            },
            {
                type: 'text',
                text: {
                    content: '\nAuthor: '
                }
            }
        ];
        
        // Add author with profile link if available
        if (pageData.authorProfileUrl) {
            metadataRichText.push({
                type: 'text',
                text: {
                    content: pageData.author,
                    link: {
                        url: pageData.authorProfileUrl
                    }
                }
            });
        } else {
            metadataRichText.push({
                type: 'text',
                text: {
                    content: pageData.author
                }
            });
        }
        
        blocks.push({
            object: 'block',
            type: 'callout',
            callout: {
                rich_text: metadataRichText,
                icon: {
                    emoji: '🤖'
                },
                color: 'gray_background'
            }
        });

        // Add debug information block if present
        if (pageData.debugInfo) {
            blocks.push({
                object: 'block',
                type: 'divider',
                divider: {}
            });
            
            blocks.push({
                object: 'block',
                type: 'toggle',
                toggle: {
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: '🐛 Debug Information (click to expand)'
                            }
                        }
                    ],
                    children: this.buildDebugBlocks(pageData.debugInfo)
                }
            });
        }
        
        return blocks;
    }
    
    /**
     * Build debug information blocks
     */
    buildDebugBlocks(debugInfo) {
        const blocks = [];
        
        // Client info
        blocks.push({
            object: 'block',
            type: 'heading_3',
            heading_3: {
                rich_text: [{
                    type: 'text',
                    text: { content: '📱 Client Information' }
                }]
            }
        });
        
        blocks.push({
            object: 'block',
            type: 'code',
            code: {
                language: 'json',
                rich_text: [{
                    type: 'text',
                    text: {
                        content: JSON.stringify({
                            scriptVersion: debugInfo.client?.scriptVersion,
                            timestamp: debugInfo.client?.timestamp,
                            userAgent: debugInfo.client?.userAgent,
                            pageUrl: debugInfo.client?.pageUrl,
                            urlStats: debugInfo.client?.urlStats
                        }, null, 2).substring(0, 2000) // Notion limit
                    }
                }]
            }
        });
        
        // Server info
        blocks.push({
            object: 'block',
            type: 'heading_3',
            heading_3: {
                rich_text: [{
                    type: 'text',
                    text: { content: '🖥️ Server Information' }
                }]
            }
        });
        
        blocks.push({
            object: 'block',
            type: 'code',
            code: {
                language: 'json',
                rich_text: [{
                    type: 'text',
                    text: {
                        content: JSON.stringify({
                            appVersion: debugInfo.server?.appVersion,
                            timestamp: debugInfo.server?.timestamp,
                            urlsProcessed: debugInfo.server?.urlsProcessed,
                            urlResolutionResults: debugInfo.server?.urlResolutionResults
                        }, null, 2).substring(0, 2000) // Notion limit
                    }
                }]
            }
        });
        
        // Client logs (last 10)
        if (debugInfo.client?.logs?.length > 0) {
            blocks.push({
                object: 'block',
                type: 'heading_3',
                heading_3: {
                    rich_text: [{
                        type: 'text',
                        text: { content: '📋 Client Logs (last 10)' }
                    }]
                }
            });
            
            const lastLogs = debugInfo.client.logs.slice(-10);
            blocks.push({
                object: 'block',
                type: 'code',
                code: {
                    language: 'plain text',  // Notion requires "plain text" with a space
                    rich_text: [{
                        type: 'text',
                        text: {
                            content: lastLogs.map(log => 
                                `[${log.timestamp}] ${log.level}: ${log.message}`
                            ).join('\n').substring(0, 2000)
                        }
                    }]
                }
            });
        }
        
        // Server logs (last 10)
        if (debugInfo.server?.logs?.length > 0) {
            blocks.push({
                object: 'block',
                type: 'heading_3',
                heading_3: {
                    rich_text: [{
                        type: 'text',
                        text: { content: '📋 Server Logs (last 10)' }
                    }]
                }
            });
            
            const lastLogs = debugInfo.server.logs.slice(-10);
            blocks.push({
                object: 'block',
                type: 'code',
                code: {
                    language: 'plain text',  // Notion requires "plain text" with a space
                    rich_text: [{
                        type: 'text',
                        text: {
                            content: lastLogs.map(log => 
                                `[${log.timestamp}] ${log.level}: ${log.message}`
                            ).join('\n').substring(0, 2000)
                        }
                    }]
                }
            });
        }
        
        return blocks;
    }

    /**
     * Find a Notion page by its LinkedIn URL
     * @param {string} url - The LinkedIn post URL
     * @returns {Object|null} The found page or null
     */
    async findPageByUrl(url) {
        console.log(`🔍 Searching for Notion page with URL: ${url}`);

        try {
            // v3.0.0: Use dataSources.query() instead of databases.query()
            const response = await this.notion.dataSources.query({
                data_source_id: this.dataSourceId,
                filter: {
                    property: 'URL',
                    url: {
                        equals: url
                    }
                }
            });
            
            if (response.results.length > 0) {
                console.log(`✅ Found existing Notion page: ${response.results[0].id}`);
                return response.results[0];
            }
            
            console.log('ℹ️ No existing Notion page found for this URL');
            return null;
            
        } catch (error) {
            console.error('❌ Error searching for page:', error.message);
            throw error;
        }
    }
    
    /**
     * Append links to an existing Notion page
     * @param {string} pageId - The Notion page ID
     * @param {Object} linkData - Data containing author and links
     * @returns {Object} Update result
     */
    async appendLinksToPage(pageId, linkData) {
        const { postAuthor, links } = linkData;
        console.log(`📎 Appending ${links.length} links to page ${pageId}`);
        
        const blocks = [];
        
        // Add a divider
        blocks.push({
            object: 'block',
            type: 'divider',
            divider: {}
        });
        
        // Add section header
        blocks.push({
            object: 'block',
            type: 'heading_2',
            heading_2: {
                rich_text: [{
                    type: 'text',
                    text: { 
                        content: '🔗 Links from Comments' 
                    }
                }]
            }
        });
        
        // Add timestamp
        blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
                rich_text: [{
                    type: 'text',
                    text: { 
                        content: `Added on ${new Date().toLocaleString()}`,
                    },
                    annotations: {
                        italic: true,
                        color: 'gray'
                    }
                }]
            }
        });
        
        // Add each link as a callout block
        links.forEach((link, index) => {
            blocks.push({
                object: 'block',
                type: 'callout',
                callout: {
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: `${link.author}: `
                            },
                            annotations: {
                                bold: true
                            }
                        },
                        {
                            type: 'text',
                            text: {
                                content: link.url,
                                link: { url: link.url }
                            },
                            annotations: {
                                color: 'blue'
                            }
                        }
                    ],
                    icon: {
                        emoji: '💬'
                    },
                    color: 'blue_background'
                }
            });
        });
        
        try {
            // Append blocks to the existing page
            const result = await this.notion.blocks.children.append({
                block_id: pageId,
                children: blocks
            });
            
            console.log(`✅ Successfully appended ${links.length} links to Notion page`);
            return result;
            
        } catch (error) {
            console.error('❌ Failed to append links to Notion page:', error.message);
            throw new Error(`Failed to append links: ${error.message}`);
        }
    }

    /**
     * Append a comment to an existing Notion page
     * @param {string} pageId - The Notion page ID
     * @param {Object} commentData - Data containing comment info
     * @returns {Object} Update result
     */
    async appendCommentToPage(pageId, commentData) {
        const { postAuthor, comment } = commentData;
        console.log(`💬 Appending comment to page ${pageId}`);
        
        const blocks = [];
        
        // Add a divider
        blocks.push({
            object: 'block',
            type: 'divider',
            divider: {}
        });
        
        // Add section header
        blocks.push({
            object: 'block',
            type: 'heading_2',
            heading_2: {
                rich_text: [{
                    type: 'text',
                    text: { 
                        content: '💬 Comment from LinkedIn' 
                    }
                }]
            }
        });
        
        // Add timestamp and author
        blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
                rich_text: [
                    {
                        type: 'text',
                        text: { 
                            content: `By ${comment.author} • Added on ${new Date().toLocaleString()}`,
                        },
                        annotations: {
                            italic: true,
                            color: 'gray'
                        }
                    }
                ]
            }
        });
        
        // Add comment content as a callout
        blocks.push({
            object: 'block',
            type: 'callout',
            callout: {
                rich_text: [{
                    type: 'text',
                    text: {
                        content: comment.content
                    }
                }],
                icon: {
                    emoji: '💭'
                },
                color: 'gray_background'
            }
        });
        
        // Add links if present
        if (comment.urls && comment.urls.length > 0) {
            blocks.push({
                object: 'block',
                type: 'heading_3',
                heading_3: {
                    rich_text: [{
                        type: 'text',
                        text: { 
                            content: '🔗 Links in comment' 
                        }
                    }]
                }
            });
            
            comment.urls.forEach((url, index) => {
                blocks.push({
                    object: 'block',
                    type: 'bulleted_list_item',
                    bulleted_list_item: {
                        rich_text: [{
                            type: 'text',
                            text: {
                                content: url,
                                link: { url }
                            },
                            annotations: {
                                color: 'blue'
                            }
                        }]
                    }
                });
            });
        }
        
        try {
            // Append blocks to the existing page
            const result = await this.notion.blocks.children.append({
                block_id: pageId,
                children: blocks
            });
            
            console.log(`✅ Successfully appended comment to Notion page`);
            return result;
            
        } catch (error) {
            console.error('❌ Failed to append comment to Notion page:', error.message);
            throw new Error(`Failed to append comment: ${error.message}`);
        }
    }

    /**
     * Test connection to Notion API
     */
    async testConnection() {
        console.log('🧪 Testing Notion API connection...');
        
        try {
            // Test 1: Check API authentication
            const response = await this.notion.users.me();
            console.log(`✅ Notion API authenticated as: ${response.name || response.id}`);
            
            // Test 2: Check database access
            const database = await this.notion.databases.retrieve({
                database_id: this.databaseId,
            });
            
            console.log(`✅ Database accessible: "${database.title[0]?.plain_text || 'Untitled'}"`);

            // SDK v5.1.0: databases now have data_sources instead of direct properties
            const dataSources = database.data_sources || [];

            return {
                user: {
                    id: response.id,
                    name: response.name,
                    type: response.type
                },
                database: {
                    id: database.id,
                    title: database.title[0]?.plain_text || 'Untitled',
                    properties: dataSources.length,
                    dataSources: dataSources
                }
            };
            
        } catch (error) {
            if (error.code === 'unauthorized') {
                throw new Error('Notion API key is invalid or expired');
            } else if (error.code === 'object_not_found') {
                throw new Error('Database not found - check your database ID');
            } else {
                throw new Error(`Notion API test failed: ${error.message}`);
            }
        }
    }

    /**
     * Create a test page to verify everything works
     */
    async createTestPage() {
        console.log('🧪 Creating test Notion page...');
        
        const testData = {
            title: 'Test Page from Notionally',
            content: 'This is a test page created by Notionally to verify the integration is working correctly.\\n\\nIf you can see this, everything is set up properly!',
            author: 'Notionally Test',
            sourceUrl: 'https://github.com/yourusername/Notionally',
            timestamp: new Date().toISOString(),
            videos: [],
            images: []
        };
        
        return await this.createPage(testData);
    }

    /**
     * Query existing pages to avoid duplicates
     */
    async findExistingPage(sourceUrl) {
        try {
            // v3.0.0: Use dataSources.query() instead of databases.query()
            const response = await this.notion.dataSources.query({
                data_source_id: this.dataSourceId,
                filter: {
                    property: 'URL',
                    url: {
                        equals: sourceUrl
                    }
                }
            });
            
            return response.results.length > 0 ? response.results[0] : null;
            
        } catch (error) {
            console.warn('Warning: Could not check for existing pages:', error.message);
            return null;
        }
    }

    /**
     * Utility functions
     */
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
}

module.exports = NotionClient;
