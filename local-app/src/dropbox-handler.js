const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { Dropbox } = require('dropbox');

class DropboxHandler {
    constructor(config) {
        this.config = config;
        this.dropboxPath = this.expandPath(config.dropbox.localPath);
        
        // Initialize Dropbox API client if access token is provided
        if (config.dropbox.accessToken && config.dropbox.accessToken !== 'YOUR_DROPBOX_ACCESS_TOKEN') {
            this.dbx = new Dropbox({ accessToken: config.dropbox.accessToken });
            this.hasApiAccess = true;
            console.log('✅ Dropbox API initialized');
        } else {
            this.hasApiAccess = false;
            console.log('⚠️  Dropbox API not configured - using local folder only');
        }
    }

    /**
     * Save image to Dropbox folder
     * @param {Buffer} imageBuffer - Image buffer
     * @param {String} filename - Image filename
     * @param {Object} postData - Post metadata for organization
     * @returns {Object} Dropbox file info with shareable URL
     */
    async saveImage(imageBuffer, filename, postData) {
        console.log(`📦 Saving image to Dropbox: ${filename}`);
        
        // Create organized folder structure
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const authorSlug = this.slugify(postData.author);
        
        const targetDir = path.join(this.dropboxPath, date, authorSlug);
        await fs.ensureDir(targetDir);
        
        const targetPath = path.join(targetDir, filename);
        const relativePath = path.relative(this.dropboxPath, targetPath);
        
        try {
            // Save image to local Dropbox folder
            await fs.writeFile(targetPath, imageBuffer);
            console.log(`✅ Image saved locally: ${relativePath}`);
            
            // If we have API access, also upload directly to Dropbox
            if (this.hasApiAccess) {
                const dropboxPath = '/LinkedIn_Videos/' + relativePath;
                
                try {
                    console.log(`📤 Uploading to Dropbox API: ${dropboxPath}`);
                    console.log(`   File size: ${this.formatFileSize(imageBuffer.length)}`);
                    
                    // Upload file directly via API
                    const uploadResult = await this.dbx.filesUpload({
                        path: dropboxPath,
                        contents: imageBuffer,
                        mode: { '.tag': 'overwrite' },
                        autorename: false,
                        mute: true
                    });
                    
                    console.log('✅ Uploaded to Dropbox via API');
                    console.log(`   Uploaded path: ${uploadResult.result.path_display}`);
                    
                    // Now create shareable link immediately
                    const shareableUrl = await this.generateShareableLinkDirect(dropboxPath, filename);
                    
                    return {
                        path: targetPath,
                        relativePath: relativePath,
                        shareableUrl: shareableUrl,
                        filename: filename
                    };
                    
                } catch (apiError) {
                    console.warn('⚠️  API upload failed, falling back to local save:', apiError.message);
                    if (apiError.error) {
                        console.log('   Error details:', JSON.stringify(apiError.error, null, 2));
                    }
                }
            }
            
            // Fallback: Generate shareable link the old way
            const shareableUrl = await this.generateShareableLink(targetPath);
            
            return {
                path: targetPath,
                relativePath: relativePath,
                shareableUrl: shareableUrl,
                filename: filename
            };
            
        } catch (error) {
            throw new Error(`Failed to save image to Dropbox: ${error.message}`);
        }
    }

    /**
     * Save processed video to Dropbox folder
     * @param {Object} processedVideo - Video info from VideoProcessor
     * @param {Object} postData - Post metadata for organization
     * @returns {Object} Dropbox file info with shareable URL
     */
    async saveVideo(processedVideo, postData) {
        console.log(`📦 Saving video to Dropbox: ${processedVideo.filename}`);
        
        // Create organized folder structure
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const authorSlug = this.slugify(postData.author);
        
        const targetDir = path.join(this.dropboxPath, date, authorSlug);
        await fs.ensureDir(targetDir);
        
        const targetPath = path.join(targetDir, processedVideo.filename);
        
        try {
            // Copy video to Dropbox folder
            await fs.copy(processedVideo.path, targetPath);
            
            console.log(`✅ Video saved to Dropbox: ${path.relative(this.dropboxPath, targetPath)}`);
            
            // Generate shareable link (simulated for now)
            const shareableUrl = await this.generateShareableLink(targetPath);
            
            // Clean up temp file
            await fs.remove(processedVideo.path);
            
            return {
                path: targetPath,
                relativePath: path.relative(this.dropboxPath, targetPath),
                shareableUrl: shareableUrl,
                size: processedVideo.size,
                filename: processedVideo.filename
            };
            
        } catch (error) {
            throw new Error(`Failed to save video to Dropbox: ${error.message}`);
        }
    }

