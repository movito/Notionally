/**
 * Common utility functions used across the application
 */

class FileUtils {
    /**
     * Format file size in human-readable format
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    static formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    /**
     * Convert text to URL-safe slug
     * @param {string} text - Text to slugify
     * @returns {string} URL-safe slug
     */
    static slugify(text) {
        if (!text) return '';
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_-]/g, '')
            .substring(0, 50);
    }
    
    /**
     * Sanitize filename for filesystem
     * @param {string} filename - Original filename
     * @returns {string} Sanitized filename
     */
    static sanitizeFilename(filename) {
        if (!filename) return 'unnamed';
        return filename
            .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
            .replace(/^\.+/, '')
            .substring(0, 255);
    }
}

class ValidationUtils {
    /**
     * Validate URL format and protocol
     * @param {string} url - URL to validate
     * @returns {boolean} Is valid URL
     */
    static isValidUrl(url) {
        try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
            return false;
        }
    }
    
    /**
     * Validate LinkedIn URL
     * @param {string} url - URL to check
     * @returns {boolean} Is LinkedIn URL
     */
    static isLinkedInUrl(url) {
        try {
            const parsed = new URL(url);
            return parsed.hostname.includes('linkedin.com') || 
                   parsed.hostname.includes('lnkd.in');
        } catch {
            return false;
        }
    }
    
    /**
     * Check if URL is a static asset
     * @param {string} url - URL to check
     * @returns {boolean} Is static asset
     */
    static isStaticAsset(url) {
        const staticExtensions = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i;
        const staticPaths = ['/sc/h/', '/aero-v1/', 'static.', 'licdn.com'];
        
        return staticExtensions.test(url) || 
               staticPaths.some(path => url.includes(path));
    }
}

class RetryUtils {
    /**
     * Retry an async function with exponential backoff
     * @param {Function} fn - Async function to retry
     * @param {number} maxRetries - Maximum retry attempts
     * @param {number} initialDelay - Initial delay in ms
     * @returns {Promise} Result of function
     */
    static async withRetry(fn, maxRetries = 3, initialDelay = 1000) {
        let lastError;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (attempt < maxRetries - 1) {
                    const delay = initialDelay * Math.pow(2, attempt);
                    console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }
}

class PerformanceUtils {
    /**
     * Process array items in parallel with concurrency limit
     * @param {Array} items - Items to process
     * @param {Function} processor - Async function to process each item
     * @param {number} concurrency - Max concurrent operations
     * @returns {Promise<Array>} Processed results
     */
    static async processInParallel(items, processor, concurrency = 3) {
        const results = [];
        const executing = [];
        
        for (const [index, item] of items.entries()) {
            const promise = processor(item, index).then(result => {
                results[index] = result;
            });
            
            if (items.length <= concurrency) {
                executing.push(promise);
            } else {
                executing.push(promise);
                
                if (executing.length >= concurrency) {
                    await Promise.race(executing);
                    executing.splice(executing.findIndex(p => p === promise), 1);
                }
            }
        }
        
        await Promise.all(executing);
        return results;
    }
}

module.exports = {
    FileUtils,
    ValidationUtils,
    RetryUtils,
    PerformanceUtils
};