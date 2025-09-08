/**
 * Service layer for processing LinkedIn posts
 * Breaks down the monolithic save-post endpoint into manageable functions
 */

const { FileUtils, ValidationUtils, RetryUtils, PerformanceUtils } = require('../utils');
const { ApplicationError, ValidationError } = require('../utils/errors');
const URLResolutionService = require('./URLResolutionService');

class PostProcessingService {
    constructor(videoProcessor, dropboxHandler, notionClient) {
        this.videoProcessor = videoProcessor;
        this.dropboxHandler = dropboxHandler;
        this.notionClient = notionClient;
        this.urlResolver = new URLResolutionService();
        this.debugLogs = [];
        
        // In-memory cache for duplicate prevention
        this.recentSaves = new Map();
        this.pendingSaves = new Map(); // Track in-progress saves
        this.CACHE_TTL = 60000; // 60 seconds
        this.CACHE_CLEANUP_INTERVAL = 30000; // Clean every 30 seconds
        this.MAX_CACHE_SIZE = 100; // Prevent unbounded growth
        
        // Start cache cleanup timer
        this.startCacheCleanup();
    }
    
    /**
     * Start periodic cache cleanup
     */
    startCacheCleanup() {
        this.cleanupTimer = setInterval(() => {
            this.cleanupCache();
        }, this.CACHE_CLEANUP_INTERVAL);
        
        // Ensure timer doesn't prevent process exit
        if (this.cleanupTimer.unref) {
            this.cleanupTimer.unref();
        }
    }
    