    /**
     * Generate a shareable link for a file already uploaded via API
     * @param {String} dropboxPath - Path in Dropbox (e.g., /LinkedIn_Videos/...)
     * @param {String} filename - Filename for the URL
     */
    async generateShareableLinkDirect(dropboxPath, filename) {
        try {
            // Try to create a shared link
            const result = await this.dbx.sharingCreateSharedLinkWithSettings({
                path: dropboxPath,
                settings: {
                    requested_visibility: { '.tag': 'public' },
                    audience: { '.tag': 'public' },
                    access: { '.tag': 'viewer' }
                }
            });
            
            const shareableUrl = result.result.url;
            const streamingUrl = shareableUrl
                .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
                .replace('?dl=0', '');
            
            console.log(`✅ Created share link: ${shareableUrl}`);
            
            return {
                viewUrl: shareableUrl,
                streamingUrl: streamingUrl,
                filename: filename
            };
            
        } catch (error) {
            // If link already exists, retrieve it
            if (error.error?.error?.['.tag'] === 'shared_link_already_exists' || 
                error.error?.error_summary?.includes('shared_link_already_exists')) {
                
                const links = await this.dbx.sharingListSharedLinks({
                    path: dropboxPath
                });
                
                if (links.result.links.length > 0) {
                    const shareableUrl = links.result.links[0].url;
                    const streamingUrl = shareableUrl
                        .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
                        .replace('?dl=0', '');
                    
                    console.log(`✅ Retrieved existing share link: ${shareableUrl}`);
                    
                    return {
                        viewUrl: shareableUrl,
                        streamingUrl: streamingUrl,
                        filename: filename
                    };
                }
            }
            
            throw error;
        }
    }
    
    /**
     * Generate a shareable Dropbox link
     * Uses real Dropbox API if configured, otherwise creates a mock link
     */
    async generateShareableLink(filePath) {
        const relativePath = path.relative(this.dropboxPath, filePath);
        const filename = path.basename(filePath);
        
        if (this.hasApiAccess) {
            try {
                // Wait for file to be written locally
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Get the Dropbox path (relative to Dropbox root)
                // The path should include the LinkedIn_Videos folder
                const dropboxRelativePath = '/LinkedIn_Videos/' + relativePath;
                
                console.log(`🔄 Creating Dropbox share link for: ${dropboxRelativePath}`);
                
                // Wait for Dropbox to sync the file (with retries)
                let fileExists = false;
                let retries = 0;
                const maxRetries = 5;
                const retryDelay = 3000; // 3 seconds between retries
                
                while (!fileExists && retries < maxRetries) {
                    try {
                        await this.dbx.filesGetMetadata({ path: dropboxRelativePath });
                        console.log('✅ File exists in Dropbox');
                        fileExists = true;
                    } catch (checkError) {
                        retries++;
                        if (retries < maxRetries) {
                            console.log(`⚠️  File not yet in Dropbox, waiting... (attempt ${retries}/${maxRetries})`);
                            await new Promise(resolve => setTimeout(resolve, retryDelay));
                        } else {
                            console.log('⚠️  File still not in Dropbox after retries, may need manual sync');
                        }
                    }
                }
                
                if (!fileExists) {
                    throw new Error('File not synced to Dropbox after waiting');
                }
                
                // Try to create a shared link
                try {
                    const result = await this.dbx.sharingCreateSharedLinkWithSettings({
                        path: dropboxRelativePath,
                        settings: {
                            requested_visibility: { '.tag': 'public' },
                            audience: { '.tag': 'public' },
                            access: { '.tag': 'viewer' }
                        }
                    });
                    
                    const shareableUrl = result.result.url;
                    // Convert to direct link format that works with image embedding
                    // Replace www.dropbox.com with dl.dropboxusercontent.com
                    const streamingUrl = shareableUrl
                        .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
                        .replace('?dl=0', '');
                    
                    console.log(`✅ Created Dropbox share link: ${shareableUrl}`);
                    console.log(`📸 Direct image URL: ${streamingUrl}`);
                    
                    return {
                        viewUrl: shareableUrl,
                        streamingUrl: streamingUrl,
                        filename: filename,
                        relativePath: relativePath
                    };
                    
                } catch (error) {
                    console.log('Dropbox API error details:', JSON.stringify(error.error || error, null, 2));
                    
                    // If link already exists, retrieve it
                    if (error.error?.error?.['.tag'] === 'shared_link_already_exists' || 
                        error.error?.error_summary?.includes('shared_link_already_exists')) {
                        console.log('🔄 Share link already exists, retrieving...');
                        
                        const links = await this.dbx.sharingListSharedLinks({
                            path: dropboxRelativePath
                        });
                        
                        if (links.result.links.length > 0) {
                            const shareableUrl = links.result.links[0].url;
                            // Convert to direct link format that works with image embedding
                            const streamingUrl = shareableUrl
                                .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
                                .replace('?dl=0', '');
                            
                            console.log(`✅ Retrieved existing share link: ${shareableUrl}`);
                            console.log(`📸 Direct image URL: ${streamingUrl}`);
                            
                            return {
                                viewUrl: shareableUrl,
                                streamingUrl: streamingUrl,
                                filename: filename,
                                relativePath: relativePath
                            };
                        }
                    }
                    
                    throw error;
                }
                
            } catch (error) {
                console.error('⚠️  Dropbox API error:', error.message);
                console.log('📝 Falling back to mock URL');
                // Fall back to mock URL
            }
        }
        
        // Fallback: Generate mock share link
        const mockShareId = this.generateMockShareId(filePath);
        const shareableUrl = `https://www.dropbox.com/s/${mockShareId}/${encodeURIComponent(filename)}?dl=0`;
        
        console.log(`🔗 Generated mock shareable link: ${shareableUrl}`);
        
        const streamingUrl = shareableUrl.replace('?dl=0', '?raw=1');
        
        return {
            viewUrl: shareableUrl,
            streamingUrl: streamingUrl,
            filename: filename,
            relativePath: relativePath
        };
    }

