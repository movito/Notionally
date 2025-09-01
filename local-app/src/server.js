/**
 * Notionally Server - LinkedIn to Notion Content Saver
 * Modular architecture with service layer for better maintainability
 */

// Node version check
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split('.')[0]);

if (majorVersion < 22) {
    console.error(`❌ Node.js version ${nodeVersion} is not supported.`);
    console.error('📦 This application requires Node.js version 22.0.0 or higher.');
    process.exit(1);
}

console.log(`✅ Running with Node.js ${nodeVersion}`);

// Dependencies
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Configuration
const { getInstance: getConfig } = require('./config/ConfigManager');
const config = getConfig();

// Security middleware
const { validators } = require('./middleware/validation');
const { 
    rateLimiters, 
    securityHeaders, 
    requestSizeLimits, 
    requestLogger 
} = require('./middleware/security');

// Services
const VideoProcessor = require('./video-processor');
const NotionClient = require('./notion-client');
const DropboxHandler = require('./dropbox-handler');
const PostProcessingService = require('./services/PostProcessingService');

// Utilities
const { errorHandler, asyncHandler } = require('./utils/errors');

// Initialize services
const videoProcessor = new VideoProcessor(config.getAll());
const notionClient = new NotionClient(config.getAll());
const dropboxHandler = new DropboxHandler(config.getAll());
const postProcessor = new PostProcessingService(
    videoProcessor,
    dropboxHandler,
    notionClient
);

// Initialize Express app
const app = express();

// Security headers
app.use(securityHeaders);

// CORS - permissive for local use (allows browser extensions)
app.use(cors({
    origin: true,  // Allow all origins for local development
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Request-Id']
}));

// Body parsing with size limits
app.use(express.json({ limit: requestSizeLimits.json }));
app.use(express.urlencoded({ extended: true, limit: requestSizeLimits.urlencoded }));

// Add request ID for tracking
app.use((req, res, next) => {
    req.id = uuidv4();
    res.setHeader('X-Request-Id', req.id);
    next();
});

// Request logging with timing
app.use(requestLogger);

// Health check endpoint (with rate limiting)
app.get('/health', rateLimiters.health, (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        services: {
            notion: notionClient.isConfigured() ? 'configured' : 'not configured',
            dropbox: dropboxHandler.isConfigured() ? 'configured' : 'not configured',
            videoProcessor: 'ready'
        }
    };
    res.json(health);
});

// Main save endpoint (with validation and rate limiting)
app.post('/save-post', 
    rateLimiters.savePost,
    validators.savePost,
    asyncHandler(async (req, res) => {
    const startTime = Date.now();
    console.log(`[${req.id}] 📥 Received save request`);
    
    try {
        // Extract debug info if present
        const { debugInfo, ...postData } = req.body;
        
        // Process the post using the service layer
        const result = await postProcessor.processPost(postData, debugInfo);
        
        const duration = Date.now() - startTime;
        console.log(`[${req.id}] ✅ Post saved successfully in ${duration}ms`);
        
        res.json({
            success: true,
            message: 'Post saved successfully',
            data: result,
            requestId: req.id,
            duration: `${duration}ms`
        });
        
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[${req.id}] ❌ Failed after ${duration}ms:`, error.message);
        throw error; // Let error handler deal with it
    }
}));

// Test endpoint (with validation and rate limiting)
app.post('/test-save', 
    rateLimiters.test,
    validators.testSave,
    asyncHandler(async (req, res) => {
    console.log(`[${req.id}] 🧪 Test save request received`);
    
    const testResult = {
        receivedData: {
            hasText: !!req.body.text,
            textLength: req.body.text?.length || 0,
            hasAuthor: !!req.body.author,
            hasUrl: !!req.body.url,
            videoCount: req.body.media?.videos?.length || 0,
            imageCount: req.body.media?.images?.length || 0,
            urlCount: req.body.urls?.length || 0
        },
        services: {
            notion: notionClient.isConfigured(),
            dropbox: dropboxHandler.isConfigured()
        },
        timestamp: new Date().toISOString()
    };
    
    res.json({
        success: true,
        message: 'Test endpoint working',
        data: testResult,
        requestId: req.id
    });
}));

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        requestId: req.id
    });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || config.get('server.port') || 8765;
const HOST = process.env.HOST || config.get('server.host') || 'localhost';

const server = app.listen(PORT, HOST, () => {
    console.log('');
    console.log('🚀 Notionally Server Started');
    console.log('=' .repeat(50));
    console.log(`📡 Server: http://${HOST}:${PORT}`);
    console.log(`📂 Dropbox: ${config.get('dropbox.localPath')}`);
    console.log(`🔗 Notion: ${notionClient.isConfigured() ? 'Connected' : 'Not configured'}`);
    console.log('=' .repeat(50));
    console.log('✨ Ready to receive requests!');
    console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('📛 SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n📛 SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

module.exports = app;