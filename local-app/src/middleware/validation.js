/**
 * Input validation middleware for Notionally
 * Focused on preventing malformed data that could crash the local server
 */

const Joi = require('joi');

/**
 * Schema for LinkedIn post data
 * Reasonable limits for a local app processing LinkedIn posts
 */
const postSchema = Joi.object({
    // Text content - LinkedIn posts can be up to 3000 chars
    text: Joi.string().max(5000).allow('').optional(),
    
    // Author information
    author: Joi.string().max(200).required(),
    authorProfileUrl: Joi.string().uri().max(500).optional(),
    
    // Post URL
    url: Joi.string().uri().max(500).optional(),
    
    // Timestamp
    timestamp: Joi.string().isoDate().optional(),
    
    // URLs to unfurl - reasonable limit for a single post
    urls: Joi.array()
        .items(Joi.string().uri().max(2000))
        .max(20)
        .optional(),
    
    // Media content
    media: Joi.object({
        videos: Joi.array()
            .items(Joi.object({
                url: Joi.string().uri().required(),
                thumbnail: Joi.string().uri().optional()
            }))
            .max(5)  // Reasonable limit for videos in a post
            .optional(),
        
        images: Joi.array()
            .items(Joi.object({
                url: Joi.string().uri().required(),
                alt: Joi.string().max(500).optional(),
                base64: Joi.string().optional()  // For image data
            }))
            .max(10)  // LinkedIn typically allows up to 9 images
            .optional()
    }).optional(),
    
    // Debug info from client
    debugInfo: Joi.object().optional()
});

/**
 * Validation middleware factory
 */
function validateRequest(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            stripUnknown: true,  // Remove unknown fields
            abortEarly: false    // Report all errors
        });
        
        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            
            console.error(`[${req.id}] Validation failed:`, errors);
            
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors,
                requestId: req.id
            });
        }
        
        // Replace body with validated and sanitized data
        req.body = value;
        next();
    };
}

/**
 * Specific validators for different endpoints
 */
const validators = {
    savePost: validateRequest(postSchema),
    
    testSave: validateRequest(
        postSchema.keys({
            // Test endpoint can have partial data
            author: Joi.string().max(200).optional()  // Override to make optional
        })
    )
};

module.exports = {
    validateRequest,
    validators,
    schemas: {
        postSchema
    }
};