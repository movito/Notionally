const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');

const VideoProcessor = require('./video-processor');
const NotionClient = require('./notion-client');
const DropboxHandler = require('./dropbox-handler');

// Load configuration
const configPath = path.join(__dirname, '..', 'config.json');
let config;

try {
    config = require(configPath);
    console.log('✅ Configuration loaded from config.json');
} catch (error) {
    console.error('❌ Could not load config.json');
    console.error('Please copy config.example.json to config.json and fill in your details');
    process.exit(1);
}

const app = express();
const port = config.server.port || 8765;

// Initialize service classes
const videoProcessor = new VideoProcessor(config);
const notionClient = new NotionClient(config);
const dropboxHandler = new DropboxHandler(config);

// Middleware
app.use(cors({
    origin: ['https://www.linkedin.com', 'https://linkedin.com'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Main endpoint to save LinkedIn posts
app.post('/save-post', async (req, res) => {
    try {
        console.log('📥 Received save request');
        const postData = req.body;
        
        // Validate required fields
        if (!postData.text && !postData.media?.videos?.length) {
            return res.status(400).json({
                error: 'Post must have text content or videos',
                code: 'INVALID_POST_DATA'
            });
        }

        console.log(`📝 Processing post from ${postData.author}`);
        console.log(`📄 Text preview: ${postData.text.substring(0, 100)}...`);
        console.log(`🎬 Videos found: ${postData.media?.videos?.length || 0}`);

        // Step 1: Process videos if present
        let processedVideos = [];
        if (postData.media?.videos?.length > 0) {
            console.log('🎬 Processing videos...');
            
            for (let i = 0; i < postData.media.videos.length; i++) {
                const video = postData.media.videos[i];
                console.log(`  📥 Downloading video ${i + 1}/${postData.media.videos.length}`);
                
                try {
                    // Download and process the video
                    const processedVideo = await videoProcessor.processVideo(video, postData);
                    
                    // Save to Dropbox folder
                    const dropboxInfo = await dropboxHandler.saveVideo(processedVideo, postData);
                    
                    processedVideos.push({
                        originalUrl: video.src,
                        localPath: processedVideo.path,
                        dropboxPath: dropboxInfo.path,
                        shareableUrl: dropboxInfo.shareableUrl,
                        size: processedVideo.size,
                        duration: processedVideo.duration
                    });
                    
                    console.log(`  ✅ Video ${i + 1} processed and saved to Dropbox`);
                } catch (videoError) {
                    console.error(`  ❌ Error processing video ${i + 1}:`, videoError.message);
                    // Continue with other videos even if one fails
                }
            }
        }

        // Step 2: Create Notion page
        console.log('📋 Creating Notion page...');
        const notionPage = await notionClient.createPage({
            title: postData.text.substring(0, 100) || `LinkedIn post from ${postData.author}`,
            content: postData.text,
            author: postData.author,
            sourceUrl: postData.url,
            timestamp: postData.timestamp,
            videos: processedVideos,
            images: postData.media?.images || []
        });

        console.log(`✅ Successfully saved post to Notion: ${notionPage.url}`);

        // Return success response
        res.json({
            success: true,
            message: 'Post saved successfully',
            data: {
                notionPageId: notionPage.id,
                notionPageUrl: notionPage.url,
                videosProcessed: processedVideos.length,
                videos: processedVideos.map(v => ({
                    dropboxUrl: v.shareableUrl,
                    size: v.size
                }))
            }
        });

    } catch (error) {
        console.error('❌ Error saving post:', error);
        
        res.status(500).json({
            error: 'Failed to save post',
            message: error.message,
            code: error.code || 'UNKNOWN_ERROR'
        });
    }
});

// Endpoint to test Notion connection
app.get('/test-notion', async (req, res) => {
    try {
        const testResult = await notionClient.testConnection();
        res.json({
            success: true,
            message: 'Notion connection successful',
            data: testResult
        });
    } catch (error) {
        res.status(500).json({
            error: 'Notion connection failed',
            message: error.message
        });
    }
});

// Endpoint to test Dropbox setup
app.get('/test-dropbox', async (req, res) => {
    try {
        const testResult = await dropboxHandler.testSetup();
        res.json({
            success: true,
            message: 'Dropbox setup successful',
            data: testResult
        });
    } catch (error) {
        res.status(500).json({
            error: 'Dropbox setup failed',
            message: error.message
        });
    }
});

// Static file serving for processed videos (optional)
app.use('/videos', express.static(path.join(__dirname, '..', 'temp')));

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl
    });
});

// Start server
app.listen(port, config.server.host, () => {
    console.log('🚀 Notionally Local App Started');
    console.log(`📡 Server running at http://${config.server.host}:${port}`);
    console.log(`📂 Dropbox folder: ${config.dropbox.localPath}`);
    console.log('🔗 Notion integration ready');
    console.log('');
    console.log('✨ Ready to receive requests from Greasemonkey script!');
    console.log('   Visit LinkedIn and look for "Save to Notion" buttons');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\\n🛑 Shutting down gracefully...');
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
