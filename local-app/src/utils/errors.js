/**
 * Custom error classes and error handling utilities
 */

class ApplicationError extends Error {
    constructor(message, code, statusCode = 500, context = {}) {
        super(message);
        this.name = 'ApplicationError';
        this.code = code;
        this.statusCode = statusCode;
        this.context = context;
        this.timestamp = new Date().toISOString();
        
        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }
    
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            context: this.context,
            timestamp: this.timestamp
        };
    }
}

class ValidationError extends ApplicationError {
    constructor(message, field, value) {
        super(message, 'VALIDATION_ERROR', 400, { field, value });
        this.name = 'ValidationError';
    }
}

class NotionError extends ApplicationError {
    constructor(message, context = {}) {
        super(message, 'NOTION_ERROR', 500, context);
        this.name = 'NotionError';
    }
}

class DropboxError extends ApplicationError {
    constructor(message, context = {}) {
        super(message, 'DROPBOX_ERROR', 500, context);
        this.name = 'DropboxError';
    }
}

class VideoProcessingError extends ApplicationError {
    constructor(message, context = {}) {
        super(message, 'VIDEO_PROCESSING_ERROR', 500, context);
        this.name = 'VideoProcessingError';
    }
}

class URLResolutionError extends ApplicationError {
    constructor(message, url) {
        super(message, 'URL_RESOLUTION_ERROR', 500, { url });
        this.name = 'URLResolutionError';
    }
}

/**
 * Sanitize error message to remove sensitive information
 */
function sanitizeErrorMessage(message) {
    if (!message) return 'An error occurred';
    
    // Remove file paths (both Unix and Windows style)
    let sanitized = message.replace(/\/[\w\/\.\-]+/g, '[path]');
    sanitized = sanitized.replace(/[A-Za-z]:\\[\w\\\.\ \-]+/g, '[path]');
    
    // Remove API keys or secrets (anything that looks like a key)
    sanitized = sanitized.replace(/secret_[\w]+/gi, '[secret]');
    sanitized = sanitized.replace(/api[_\-]?key[\s]*[:=][\s]*[\w\-]+/gi, '[api-key]');
    sanitized = sanitized.replace(/token[\s]*[:=][\s]*[\w\-]+/gi, '[token]');
    
    // Remove environment variable values
    sanitized = sanitized.replace(/process\.env\.[\w]+/gi, '[env-var]');
    
    // Remove stack trace indicators
    sanitized = sanitized.replace(/at\s+.*\(.*\)/g, '');
    sanitized = sanitized.replace(/at\s+.*:\d+:\d+/g, '');
    
    return sanitized.trim() || 'An error occurred';
}

/**
 * Express error handling middleware
 */
function errorHandler(err, req, res, next) {
    // Log full error details to server console only
    console.error('Error occurred:', {
        error: err.message,
        code: err.code,
        stack: process.env.NODE_ENV === 'development' ? err.stack : '[stack hidden in production]',
        context: err.context || {},
        requestId: req.id,
        path: req.path,
        method: req.method
    });
    
    // Prepare sanitized error response
    const sanitizedMessage = sanitizeErrorMessage(err.message);
    
    // Handle different error types
    if (err instanceof ApplicationError) {
        // Don't send context to client - it might contain sensitive data
        return res.status(err.statusCode).json({
            error: sanitizedMessage,
            code: err.code,
            requestId: req.id
        });
    }
    
    // Handle Notion API errors
    if (err.code === 'notionhq_client_error') {
        return res.status(400).json({
            error: 'Notion API error',
            message: 'Failed to save to Notion',
            code: 'NOTION_API_ERROR',
            requestId: req.id
        });
    }
    
    // Handle Dropbox API errors
    if (err.error && err.error['.tag']) {
        return res.status(400).json({
            error: 'Dropbox API error',
            message: 'Failed to save to Dropbox',
            code: 'DROPBOX_API_ERROR',
            requestId: req.id
        });
    }
    
    // Default error response - never expose raw error messages
    res.status(500).json({
        error: 'Internal server error',
        message: 'An error occurred while processing your request',
        requestId: req.id
    });
}

/**
 * Async error wrapper for Express routes
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = {
    ApplicationError,
    ValidationError,
    NotionError,
    DropboxError,
    VideoProcessingError,
    URLResolutionError,
    errorHandler,
    asyncHandler,
    sanitizeErrorMessage
};