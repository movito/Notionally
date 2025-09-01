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
 * Express error handling middleware
 */
function errorHandler(err, req, res, next) {
    // Log error details
    console.error('Error occurred:', {
        error: err.message,
        code: err.code,
        stack: err.stack,
        context: err.context || {},
        requestId: req.id,
        path: req.path,
        method: req.method
    });
    
    // Handle different error types
    if (err instanceof ApplicationError) {
        return res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
            context: err.context
        });
    }
    
    // Handle Notion API errors
    if (err.code === 'notionhq_client_error') {
        return res.status(400).json({
            error: 'Notion API error',
            message: err.message,
            code: 'NOTION_API_ERROR'
        });
    }
    
    // Handle Dropbox API errors
    if (err.error && err.error['.tag']) {
        return res.status(400).json({
            error: 'Dropbox API error',
            message: err.error.error_summary || err.message,
            code: 'DROPBOX_API_ERROR'
        });
    }
    
    // Default error response
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
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
    asyncHandler
};