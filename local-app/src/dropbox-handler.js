const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class DropboxHandler {
    constructor(config) {
        this.config = config;
        this.dropboxPath = this.expandPath(config.dropbox.localPath);
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
     * Generate a shareable Dropbox link
     * For now, this creates a simulated link structure
     * In a full implementation, you would use the Dropbox API
     */
    async generateShareableLink(filePath) {
        // This is a simplified version - in practice you'd need to:
        // 1. Wait for Dropbox to sync the file
        // 2. Use Dropbox API to create a shareable link
        // 3. Handle the async nature of Dropbox syncing
        
        const relativePath = path.relative(this.dropboxPath, filePath);
        const filename = path.basename(filePath);
        
        // Simulated Dropbox share link format
        // In reality, you'd get this from Dropbox API
        const mockShareId = this.generateMockShareId(filePath);
        const shareableUrl = `https://www.dropbox.com/s/${mockShareId}/${encodeURIComponent(filename)}?dl=0`;
        
        console.log(`🔗 Generated shareable link: ${shareableUrl}`);
        
        // For direct streaming (raw=1 instead of dl=0)
        const streamingUrl = shareableUrl.replace('?dl=0', '?raw=1');
        
        return {
            viewUrl: shareableUrl,      // For viewing in browser
            streamingUrl: streamingUrl,  // For direct embed/streaming
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
