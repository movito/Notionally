/**
 * URL Resolution Service
 * Handles unfurling of LinkedIn shortened URLs
 */

const { ValidationUtils } = require('../utils');

class URLResolutionService {
    constructor() {
        this.debugLogs = [];
    }
    
    /**
     * Process and resolve multiple URLs
     */
    async processUrls(urls) {
        if (!urls || urls.length === 0) {
            return [];
        }
        
        this.log('INFO', `Processing ${urls.length} URL(s)...`);
        const processedUrls = [];
        
        for (const url of urls) {
            try {
                if (url.includes('lnkd.in') || url.includes('linkedin.com/redir')) {
                    this.log('INFO', `Unfurling LinkedIn shortened URL: ${url}`);
                    const resolved = await this.resolveLinkedInUrl(url);
                    processedUrls.push(resolved);
                } else {
                    // Not a shortened URL
                    processedUrls.push({
                        original: url,
                        resolved: url,
                        wasShortened: false
                    });
                }
            } catch (error) {
                this.log('ERROR', `Failed to process URL ${url}: ${error.message}`);
                processedUrls.push({
                    original: url,
                    resolved: url,
                    wasShortened: url.includes('lnkd.in'),
                    error: error.message
                });
            }
        }
        
        this.log('INFO', `Processed ${processedUrls.length} URL(s)`);
        return processedUrls;
    }
    
