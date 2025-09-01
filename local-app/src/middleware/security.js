/**
 * Security middleware for Notionally local server
 * Balanced security for a local-only application
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');

/**
 * Rate limiting - prevent accidental flooding
 * Since it's local, this mainly prevents bugs/loops from overwhelming the server
 */
const createRateLimiter = (windowMs = 60000, max = 100) => {
    return rateLimit({
        windowMs,     // Time window
        max,          // Max requests per window
        message: 'Too many requests, please slow down',
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            console.warn(`[${req.id}] Rate limit exceeded from ${req.ip}`);
            res.status(429).json({
                success: false,
                error: 'Too many requests, please wait before trying again',
                retryAfter: Math.ceil(windowMs / 1000),
                requestId: req.id
            });
        }
    });
};

/**
 * Different rate limits for different endpoints
 */
const rateLimiters = {
    // Main save endpoint - reasonable for manual saves from browser
    savePost: createRateLimiter(60000, 30),  // 30 saves per minute
    
    // Test endpoint - can be called more frequently
    test: createRateLimiter(60000, 100),     // 100 tests per minute
    
    // Health check - very permissive
    health: createRateLimiter(60000, 300)    // 300 checks per minute
};

/**
 * Security headers using Helmet
 * Configured for local use - not as strict as production would be
 */
const securityHeaders = helmet({
    // Allow content from localhost for development
    contentSecurityPolicy: false,  // Disabled for local development
    
    // Other security headers still useful locally
    dnsPrefetchControl: true,
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: false,  // Not needed for localhost
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: 'no-referrer' },
    xssFilter: true
});

/**
 * Path sanitization to prevent directory traversal
 * Even though it's local, good practice to validate paths
 */
function sanitizePath(userPath, basePath) {
    // Normalize and resolve the path
    const normalized = path.normalize(userPath);
    const resolved = path.resolve(basePath, normalized);
    
    // Ensure the resolved path is within the base path
    if (!resolved.startsWith(path.resolve(basePath))) {
        throw new Error('Invalid path: Directory traversal attempt detected');
    }
    
    return resolved;
}

/**
 * Request size limits - prevent memory issues
 */
const requestSizeLimits = {
    json: '10mb',      // Reasonable for posts with base64 images
    urlencoded: '10mb'
};

/**
 * Simple request logger for debugging
 */
function requestLogger(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 400 ? '❌' : '✅';
        console.log(`${level} [${req.id}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    
    next();
}

/**
 * Error sanitization - don't leak internal details
 */
function sanitizeError(error) {
    // In development, we might want full errors
    if (process.env.NODE_ENV === 'development') {
        return {
            message: error.message,
            stack: error.stack,
            code: error.code
        };
    }
    
    // In production, sanitize
    const sanitized = {
        message: 'An error occurred processing your request'
    };
    
    // Include safe error details
    if (error.code === 'ECONNREFUSED') {
        sanitized.message = 'Could not connect to required service';
    } else if (error.code === 'ENOTFOUND') {
        sanitized.message = 'Could not reach external service';
    } else if (error.name === 'ValidationError') {
        sanitized.message = error.message;
    }
    
    return sanitized;
}

module.exports = {
    rateLimiters,
    securityHeaders,
    sanitizePath,
    requestSizeLimits,
    requestLogger,
    sanitizeError,
    createRateLimiter
};