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

// Load environment variables first
require('dotenv').config();

// Environment variable validation (only check what's actually in .env)
const requiredEnvVars = ['NOTION_API_KEY'];
const missingVars = [];

for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
        missingVars.push(varName);
    }
}

if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
        console.error(`  - ${varName}`);
    });
    console.error('\n📝 Please check your .env file');
    process.exit(1);
}

console.log('✅ Environment variables validated');

// Dependencies
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Configuration
const { getInstance: getConfig } = require('./config/ConfigManager');
const config = getConfig();

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

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add request ID for tracking
app.use((req, res, next) => {
    req.id = uuidv4();
    res.setHeader('X-Request-Id', req.id);
    next();
});

// Request logging with timing
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${req.id}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
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

// Main optimized save endpoint
app.post('/save-post', asyncHandler(async (req, res) => {
    const startTime = Date.now();
    console.log(`[${req.id}] 📥 Received save request`);
    
    try {
        // Phase 2 Validation: Content-Type
        if (!req.is('application/json')) {
            console.log(`[${req.id}] ⚠️ Invalid Content-Type: ${req.get('Content-Type')}`);
            return res.status(400).json({ 
                error: 'Content-Type must be application/json',
                requestId: req.id 
            });
        }
        
        // Extract debug info if present
        const { debugInfo, ...postData } = req.body;
        
        // Phase 2 Validation: Required fields
        if (!postData.author) {
            console.log(`[${req.id}] ⚠️ Missing required field: author`);
            return res.status(400).json({ 
                error: 'Missing required field: author',
                requestId: req.id 
            });
        }
        
        if (!postData.url) {
            console.log(`[${req.id}] ⚠️ Missing required field: url`);
            return res.status(400).json({ 
                error: 'Missing required field: url',
                requestId: req.id 
            });
        }
        
        // Must have either text OR media.videos
        const hasText = postData.text && postData.text.trim().length > 0;
        const hasVideos = postData.media?.videos && postData.media.videos.length > 0;
        
        if (!hasText && !hasVideos) {
            console.log(`[${req.id}] ⚠️ Missing content: must have text or videos`);
            return res.status(400).json({ 
                error: 'Post must contain either text content or videos',
                requestId: req.id 
            });
        }
        
        // Phase 2 Validation: Field size limits
        const TEXT_MAX_SIZE = 100 * 1024; // 100KB
        const AUTHOR_MAX_LENGTH = 200;
        const URL_MAX_LENGTH = 500;
        
        if (postData.text && postData.text.length > TEXT_MAX_SIZE) {
            console.log(`[${req.id}] ⚠️ Text too large: ${postData.text.length} bytes`);
            return res.status(400).json({ 
                error: `Text content exceeds maximum size of ${TEXT_MAX_SIZE} bytes`,
                requestId: req.id 
            });
        }
        
        if (postData.author && postData.author.length > AUTHOR_MAX_LENGTH) {
            console.log(`[${req.id}] ⚠️ Author name too long: ${postData.author.length} chars`);
            return res.status(400).json({ 
                error: `Author name exceeds maximum length of ${AUTHOR_MAX_LENGTH} characters`,
                requestId: req.id 
            });
        }
        
        if (postData.url && postData.url.length > URL_MAX_LENGTH) {
            console.log(`[${req.id}] ⚠️ URL too long: ${postData.url.length} chars`);
            return res.status(400).json({ 
                error: `URL exceeds maximum length of ${URL_MAX_LENGTH} characters`,
                requestId: req.id 
            });
        }
        
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

// Test error endpoint
app.get('/test-error', (req, res, next) => {
    const error = new Error('Test error to verify error handling');
    error.status = 400;
    next(error);
});

// Test endpoint for debugging
app.post('/test-save', asyncHandler(async (req, res) => {
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
app.use((err, req, res, next) => {
    console.error(`[${req.id}] Error:`, err.message);
    
    // Don't leak stack traces to client
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
        error: 'Something went wrong',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        requestId: req.id
    });
});

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