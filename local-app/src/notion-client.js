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
                    // These property names should match your Notion database schema
                    'Title': {
                        title: [
                            {
                                text: {
                                    content: pageData.title
                                }
                            }
                        ]
                    },
                    'Author': {
                        rich_text: [
                            {
                                text: {
                                    content: pageData.author
                                }
                            }
                        ]
                    },
                    'Source URL': {
                        url: pageData.sourceUrl
                    },
                    'Date': {
                        date: {
                            start: new Date(pageData.timestamp).toISOString()
                        }
                    },
                    'Has Video': {
                        checkbox: pageData.videos && pageData.videos.length > 0
                    },
                    'Video Count': {
                        number: pageData.videos ? pageData.videos.length : 0
                    },
                    'Status': {
                        select: {
                            name: 'Saved'
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
     * Build content blocks for the Notion page
     */
    buildContentBlocks(pageData) {
        const blocks = [];

        // Add post content as rich text
        if (pageData.content) {
            // Split long content into paragraphs
            const paragraphs = pageData.content.split('\\n\\n').filter(p => p.trim());
            
            paragraphs.forEach(paragraph => {
                blocks.push({
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [
                            {
                                type: 'text',
                                text: {
                                    content: paragraph.trim()
                                }
                            }
                        ]
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
            });
        }

        // Add images
        if (pageData.images?.length > 0) {
            blocks.push({
                object: 'block',
                type: 'heading_3',
                heading_3: {
                    rich_text: [
                        {
                            type: 'text',
                            text: {
                                content: `🖼️ Images (${pageData.images.length})`
                            }
                        }
                    ]
                }
            });

            pageData.images.forEach((image) => {
                blocks.push({
                    object: 'block',
                    type: 'image',
                    image: {
                        type: 'external',
                        external: {
                            url: image.src
                        }
                    }
                });
            });
        }

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
                    property: 'Source URL',
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