    /**
     * Clean expired entries from cache
     */
    cleanupCache() {
        const now = Date.now();
        let removedCount = 0;
        
        for (const [key, entry] of this.recentSaves.entries()) {
            if (now - entry.timestamp > this.CACHE_TTL) {
                this.recentSaves.delete(key);
                removedCount++;
            }
        }
        
        if (removedCount > 0) {
            this.log('INFO', `Cache cleanup: removed ${removedCount} expired entries`);
        }
        
        // Additional safety: if cache is too large, remove oldest entries
        if (this.recentSaves.size > this.MAX_CACHE_SIZE) {
            const entriesToRemove = this.recentSaves.size - this.MAX_CACHE_SIZE;
            const sortedEntries = Array.from(this.recentSaves.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            for (let i = 0; i < entriesToRemove; i++) {
                this.recentSaves.delete(sortedEntries[i][0]);
            }
            
            this.log('WARN', `Cache size limit reached, removed ${entriesToRemove} oldest entries`);
        }
    }
    
    /**
     * Check cache for recent save of the same URL
     */
    checkCache(url) {
        if (!url) return null;
        
        const cached = this.recentSaves.get(url);
        if (cached) {
            const age = Date.now() - cached.timestamp;
            if (age < this.CACHE_TTL) {
                this.log('INFO', `Cache hit for URL: ${url} (age: ${Math.round(age/1000)}s)`);
                return cached.result;
            } else {
                // Entry expired, remove it
                this.recentSaves.delete(url);
                this.log('INFO', `Cache entry expired for URL: ${url}`);
            }
        }
        
        return null;
    }
    
    /**
     * Add successful save to cache
     */
    addToCache(url, result) {
        if (!url) return;
        
        this.recentSaves.set(url, {
            result: result,
            timestamp: Date.now()
        });
        
        this.log('INFO', `Added to cache: ${url}`);
    }
    
    /**
     * Main entry point for processing a LinkedIn post
     */
    async processPost(postData, clientDebugInfo = null) {
        this.debugLogs = [];
        this.log('INFO', 'Starting post processing');
        
        try {
            // Validate input
            this.validatePostData(postData);
            
            // Check cache for duplicate prevention
            if (postData.url) {
                const cachedResult = this.checkCache(postData.url);
                if (cachedResult) {
                    this.log('INFO', 'Returning cached result to prevent duplicate');
                    return cachedResult;
                }
                
                // Check if this URL is already being processed
                const pendingPromise = this.pendingSaves.get(postData.url);
                if (pendingPromise) {
                    this.log('INFO', `Request already in progress for URL: ${postData.url}, waiting...`);
                    return await pendingPromise;
                }
                
                // Mark this URL as being processed
                const processingPromise = this.processSinglePost(postData, clientDebugInfo);
                this.pendingSaves.set(postData.url, processingPromise);
                
                try {
                    const result = await processingPromise;
                    return result;
                } finally {
                    // Remove from pending saves when done
                    this.pendingSaves.delete(postData.url);
                }
            }
            
            // No URL, process normally without caching
            return await this.processSinglePost(postData, clientDebugInfo);
            
        } catch (error) {
            this.log('ERROR', `Post processing failed: ${error.message}`, error);
            throw error;
        }
    }
    
    /**
     * Process a single post (internal method for actual processing)
     */
    async processSinglePost(postData, clientDebugInfo) {
        // Special handling for Pulse articles with cover image
        let processedCoverImage = null;
        let contentImages = postData.media?.images || [];
        
        if (postData.type === 'pulse_article' && postData.coverImage) {
            this.log('INFO', 'Processing Pulse article cover image');
            // Process cover image separately
            const coverImageResult = await this.processImages([postData.coverImage]);
            processedCoverImage = coverImageResult[0] || null;
            
            // Remove cover image from content images if it's duplicated
            contentImages = contentImages.filter(img => 
                (img.url || img.src) !== postData.coverImage.url
            );
        }
        
        // Process components in parallel where possible
        const [videos, images, urls] = await Promise.all([
            this.processVideos(postData.media?.videos || []),
            this.processImages(contentImages),
            this.processUrls(postData.urls || [])
        ]);
        
        // Create Notion page with all processed content EXCEPT regular images
        const notionPage = await this.createNotionPage({
            ...postData,
            processedVideos: videos,
            processedImages: [], // Don't include images in page creation
            processedCoverImage: processedCoverImage, // Include cover image for Pulse articles
            processedUrls: urls,
            debugInfo: this.buildDebugInfo(clientDebugInfo)
        });
        
        // Add images to the page separately (like v1.0.0 did)
        if (images.length > 0 && this.notionClient.addImagesToPage) {
            this.log('INFO', `Adding ${images.length} image(s) to Notion page...`);
            try {
                await this.notionClient.addImagesToPage(notionPage.id, images, postData.url);
                this.log('INFO', `Successfully added ${images.length} image(s) to Notion page`);
            } catch (imageError) {
                this.log('ERROR', `Failed to add images: ${imageError.message}`);
                // Don't fail the whole process if images fail
            }
        }
        
        this.log('INFO', `Successfully processed post: ${notionPage.url}`);
        
        // Create the result object
        const result = {
            success: true,
            notionUrl: notionPage.url,
            stats: {
                videosProcessed: videos.length,
                imagesProcessed: images.length,
                urlsResolved: urls.filter(u => u.resolved !== u.original).length
            }
        };
        
        // Add to cache for duplicate prevention
        if (postData.url) {
            this.addToCache(postData.url, result);
        }
        
        return result;
    }
    
    /**
     * Validate post data structure
     */
    validatePostData(postData) {
        if (!postData) {
            throw new ValidationError('Post data is required', 'postData', null);
        }
        
        if (!postData.text && !postData.media?.videos?.length) {
            throw new ValidationError(
                'Post must have text content or videos',
                'content',
                postData
            );
        }
        
        if (postData.url && !ValidationUtils.isValidUrl(postData.url)) {
            throw new ValidationError(
                'Invalid post URL',
                'url',
                postData.url
            );
        }
    }
    
    /**
     * Process videos with parallel downloading
     */
    async processVideos(videos) {
        if (!videos || videos.length === 0) {
            return [];
        }
        
        this.log('INFO', `Processing ${videos.length} video(s)`);
        
        // Process videos with concurrency limit to avoid memory issues
        const processedVideos = await PerformanceUtils.processInParallel(
            videos,
            async (video, index) => {
                try {
                    this.log('INFO', `Processing video ${index + 1}/${videos.length}`);
                    
                    // Download with retry
                    const downloadedVideo = await RetryUtils.withRetry(
                        () => this.videoProcessor.downloadVideo(video.url),
                        3,
                        2000
                    );
                    
                    // Save to Dropbox if configured
                    if (this.dropboxHandler.isConfigured()) {
                        const dropboxPath = await this.dropboxHandler.saveVideo(
                            downloadedVideo.path,
                            downloadedVideo.filename
                        );
                        downloadedVideo.dropboxPath = dropboxPath;
                    }
                    
                    return {
                        ...downloadedVideo,
                        originalUrl: video.url,
                        index: index
                    };
                    
                } catch (error) {
                    this.log('ERROR', `Failed to process video ${index + 1}: ${error.message}`);
                    return {
                        failed: true,
                        error: error.message,
                        originalUrl: video.url,
                        index: index
                    };
                }
            },
            2 // Process max 2 videos concurrently
        );
        
        return processedVideos;
    }
    
    /**
     * Process images with parallel processing
     */
    async processImages(images) {
        if (!images || images.length === 0) {
            return [];
        }
        
        this.log('INFO', `Processing ${images.length} image(s)`);
        
        // Process images in parallel with higher concurrency
        const processedImages = await PerformanceUtils.processInParallel(
            images,
            async (image, index) => {
                try {
                    // Handle both 'url' and 'src' properties
                    const imageUrl = image.url || image.src;
                    const processedImage = {
                        url: imageUrl,
                        alt: image.alt || `Image ${index + 1}`,
                        index: index
                    };
                    
                    // If base64 data is provided, save to Dropbox
                    if (image.base64 && this.dropboxHandler.isConfigured()) {
                        const filename = `image_${Date.now()}_${index}.jpg`;
                        const dropboxResult = await this.dropboxHandler.saveImageFromBase64(
                            image.base64,
                            filename
                        );
                        processedImage.dropboxPath = dropboxResult.relativePath;
                        processedImage.filename = filename;
                        if (dropboxResult.shareableUrl) {
                            processedImage.shareableUrl = dropboxResult.shareableUrl;
                        }
                    }
                    // Otherwise, if we have a URL, download and save the image
                    else if (imageUrl && this.dropboxHandler.isConfigured()) {
                        try {
                            this.log('INFO', `Downloading image from URL: ${imageUrl}`);
                            
                            // Download the image
                            const response = await fetch(imageUrl);
                            if (!response.ok) {
                                throw new Error(`Failed to download image: ${response.status}`);
                            }
                            
                            // Get the image data as a buffer
                            const arrayBuffer = await response.arrayBuffer();
                            const buffer = Buffer.from(arrayBuffer);
                            
                            // Convert to base64
                            const base64 = buffer.toString('base64');
                            const mimeType = response.headers.get('content-type') || 'image/jpeg';
                            const base64WithPrefix = `data:${mimeType};base64,${base64}`;
                            
                            // Save to Dropbox
                            const filename = `image_${Date.now()}_${index}.jpg`;
                            const dropboxResult = await this.dropboxHandler.saveImageFromBase64(
                                base64WithPrefix,
                                filename
                            );
                            
                            processedImage.dropboxPath = dropboxResult.relativePath;
                            processedImage.filename = filename;
                            if (dropboxResult.shareableUrl) {
                                processedImage.shareableUrl = dropboxResult.shareableUrl;
                            }
                            this.log('INFO', `Image saved to Dropbox: ${dropboxResult.relativePath}`);
                        } catch (downloadError) {
                            this.log('ERROR', `Failed to download/save image: ${downloadError.message}`);
                            // Keep the original URL even if download fails
                        }
                    }
                    
                    return processedImage;
                    
                } catch (error) {
                    this.log('ERROR', `Failed to process image ${index + 1}: ${error.message}`);
                    return {
                        failed: true,
                        error: error.message,
                        url: image.url || image.src,
                        index: index
                    };
                }
            },
            5 // Process max 5 images concurrently
        );
        
        return processedImages;
    }
    
    /**
     * Process and resolve URLs
     */
    async processUrls(urls) {
        if (!urls || urls.length === 0) {
            return [];
        }
        
        this.log('INFO', `Processing ${urls.length} URL(s)`);
        
        // Use the URL resolution service
        const processedUrls = await this.urlResolver.processUrls(urls);
        
        // Merge URL resolver debug logs with our logs
        const urlDebugLogs = this.urlResolver.getDebugLogs();
        this.debugLogs.push(...urlDebugLogs);
        
        return processedUrls;
    }
    
    /**
     * Create Notion page with processed content
     */
    async createNotionPage(data) {
        this.log('INFO', 'Creating Notion page');
        
        const notionData = {
            type: data.type, // Pass through the content type (feed_post or pulse_article)
            title: data.text?.substring(0, 100) || `LinkedIn post from ${data.author}`,
            content: data.text,
            author: data.author,
            authorProfileUrl: data.authorProfileUrl,
            sourceUrl: data.url,
            timestamp: data.timestamp,
            videos: data.processedVideos,
            images: data.processedImages,
            coverImage: data.processedCoverImage, // Add processed cover image for Pulse articles
            processedUrls: data.processedUrls,
            debugInfo: data.debugInfo,
            scriptVersion: data.scriptVersion || 'Unknown'
        };
        
        // Don't retry page creation - it creates duplicates
        return await this.notionClient.createPage(notionData);
    }
    
    /**
     * Build debug information object
     */
    buildDebugInfo(clientDebugInfo) {
        return {
            client: clientDebugInfo || {},
            server: {
                appVersion: '1.0.0',
                timestamp: new Date().toISOString(),
                logs: this.debugLogs
            }
        };
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
        } else {
            console.log(`📝 ${message}`, data || '');
        }
    }
    
    /**
     * Clean up resources (call on shutdown)
     */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
            this.log('INFO', 'Cache cleanup timer stopped');
        }
        this.recentSaves.clear();
        this.pendingSaves.clear();
    }
}

module.exports = PostProcessingService;