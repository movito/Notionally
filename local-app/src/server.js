// Node version check
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split('.')[0]);

if (majorVersion < 22) {
    console.error(`❌ Node.js version ${nodeVersion} is not supported.`);
    console.error('📦 This application requires Node.js version 22.0.0 or higher.');
    console.error('💡 Please upgrade Node.js to version 22 or higher.');
    console.error('');
    console.error('To install Node.js 22, you can:');
    console.error('  • Use nvm: nvm install 22 && nvm use 22');
    console.error('  • Use Homebrew: brew install node@22');
    console.error('  • Download from: https://nodejs.org/');
    process.exit(1);
}

console.log(`✅ Running with Node.js ${nodeVersion}`);

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');

const VideoProcessor = require('./video-processor');
const NotionClient = require('./notion-client');
const DropboxHandler = require('./dropbox-handler');

// Load configuration
const configPath = path.join(__dirname, '..', 'config.json');
let config;

try {
    config = require(configPath);
    console.log('✅ Configuration loaded from config.json');
} catch (error) {
    console.error('❌ Could not load config.json');
    console.error('Please copy config.example.json to config.json and fill in your details');
    process.exit(1);
}

const app = express();
const port = config.server.port || 8765;

// Initialize service classes
const videoProcessor = new VideoProcessor(config);
const notionClient = new NotionClient(config);
const dropboxHandler = new DropboxHandler(config);

