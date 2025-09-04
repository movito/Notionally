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

// Check .env file permissions (security)
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
    const stats = fs.statSync(envPath);
    const mode = (stats.mode & parseInt('777', 8)).toString(8);
    
    // Warn if .env file has overly permissive permissions
    if (mode !== '600' && mode !== '644') {
        console.warn('⚠️  Warning: .env file has permissions ' + mode);
        console.warn('🔐 Consider restricting with: chmod 600 .env');
    }
}

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

// Ensure sensitive environment variables are never logged
const sensitiveVars = ['NOTION_API_KEY', 'DROPBOX_ACCESS_TOKEN', 'API_KEY', 'SECRET', 'PASSWORD', 'TOKEN'];
for (const varName of sensitiveVars) {
    if (process.env[varName]) {
        // Mask the value to prevent accidental logging
        const maskedValue = process.env[varName].substring(0, 4) + '***';
        console.log(`✅ ${varName} is set (${maskedValue}...)`);
    }
}

console.log('✅ Environment variables validated and secured');

// Dependencies
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');

// Configuration
const { getInstance: getConfig } = require('./config/ConfigManager');
const config = getConfig();

// Services
const VideoProcessor = require('./video-processor');
const NotionClient = require('./notion-client');
const DropboxHandler = require('./dropbox-handler');
const PostProcessingService = require('./services/PostProcessingService');

// Utilities
const { errorHandler, asyncHandler, sanitizeErrorMessage } = require('./utils/errors');
const { sanitizePostData } = require('./utils/sanitization');

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

// Trust proxy headers for rate limiting to work with X-Forwarded-For
// Using number 1 means we trust the first proxy (for testing with X-Forwarded-For)
app.set('trust proxy', 1);

// Middleware
app.use(cors());

// Add request ID for tracking and safe security headers (MUST BE BEFORE ROUTE HANDLERS)
app.use((req, res, next) => {
    req.id = uuidv4();
    res.setHeader('X-Request-Id', req.id);
    
    // Safe security headers that won't break LinkedIn integration
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    next();
});

// Different size limits for different endpoints
// Default limit for most endpoints (reasonable for text/metadata)
app.use('/health', express.json({ limit: '1kb' }));
app.use('/test-error', express.json({ limit: '1kb' }));
app.use('/test-save', express.json({ limit: '10mb' })); // Test endpoint can handle moderate data

// Main save endpoint needs larger limit for video metadata and images
// Note: We're not uploading actual video files, just metadata and base64 images
app.use('/save-post', express.json({ limit: '25mb' })); // Reduced from 50mb

// Default for any other endpoints
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Request logging with timing
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${req.id}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Rate limiting configuration
const rateLimitConfig = config.get('rateLimiting') || {
    enabled: true,
    windowMs: 60000,
    maxRequests: 30,
    skipLocalhost: true,
    message: 'Too many requests, please slow down. You can make up to 30 saves per minute.'
};

// Create rate limiter if enabled
if (rateLimitConfig.enabled) {
    const limiter = rateLimit({
        windowMs: rateLimitConfig.windowMs,
        max: rateLimitConfig.maxRequests,
        message: rateLimitConfig.message,
        standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
        legacyHeaders: false, // Disable `X-RateLimit-*` headers
        skip: (req) => {
            // Skip rate limiting for localhost
            if (!rateLimitConfig.skipLocalhost) return false;
            
            const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
            const isLocalhost = ip === '127.0.0.1' || 
                              ip === '::1' || 
                              ip === 'localhost' ||
                              ip === '::ffff:127.0.0.1';
            
            if (isLocalhost) {
                console.log(`[${req.id}] Rate limiting skipped for localhost (${ip})`);
            }
            
            return isLocalhost;
        },
        handler: (req, res) => {
            console.log(`[${req.id}] Rate limit exceeded for IP: ${req.ip}`);
            res.status(429).json({
                error: rateLimitConfig.message,
                requestId: req.id,
                retryAfter: Math.ceil(rateLimitConfig.windowMs / 1000)
            });
        }
    });
    
    // Apply rate limiting only to /save-post endpoint
    app.use('/save-post', limiter);
    console.log('✅ Rate limiting enabled for /save-post endpoint');
    console.log(`   - Window: ${rateLimitConfig.windowMs}ms`);
    console.log(`   - Max requests: ${rateLimitConfig.maxRequests}`);
    console.log(`   - Skip localhost: ${rateLimitConfig.skipLocalhost}`);
} else {
    console.log('⚠️  Rate limiting is disabled');
}

// Health check endpoint
app.get('/health', (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.5',
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
        const { debugInfo, ...rawPostData } = req.body;
        
        // Sanitize input data to prevent XSS
        const postData = sanitizePostData(rawPostData);
        console.log(`[${req.id}] 🧹 Input sanitized for XSS prevention`);
        
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
        // Sanitize error message before logging
        const sanitizedMsg = sanitizeErrorMessage(error.message);
        console.error(`[${req.id}] ❌ Failed after ${duration}ms:`, sanitizedMsg);
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
    // Log sanitized error to console
    const sanitizedMessage = sanitizeErrorMessage(err.message);
    console.error(`[${req.id}] Error:`, sanitizedMessage);
    
    // Log full error details in development only
    if (process.env.NODE_ENV === 'development') {
        console.error(`[${req.id}] Full error:`, err);
    }
    
    // Never leak sensitive information to client
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
        error: 'Something went wrong',
        message: sanitizedMessage,
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
        // Clean up PostProcessingService resources
        if (postProcessor && typeof postProcessor.destroy === 'function') {
            postProcessor.destroy();
        }
        console.log('✅ Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n📛 SIGINT received, shutting down gracefully...');
    server.close(() => {
        // Clean up PostProcessingService resources
        if (postProcessor && typeof postProcessor.destroy === 'function') {
            postProcessor.destroy();
        }
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