    /**
     * Test Dropbox setup and permissions
     */
    async testSetup() {
        console.log(`🧪 Testing Dropbox setup...`);
        
        try {
            // Check if Dropbox folder exists and is writable
            await fs.ensureDir(this.dropboxPath);
            
            // Test write permissions
            const testFile = path.join(this.dropboxPath, 'notionally_test.txt');
            await fs.writeFile(testFile, `Test file created at ${new Date().toISOString()}`);
            
            // Check if we can read it back
            const content = await fs.readFile(testFile, 'utf8');
            
            // Clean up test file
            await fs.remove(testFile);
            
            console.log(`✅ Dropbox setup test successful`);
            
            return {
                dropboxPath: this.dropboxPath,
                accessible: true,
                writable: true,
                testContent: content.substring(0, 50) + '...'
            };
            
        } catch (error) {
            throw new Error(`Dropbox setup test failed: ${error.message}`);
        }
    }

    /**
     * Create organized folder structure for LinkedIn videos
     */
    async createFolderStructure() {
        const baseStructure = [
            'LinkedIn_Videos',
            'LinkedIn_Videos/Archive',
            'LinkedIn_Videos/By_Author',
            'LinkedIn_Videos/By_Date'
        ];
        
        for (const folder of baseStructure) {
            const folderPath = path.join(this.dropboxPath, folder);
            await fs.ensureDir(folderPath);
        }
        
        console.log('📁 Created Dropbox folder structure');
    }

    /**
     * Get video statistics from Dropbox folder
     */
    async getVideoStats() {
        try {
            const videoFiles = await this.findVideoFiles(this.dropboxPath);
            
            let totalSize = 0;
            const stats = {
                totalVideos: videoFiles.length,
                byAuthor: {},
                byDate: {},
                totalSize: 0,
                oldestVideo: null,
                newestVideo: null
            };
            
            for (const file of videoFiles) {
                const stat = await fs.stat(file.path);
                totalSize += stat.size;
                
                // Track by date
                const date = stat.mtime.toISOString().split('T')[0];
                stats.byDate[date] = (stats.byDate[date] || 0) + 1;
                
                // Track oldest/newest
                if (!stats.oldestVideo || stat.mtime < stats.oldestVideo.date) {
                    stats.oldestVideo = { file: file.name, date: stat.mtime };
                }
                if (!stats.newestVideo || stat.mtime > stats.newestVideo.date) {
                    stats.newestVideo = { file: file.name, date: stat.mtime };
                }
            }
            
            stats.totalSize = totalSize;
            return stats;
            
        } catch (error) {
            throw new Error(`Failed to get video stats: ${error.message}`);
        }
    }

    /**
     * Utility functions
     */
    expandPath(filePath) {
        if (filePath.startsWith('~/')) {
            return path.join(os.homedir(), filePath.slice(2));
        }
        return filePath;
    }

    slugify(text) {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\\s+/g, '_')
            .replace(/[^a-z0-9_-]/g, '')
            .substring(0, 30);
    }

    generateMockShareId(filePath) {
        // Generate a consistent mock share ID based on file path
        // In reality, this would come from Dropbox API
        const hash = this.simpleHash(filePath);
        return hash.substring(0, 15); // Dropbox share IDs are typically 15 chars
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    async findVideoFiles(directory) {
        const videoExtensions = ['.mp4', '.webm', '.avi', '.mov', '.mkv'];
        const files = [];
        
        async function scanDirectory(dir) {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory()) {
                    await scanDirectory(fullPath);
                } else if (videoExtensions.includes(path.extname(entry.name).toLowerCase())) {
                    files.push({
                        name: entry.name,
                        path: fullPath
                    });
                }
            }
        }
        
        await scanDirectory(directory);
        return files;
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
}

module.exports = DropboxHandler;