// Middleware
app.use(cors({
    origin: ['https://www.linkedin.com', 'https://linkedin.com'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Test endpoint - saves post data without using Notion
app.post('/test-save', async (req, res) => {
    try {
        console.log('📥 TEST MODE: Received save request');
        const postData = req.body;
        
        // Log the received data
        console.log('Post Data:', {
            author: postData.author,
            textLength: postData.text?.length || 0,
            url: postData.url,
            hasImages: postData.media?.images?.length > 0,
            imageCount: postData.media?.images?.length || 0,
            hasVideos: postData.media?.videos?.length > 0,
            videoCount: postData.media?.videos?.length || 0
        });
        
        // Save to a test file for inspection
        const testFile = path.join(__dirname, '..', 'temp', `test-post-${Date.now()}.json`);
        await fs.writeJson(testFile, postData, { spaces: 2 });
        console.log(`✅ Test data saved to: ${testFile}`);
        
        res.json({
            success: true,
            message: 'Test save successful',
            data: {
                file: testFile,
                textPreview: postData.text?.substring(0, 100),
                imageCount: postData.media?.images?.length || 0
            }
        });
    } catch (error) {
        console.error('❌ Test save error:', error);
        res.status(500).json({
            error: 'Test save failed',
            message: error.message
        });
    }
});

// Main endpoint to save LinkedIn posts
app.post('/save-post', async (req, res) => {
    try {
        console.log('📥 Received save request');
        const postData = req.body;
        
        // Validate required fields
        if (!postData.text && !postData.media?.videos?.length) {
            return res.status(400).json({
                error: 'Post must have text content or videos',
                code: 'INVALID_POST_DATA'
            });
        }

        console.log(`📝 Processing post from ${postData.author}`);
        if (postData.authorProfileUrl) {
            console.log(`   Author profile: ${postData.authorProfileUrl}`);
        } else {
            console.log(`   ⚠️ No author profile URL received`);
        }
        console.log(`📄 Text preview: ${postData.text.substring(0, 100)}...`);
        console.log(`🎬 Videos found: ${postData.media?.videos?.length || 0}`);

        // Step 1: Process videos if present
        let processedVideos = [];
        if (postData.media?.videos?.length > 0) {
            console.log('🎬 Processing videos...');
            
            for (let i = 0; i < postData.media.videos.length; i++) {
                const video = postData.media.videos[i];
                console.log(`  📥 Downloading video ${i + 1}/${postData.media.videos.length}`);
                
                try {
                    // Download and process the video
                    const processedVideo = await videoProcessor.processVideo(video, postData);
                    
                    // Save to Dropbox folder
                    const dropboxInfo = await dropboxHandler.saveVideo(processedVideo, postData);
                    
                    processedVideos.push({
                        originalUrl: video.src,
                        localPath: processedVideo.path,
                        dropboxPath: dropboxInfo.path,
                        shareableUrl: dropboxInfo.shareableUrl,
                        size: processedVideo.size,
                        duration: processedVideo.duration
                    });
                    
                    console.log(`  ✅ Video ${i + 1} processed and saved to Dropbox`);
                } catch (videoError) {
                    console.error(`  ❌ Error processing video ${i + 1}:`, videoError.message);
                    
                    // Add note about failed video
                    processedVideos.push({
                        originalUrl: video.src,
                        error: videoError.message,
                        failed: true
                    });
                    
                    // Continue with other videos even if one fails
                }
            }
        }

        // Step 2: Process and save images to Dropbox
        let processedImages = [];
        if (postData.media?.images?.length > 0) {
            console.log(`🖼️ Processing ${postData.media.images.length} image(s)...`);
            
            for (let i = 0; i < postData.media.images.length; i++) {
                const image = postData.media.images[i];
                console.log(`  📥 Processing image ${i + 1}/${postData.media.images.length}`);
                
                try {
                    if (image.base64) {
                        // Convert base64 to buffer
                        const base64Data = image.base64.split(',')[1];
                        const buffer = Buffer.from(base64Data, 'base64');
                        
                        // Determine file extension from mime type
                        const mimeMatch = image.base64.match(/data:image\/(\w+);/);
                        const extension = mimeMatch ? mimeMatch[1] : 'jpg';
                        
                        // Create filename
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        const filename = `linkedin_image_${timestamp}_${i}.${extension}`;
                        
                        // Save to Dropbox
                        const dropboxInfo = await dropboxHandler.saveImage(buffer, filename, postData);
                        
                        // Create local server URL for the image
                        const localServerUrl = `http://${config.server.host}:${config.server.port}/media/${dropboxInfo.relativePath}`;
                        
                        processedImages.push({
                            originalSrc: image.src,
                            alt: image.alt || '',
                            dropboxPath: dropboxInfo.relativePath,
                            shareableUrl: dropboxInfo.shareableUrl,
                            localServerUrl: localServerUrl,
                            filename: filename
                        });
                        
                        console.log(`  ✅ Image ${i + 1} saved to Dropbox`);
                    } else {
                        // No base64, just note the image exists
                        processedImages.push({
                            originalSrc: image.src,
                            alt: image.alt || '',
                            noBase64: true
                        });
                        console.log(`  ⚠️ Image ${i + 1} not downloaded (no base64)`);
                    }
                } catch (imageError) {
                    console.error(`  ❌ Error processing image ${i + 1}:`, imageError.message);
                    processedImages.push({
                        originalSrc: image.src,
                        alt: image.alt || '',
                        error: imageError.message
                    });
                }
            }
        }

        // Step 3: Create Notion page (without images first)
        console.log('📋 Creating Notion page...');
        
        // Process URLs server-side - properly unfurl LinkedIn shortened URLs
        let processedUrls = [];
        if (postData.urls?.length > 0) {
            console.log(`🔗 Processing ${postData.urls.length} URL(s)...`);
            
            for (const url of postData.urls) {
                try {
                    if (url.includes('lnkd.in') || url.includes('linkedin.com/redir')) {
                        console.log(`  Unfurling LinkedIn shortened URL: ${url}`);
                        
                        // First, try simple approach - just follow all redirects
                        try {
                            const simpleResponse = await fetch(url, {
                                method: 'GET',
                                redirect: 'follow', // Auto-follow all redirects
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                }
                            });
                            
                            const finalUrl = simpleResponse.url;
                            console.log(`    Simple fetch final URL: ${finalUrl}`);
                            
                            // If we got a non-LinkedIn URL, we're done!
                            if (finalUrl && !finalUrl.includes('linkedin.com') && !finalUrl.includes('lnkd.in')) {
                                console.log(`    ✅ Resolved to: ${finalUrl}`);
                                processedUrls.push({
                                    original: url,
                                    resolved: finalUrl,
                                    wasShortened: true
                                });
                                continue; // Skip to next URL
                            }
                        } catch (simpleError) {
                            console.log(`    Simple fetch failed: ${simpleError.message}`);
                        }
                        
                        // Step 1: Follow the initial redirect
                        const response = await fetch(url, {
                            method: 'GET',
                            redirect: 'manual', // Don't auto-follow, we want to see each step
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                                'Accept-Language': 'en-US,en;q=0.5',
                            }
                        });
                        
                        console.log(`    Response status: ${response.status}`);
                        console.log(`    Response headers:`, [...response.headers.entries()].slice(0, 5));
                        
                        // Check if we got a redirect
                        let intermediateUrl = url;
                        if (response.status === 301 || response.status === 302 || response.status === 303 || response.status === 307 || response.status === 308) {
                            intermediateUrl = response.headers.get('location');
                            console.log(`    Redirected to: ${intermediateUrl}`);
                        } else if (response.status === 200) {
                            // LinkedIn might return 200 with the redirect in the body
                            console.log(`    Got 200 response, checking body for redirect...`);
                            const html = await response.text();
                            
                            // Look for meta refresh or JavaScript redirects
                            const patterns = [
                                /<meta[^>]*http-equiv=["']refresh["'][^>]*content=["']0;url=([^"']+)["']/i,
                                /window\.location\.href\s*=\s*["']([^"']+)["']/,
                                /window\.location\.replace\(["']([^"']+)["']\)/,
                            ];
                            
                            for (const pattern of patterns) {
                                const match = html.match(pattern);
                                if (match && match[1]) {
                                    intermediateUrl = match[1];
                                    console.log(`    Found redirect in HTML: ${intermediateUrl}`);
                                    break;
                                }
                            }
                            
                            // If still no redirect found, look for any LinkedIn redir URL
                            if (intermediateUrl === url) {
                                const redirMatch = html.match(/https:\/\/www\.linkedin\.com\/redir[^"'\s]*/);
                                if (redirMatch) {
                                    intermediateUrl = redirMatch[0];
                                    console.log(`    Found LinkedIn redir URL in content: ${intermediateUrl}`);
                                }
                            }
                        }
                        
                        // Step 2: If we got redirected to LinkedIn's warning page, extract the actual URL
                        if (intermediateUrl && intermediateUrl.includes('linkedin.com')) {
                            console.log(`    Fetching LinkedIn warning page...`);
                            
                            const warningPageResponse = await fetch(intermediateUrl, {
                                method: 'GET',
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (compatible; Notionally/1.0)',
                                }
                            });
                            
                            const html = await warningPageResponse.text();
                            
                            // Look for the actual destination URL in the warning page
                            // LinkedIn typically shows it in the URL parameters or in the page
                            const urlParams = new URL(intermediateUrl);
                            let finalUrl = urlParams.searchParams.get('url') || 
                                          urlParams.searchParams.get('originalUrl') ||
                                          urlParams.searchParams.get('destination');
                            
                            if (finalUrl) {
                                finalUrl = decodeURIComponent(finalUrl);
                                console.log(`    Found URL in parameters: ${finalUrl}`);
                            } else {
                                // Try to extract from the HTML
                                // Look for patterns like "You're being redirected to: [URL]"
                                const patterns = [
                                    /window\.location\.replace\(["']([^"']+)["']\)/,
                                    /href=["'](https?:\/\/(?!.*linkedin\.com)[^"']+)["']/,
                                    /You['']re being redirected to[^>]*>([^<]+)</,
                                    /"externalUrl":\s*"([^"]+)"/,
                                    /data-external-url=["']([^"']+)["']/
                                ];
                                
                                for (const pattern of patterns) {
                                    const match = html.match(pattern);
                                    if (match && match[1]) {
                                        finalUrl = match[1];
                                        console.log(`    Found URL in HTML: ${finalUrl}`);
                                        break;
                                    }
                                }
                            }
                            
                            if (finalUrl && !finalUrl.includes('linkedin.com') && !finalUrl.includes('lnkd.in')) {
                                console.log(`    ✅ Resolved to: ${finalUrl}`);
                                processedUrls.push({
                                    original: url,
                                    resolved: finalUrl,
                                    wasShortened: true
                                });
                            } else {
                                console.log(`    ⚠️ Could not extract final URL`);
                                processedUrls.push({
                                    original: url,
                                    resolved: url,
                                    wasShortened: true,
                                    failedToResolve: true
                                });
                            }
                        } else {
                            // Direct redirect without LinkedIn intermediate page
                            if (intermediateUrl && intermediateUrl !== url) {
                                console.log(`    ✅ Direct redirect to: ${intermediateUrl}`);
                                processedUrls.push({
                                    original: url,
                                    resolved: intermediateUrl,
                                    wasShortened: true
                                });
                            } else {
                                console.log(`    ⚠️ No redirect found`);
                                processedUrls.push({
                                    original: url,
                                    resolved: url,
                                    wasShortened: true,
                                    failedToResolve: true
                                });
                            }
                        }
                    } else {
                        // Not a shortened URL
                        processedUrls.push({
                            original: url,
                            resolved: url,
                            wasShortened: false
                        });
                    }
                } catch (error) {
                    console.log(`    ❌ Error processing ${url}: ${error.message}`);
                    processedUrls.push({
                        original: url,
                        resolved: url,
                        wasShortened: url.includes('lnkd.in'),
                        error: error.message
                    });
                }
            }
            
            console.log(`✅ Processed ${processedUrls.length} URL(s)`);
        } else if (postData.processedUrls?.length > 0) {
            // Use pre-processed URLs if provided (backwards compatibility)
            processedUrls = postData.processedUrls;
        }
        
        const notionPage = await notionClient.createPage({
            title: postData.text.substring(0, 100) || `LinkedIn post from ${postData.author}`,
            content: postData.text,
            author: postData.author,
            authorProfileUrl: postData.authorProfileUrl, // Pass through author profile URL
            sourceUrl: postData.url,
            timestamp: postData.timestamp,
            videos: processedVideos,
            images: [], // Don't include images in initial creation
            processedUrls: processedUrls // Pass the server-processed URLs
        });

        console.log(`✅ Notion page created: ${notionPage.url}`);
        
        // Step 4: Add images to the page if present
        if (processedImages.length > 0) {
            console.log('📸 Adding images to Notion page...');
            await notionClient.addImagesToPage(notionPage.id, processedImages, postData.url);
            console.log(`✅ Added ${processedImages.length} image(s) to Notion page`);
        }

        console.log(`✅ Successfully saved post to Notion: ${notionPage.url}`);

        // Return success response
        res.json({
            success: true,
            message: 'Post saved successfully',
            data: {
                notionPageId: notionPage.id,
                notionPageUrl: notionPage.url,
                videosProcessed: processedVideos.length,
                videos: processedVideos.map(v => ({
                    dropboxUrl: v.shareableUrl,
                    size: v.size
                }))
            }
        });

    } catch (error) {
        console.error('❌ Error saving post:', error);
        
        res.status(500).json({
            error: 'Failed to save post',
            message: error.message,
            code: error.code || 'UNKNOWN_ERROR'
        });
    }
});

// Endpoint to test Notion connection
app.get('/test-notion', async (req, res) => {
    try {
        const testResult = await notionClient.testConnection();
        res.json({
            success: true,
            message: 'Notion connection successful',
            data: testResult
        });
    } catch (error) {
        res.status(500).json({
            error: 'Notion connection failed',
            message: error.message
        });
    }
});

// Endpoint to test Dropbox setup
app.get('/test-dropbox', async (req, res) => {
    try {
        const testResult = await dropboxHandler.testSetup();
        res.json({
            success: true,
            message: 'Dropbox setup successful',
            data: testResult
        });
    } catch (error) {
        res.status(500).json({
            error: 'Dropbox setup failed',
            message: error.message
        });
    }
});

// Static file serving for media files
app.use('/videos', express.static(path.join(__dirname, '..', 'temp')));

// Serve Dropbox files (images and videos)
app.use('/media', (req, res, next) => {
    const requestedPath = req.path;
    // Expand the dropbox path if it starts with ~
    const expandedDropboxPath = config.dropbox.localPath.startsWith('~/') 
        ? path.join(require('os').homedir(), config.dropbox.localPath.slice(2))
        : config.dropbox.localPath;
    
    const fullPath = path.join(expandedDropboxPath, requestedPath);
    
    // Security check - ensure we're only serving from Dropbox folder
    if (!fullPath.startsWith(path.resolve(expandedDropboxPath))) {
        return res.status(403).json({ error: 'Access denied' });
    }
    
    res.sendFile(fullPath, (err) => {
        if (err) {
            console.error('Error serving file:', err.message);
            res.status(404).json({ error: 'File not found' });
        }
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.originalUrl
    });
});

// Start server with error handling
const server = app.listen(port, config.server.host, () => {
    console.log('🚀 Notionally Local App Started');
    console.log(`📡 Server running at http://${config.server.host}:${port}`);
    console.log(`📂 Dropbox folder: ${config.dropbox.localPath}`);
    console.log('🔗 Notion integration ready');
    console.log('');
    console.log('✨ Ready to receive requests from Greasemonkey script!');
    console.log('   Visit LinkedIn and look for "Save to Notion" buttons');
});

// Handle port in use error
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use`);
        console.error('');
        console.error('To fix this, you can:');
        console.error(`  1. Kill the process using port ${port}:`);
        console.error(`     lsof -i :${port} | grep LISTEN | awk '{print $2}' | xargs kill`);
        console.error(`  2. Or use a different port in config.json`);
        console.error('');
        process.exit(1);
    } else {
        throw error;
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\\n🛑 Shutting down gracefully...');
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
