/**
 * Input sanitization utilities for XSS prevention
 */

/**
 * Sanitize text content to prevent XSS attacks
 * Removes or escapes HTML tags and dangerous content
 */
function sanitizeText(text) {
    if (!text) return '';
    
    // Convert to string if not already
    text = String(text);
    
    // Remove script tags and their content
    text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove iframe tags
    text = text.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    
    // Remove object and embed tags
    text = text.replace(/<(object|embed)\b[^<]*(?:(?!<\/(object|embed)>)<[^<]*)*<\/(object|embed)>/gi, '');
    
    // Remove on* event handlers
    text = text.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    text = text.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
    
    // Escape HTML special characters
    const htmlEscapes = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    };
    
    // Replace dangerous HTML characters
    text = text.replace(/[<>&"'`=/]/g, char => htmlEscapes[char] || char);
    
    return text;
}

/**
 * Sanitize author name
 * More lenient than general text - allows some special characters
 */
function sanitizeAuthorName(name) {
    if (!name) return '';
    
    // Convert to string and trim
    name = String(name).trim();
    
    // Remove any HTML tags
    name = name.replace(/<[^>]*>/g, '');
    
    // Remove script-like content
    name = name.replace(/javascript:/gi, '');
    name = name.replace(/data:text\/html/gi, '');
    
    // Allow letters, numbers, spaces, and common name characters
    // but escape HTML special characters
    const htmlEscapes = {
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&#39;'
    };
    
    name = name.replace(/[<>&"']/g, char => htmlEscapes[char] || char);
    
    // Don't trim here - let validation catch oversized names
    // This ensures proper error messages for the user
    
    return name;
}

/**
 * Validate and sanitize URLs
 * Prevents javascript: and data: protocols
 */
function sanitizeUrl(url) {
    if (!url) return '';
    
    // Convert to string and trim
    url = String(url).trim();
    
    // Check for dangerous protocols
    const dangerousProtocols = [
        'javascript:',
        'data:',
        'vbscript:',
        'file:',
        'about:',
        'chrome:',
        'chrome-extension:'
    ];
    
    const lowerUrl = url.toLowerCase();
    for (const protocol of dangerousProtocols) {
        if (lowerUrl.startsWith(protocol)) {
            console.warn(`Blocked dangerous URL protocol: ${protocol}`);
            return ''; // Return empty string for dangerous URLs
        }
    }
    
    // Ensure URL starts with http:// or https://
    if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
        // Prepend https:// if no protocol
        if (!lowerUrl.includes('://')) {
            url = 'https://' + url;
        } else {
            // Unknown protocol, reject
            console.warn(`Rejected URL with unknown protocol: ${url}`);
            return '';
        }
    }
    
    // Basic URL validation
    try {
        const urlObj = new URL(url);
        // Return the normalized URL
        return urlObj.href;
    } catch (e) {
        console.warn(`Invalid URL format: ${url}`);
        return '';
    }
}

/**
 * Sanitize the entire post data object
 */
function sanitizePostData(postData) {
    if (!postData) return postData;
    
    const sanitized = { ...postData };
    
    // Sanitize text content
    if (sanitized.text) {
        sanitized.text = sanitizeText(sanitized.text);
    }
    
    // Sanitize author name
    if (sanitized.author) {
        sanitized.author = sanitizeAuthorName(sanitized.author);
    }
    
    // Sanitize URLs - if sanitization returns empty, remove the field
    if (sanitized.url) {
        const cleanUrl = sanitizeUrl(sanitized.url);
        if (cleanUrl) {
            sanitized.url = cleanUrl;
        } else {
            // Remove invalid URLs so validation will catch it as missing
            delete sanitized.url;
        }
    }
    
    if (sanitized.authorProfileUrl) {
        sanitized.authorProfileUrl = sanitizeUrl(sanitized.authorProfileUrl);
    }
    
    // Sanitize media URLs
    if (sanitized.media) {
        if (sanitized.media.videos && Array.isArray(sanitized.media.videos)) {
            sanitized.media.videos = sanitized.media.videos.map(video => ({
                ...video,
                url: sanitizeUrl(video.url),
                poster: video.poster ? sanitizeUrl(video.poster) : video.poster
            })).filter(video => video.url); // Remove videos with invalid URLs
        }
        
        if (sanitized.media.images && Array.isArray(sanitized.media.images)) {
            sanitized.media.images = sanitized.media.images.map(image => ({
                ...image,
                url: image.url ? sanitizeUrl(image.url) : image.url,
                src: image.src ? sanitizeUrl(image.src) : image.src,
                alt: image.alt ? sanitizeText(image.alt) : image.alt
            })).filter(image => image.url || image.src); // Remove images with no valid URL
        }
    }
    
    // Sanitize additional URLs array
    if (sanitized.urls && Array.isArray(sanitized.urls)) {
        sanitized.urls = sanitized.urls
            .map(sanitizeUrl)
            .filter(url => url); // Remove invalid URLs
    }
    
    return sanitized;
}

module.exports = {
    sanitizeText,
    sanitizeAuthorName,
    sanitizeUrl,
    sanitizePostData
};