    /**
     * Resolve a LinkedIn shortened URL
     */
    async resolveLinkedInUrl(url) {
        // Try multiple URL expansion methods
        let resolved = false;
        
        // Method 1: Try unshorten.it API
        try {
            this.log('INFO', `Trying unshorten.it for: ${url}`);
            const unshortenResponse = await fetch(`https://unshorten.it/api/v1/unshorten?url=${encodeURIComponent(url)}`, {
                headers: {
                    'Accept': 'application/json'
                }
            });
            if (unshortenResponse.ok) {
                const data = await unshortenResponse.json();
                if (data.url && data.url !== url && !data.url.includes('lnkd.in')) {
                    this.log('INFO', `✅ Unshorten.it resolved to: ${data.url}`);
                    return {
                        original: url,
                        resolved: data.url,
                        wasShortened: true,
                        method: 'unshorten.it'
                    };
                }
            }
        } catch (error) {
            this.log('DEBUG', `Unshorten.it failed: ${error.message}`);
        }
        
        // Method 2: Try HEAD request to get Location header
        try {
            this.log('INFO', `Trying HEAD request for: ${url}`);
            const headResponse = await fetch(url, {
                method: 'HEAD',
                redirect: 'manual',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; Notionally/1.0)'
                }
            });
            const location = headResponse.headers.get('location');
            if (location && !location.includes('lnkd.in')) {
                this.log('INFO', `✅ HEAD request found redirect to: ${location}`);
                return {
                    original: url,
                    resolved: location,
                    wasShortened: true,
                    method: 'HEAD'
                };
            }
        } catch (error) {
            this.log('DEBUG', `HEAD request failed: ${error.message}`);
        }
        
        // Method 3: Follow redirects and parse HTML
        try {
            const response = await fetch(url, {
                method: 'GET',
                redirect: 'manual',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                }
            });
            
            this.log('DEBUG', `Response status: ${response.status}`);
            
            // Check for redirect in headers
            if (response.status >= 300 && response.status < 400) {
                const location = response.headers.get('location');
                if (location && !location.includes('lnkd.in')) {
                    this.log('INFO', `✅ Found redirect to: ${location}`);
                    return {
                        original: url,
                        resolved: location,
                        wasShortened: true,
                        method: 'HTTP redirect'
                    };
                }
            }
            
            // If 200, parse HTML for redirects
            if (response.status === 200) {
                const html = await response.text();
                const resolvedUrl = this.extractUrlFromHtml(html, url);
                
                if (resolvedUrl && resolvedUrl !== url) {
                    this.log('INFO', `✅ Extracted URL from HTML: ${resolvedUrl}`);
                    return {
                        original: url,
                        resolved: resolvedUrl,
                        wasShortened: true,
                        method: 'HTML parsing'
                    };
                }
            }
        } catch (error) {
            this.log('DEBUG', `Fetch failed: ${error.message}`);
        }
        
        // If all methods fail, return original URL
        this.log('WARN', `⚠️ Could not resolve shortened URL, keeping original`);
        return {
            original: url,
            resolved: url,
            wasShortened: true,
            failedToResolve: true,
            note: 'LinkedIn uses JavaScript redirects that require browser execution'
        };
    }
    
    /**
     * Extract URL from HTML content
     */
    extractUrlFromHtml(html, originalUrl) {
        // Patterns to find URLs in HTML
        const patterns = [
            // LinkedIn interstitial page specific pattern - HIGHEST PRIORITY
            /data-tracking-control-name=["']external_url_click["'][^>]*href=["']([^"']+)["']/i,
            // Standard redirect patterns
            /<meta[^>]*http-equiv=["']refresh["'][^>]*content=["']0;url=([^"']+)["']/i,
            /window\.location\.href\s*=\s*["']([^"']+)["']/,
            /window\.location\.replace\(["']([^"']+)["']\)/,
            // LinkedIn-specific patterns
            /data-external-url=["']([^"']+)["']/,
            /externalUrl["']\s*:\s*["']([^"']+)["']/,
            /"url"\s*:\s*"(https?:\/\/[^"]+)"/,
            /href=["'](https?:\/\/(?!(?:www\.)?linkedin\.com)[^"']+)["']/i,
            // URL parameters
            /[?&]url=([^&]+)/,
        ];
        
        for (let i = 0; i < patterns.length; i++) {
            const pattern = patterns[i];
            const match = html.match(pattern);
            if (match && match[1]) {
                let foundUrl = match[1];
                
                // Decode if URL encoded
                if (foundUrl.includes('%3A%2F%2F') || foundUrl.includes('%2F')) {
                    foundUrl = decodeURIComponent(foundUrl);
                }
                
                // Skip if it's a LinkedIn URL or static asset
                if (!foundUrl.includes('linkedin.com') && 
                    !foundUrl.includes('lnkd.in') &&
                    !foundUrl.includes('licdn.com') &&
                    !foundUrl.includes('static.licdn.com') &&
                    !foundUrl.endsWith('.css') &&
                    !foundUrl.endsWith('.js') &&
                    !foundUrl.includes('/sc/h/')) {
                    this.log('DEBUG', `Found URL with pattern #${i + 1}: ${foundUrl}`);
                    return foundUrl;
                }
            }
        }
        
        // Fallback: search for any external URLs in the HTML
        const allUrlsPattern = /https?:\/\/(?!(?:www\.)?linkedin\.com|lnkd\.in|static\.licdn\.com|licdn\.com)[a-zA-Z0-9][a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]+/g;
        const foundUrls = html.match(allUrlsPattern);
        
        if (foundUrls && foundUrls.length > 0) {
            // Filter out static assets
            const realUrls = foundUrls.filter(url => 
                !url.endsWith('.css') &&
                !url.endsWith('.js') &&
                !url.includes('/sc/h/') &&
                !url.includes('static.') &&
                !url.includes('/aero-v1/') &&
                !url.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i)
            );
            
            if (realUrls.length > 0) {
                this.log('DEBUG', `Found ${realUrls.length} potential destination URL(s)`);
                return realUrls[0];
            }
        }
        
        return null;
    }
    
    /**
     * Internal logging
     */
    log(level, message, data = null) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data
        };
        
        this.debugLogs.push(logEntry);
        
        // Also log to console
        if (level === 'ERROR') {
            console.error(`❌ ${message}`, data || '');
        } else if (level === 'INFO' || level === 'WARN') {
            console.log(`📝 ${message}`, data || '');
        }
    }
    
    /**
     * Get debug logs
     */
    getDebugLogs() {
        return this.debugLogs;
    }
}

module.exports = URLResolutionService;