/**
 * Service layer for processing LinkedIn posts
 * Breaks down the monolithic save-post endpoint into manageable functions
 */

const { FileUtils, ValidationUtils, RetryUtils, PerformanceUtils } = require('../utils');
const { ApplicationError, ValidationError } = require('../utils/errors');

class PostProcessingService {
    constructor(videoProcessor, dropboxHandler, notionClient) {
        this.videoProcessor = videoProcessor;
        this.dropboxHandler = dropboxHandler;
        this.notionClient = notionClient;
        this.debugLogs = [];
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
            
            // Process components in parallel where possible
            const [videos, images, urls] = await Promise.all([
                this.processVideos(postData.media?.videos || []),
                this.processImages(postData.media?.images || []),
                this.processUrls(postData.urls || [])
            ]);
            
            // Create Notion page with all processed content
            const notionPage = await this.createNotionPage({
                ...postData,
                processedVideos: videos,
                processedImages: images,
                processedUrls: urls,
                debugInfo: this.buildDebugInfo(clientDebugInfo)
            });
            
            this.log('INFO', `Successfully processed post: ${notionPage.url}`);
            
            return {
                success: true,
                notionUrl: notionPage.url,
                stats: {
                    videosProcessed: videos.length,
                    imagesProcessed: images.length,
                    urlsResolved: urls.filter(u => u.resolved !== u.original).length
                }
            };
            
        } catch (error) {
            this.log('ERROR', `Post processing failed: ${error.message}`, error);
            throw error;
        }
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
                    const processedImage = {
                        url: image.url,
                        alt: image.alt || `Image ${index + 1}`,
                        index: index
                    };
                    
                    // If base64 data is provided, save to Dropbox
                    if (image.base64 && this.dropboxHandler.isConfigured()) {
                        const filename = `image_${Date.now()}_${index}.jpg`;
                        const dropboxPath = await this.dropboxHandler.saveImageFromBase64(
                            image.base64,
                            filename
                        );
                        processedImage.dropboxPath = dropboxPath;
                        processedImage.filename = filename;
                    }
                    
                    return processedImage;
                    
                } catch (error) {
                    this.log('ERROR', `Failed to process image ${index + 1}: ${error.message}`);
                    return {
                        failed: true,
                        error: error.message,
                        url: image.url,
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
        
        const processedUrls = [];
        
        for (const url of urls) {
            try {
                // Check if URL needs resolution
                if (url.includes('lnkd.in') || url.includes('linkedin.com/redir')) {
                    const resolved = await this.resolveShortUrl(url);
                    processedUrls.push({
                        original: url,
                        resolved: resolved,
                        wasShortened: true,
                        wasResolved: resolved !== url
                    });
                } else {
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
        
        return processedUrls;
    }
    
    /**
     * Resolve shortened URL
     */
    async resolveShortUrl(url) {
        // This would contain the URL resolution logic from server.js
        // Keeping it simple for now to avoid breaking existing functionality
        return url; // Placeholder - actual implementation would be moved here
    }
    
    /**
     * Create Notion page with processed content
     */
    async createNotionPage(data) {
        this.log('INFO', 'Creating Notion page');
        
        const notionData = {
            title: data.text?.substring(0, 100) || `LinkedIn post from ${data.author}`,
            content: data.text,
            author: data.author,
            authorProfileUrl: data.authorProfileUrl,
            sourceUrl: data.url,
            timestamp: data.timestamp,
            videos: data.processedVideos,
            images: data.processedImages,
            processedUrls: data.processedUrls,
            debugInfo: data.debugInfo
        };
        
        return await RetryUtils.withRetry(
            () => this.notionClient.createPage(notionData),
            3,
            2000
        );
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
}

module.exports = PostProcessingService;