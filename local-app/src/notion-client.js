const { Client } = require('@notionhq/client');

class NotionClient {
    constructor(config) {
        this.config = config;
        this.notion = new Client({
            auth: config.notion.apiKey,
        });
        this.databaseId = config.notion.databaseId;
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
            
            // Create the page
            const response = await this.notion.pages.create({
                parent: {
                    database_id: this.databaseId,
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
                            name: 'LinkedIn Post'
                        }
                    },
                    'Tags': {
                        multi_select: [
                            {
                                name: 'LinkedIn'
                            },
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
            if (image.shareableUrl && image.shareableUrl.viewUrl && image.shareableUrl.viewUrl.startsWith('https://www.dropbox.com')) {
                // Use real Dropbox URL for embedding
                blocks.push({
                    object: 'block',
                    type: 'image',
                    image: {
                        type: 'external',
                        external: {
                            url: image.shareableUrl.streamingUrl
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
                
                // Add metadata about the image
                blocks.push({
                    object: 'block',
                    type: 'callout',
                    callout: {
                        rich_text: [
                            {
                                type: 'text',
                                text: {
                                    content: `✅ Image saved to Dropbox: ${image.dropboxPath}`
                                }
                            }
                        ],
                        icon: {
                            emoji: '💾'
                        },
                        color: 'gray_background'
                    }
                });
            } else if (image.dropboxPath) {
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
     * Build content blocks for the Notion page
     */
    buildContentBlocks(pageData) {
        const blocks = [];

        // Add post content as rich text
        if (pageData.content) {
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
                
                // Add note about shortening if applicable
                if (urlInfo.wasShortened) {
                    richTextElements.push({
                        type: 'text',
                        text: {
                            content: ` (expanded from: ${urlInfo.original})`
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

        blocks.push({
            object: 'block',
            type: 'callout',
            callout: {
                rich_text: [
                    {
                        type: 'text',
                        text: {
                            content: `📊 Saved via Notionally on ${new Date().toLocaleString()}\\n` +
                                   `Original LinkedIn post: ${pageData.sourceUrl}\\n` +
                                   `Author: ${pageData.author}`
                        }
                    }
                ],
                icon: {
                    emoji: '🤖'
                },
                color: 'gray_background'
            }
        });

        return blocks;
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
            
            return {
                user: {
                    id: response.id,
                    name: response.name,
                    type: response.type
                },
                database: {
                    id: database.id,
                    title: database.title[0]?.plain_text || 'Untitled',
                    properties: Object.keys(database.properties)
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
            const response = await this.notion.databases.query({
                database_id: this.databaseId,
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
