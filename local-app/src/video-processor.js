const fs = require('fs-extra');
const path = require('path');
// Using native fetch in Node 22+ instead of node-fetch
const ffmpeg = require('fluent-ffmpeg');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class VideoProcessor {
    constructor(config) {
        this.config = config;
        this.tempDir = path.join(__dirname, '..', 'temp');
        
        // Ensure temp directory exists
        fs.ensureDirSync(this.tempDir);
        
        // Check for ffmpeg on startup
        this.checkFfmpeg();
    }
    
    /**
     * Check if ffmpeg is installed
     */
    async checkFfmpeg() {
        try {
            await execAsync('ffmpeg -version');
            console.log('✅ FFmpeg is installed');
            return true;
        } catch (error) {
            console.warn('⚠️  FFmpeg not found - video processing will be limited');
            console.warn('   Install ffmpeg for full video support: brew install ffmpeg');
            return false;
        }
    }

    /**
     * Download and process a video from LinkedIn
     * @param {Object} video - Video object with src, poster properties
     * @param {Object} postData - Post metadata for naming
     * @returns {Object} Processed video info
     */
    async processVideo(video, postData) {
        console.log(`🎬 Processing video: ${video.src}`);
        
        if (!video.src) {
            throw new Error('Video source URL is missing');
        }

        // Generate unique filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const authorSlug = this.slugify(postData.author);
        const filename = `${timestamp}_${authorSlug}.mp4`;
        const tempPath = path.join(this.tempDir, filename);

        try {
            // Step 1: Download the video
            const downloadedPath = await this.downloadVideo(video.src, tempPath);
            
            // Step 2: Get video metadata
            const metadata = await this.getVideoMetadata(downloadedPath);
            
            // Step 3: Process/compress if needed
            const processedPath = await this.compressVideo(downloadedPath, metadata);
            
            // Step 4: Get final file info
            const stats = await fs.stat(processedPath);
            
            console.log(`✅ Video processed: ${path.basename(processedPath)} (${this.formatFileSize(stats.size)})`);
            
            return {
                path: processedPath,
                filename: path.basename(processedPath),
                size: stats.size,
                sizeFormatted: this.formatFileSize(stats.size),
                duration: metadata.duration,
                format: metadata.format,
                resolution: `${metadata.width}x${metadata.height}`
            };
            
        } catch (error) {
            console.error(`❌ Error processing video: ${error.message}`);
            
            // Clean up any partial files
            if (await fs.pathExists(tempPath)) {
                await fs.remove(tempPath);
            }
            
            throw error;
        }
    }

    /**
     * Download video from URL (supports HLS/m3u8 streams)
     */
    async downloadVideo(url, outputPath) {
        console.log(`  📥 Downloading from: ${url}`);
        
        try {
            // Check if it's an HLS stream
            if (url.includes('.m3u8')) {
                console.log('  🎬 Detected HLS stream, using ffmpeg to download...');
                return await this.downloadHLSStream(url, outputPath);
            }
            
            // Regular download for direct MP4 files
            const response = await fetch(url, {
                headers: {
                    'User-Agent': this.config.linkedin.userAgent,
                    'Referer': 'https://www.linkedin.com/'
                },
                timeout: this.config.linkedin.timeout
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const buffer = await response.buffer();
            await fs.writeFile(outputPath, buffer);
            
            console.log(`  ✅ Downloaded: ${this.formatFileSize(buffer.length)}`);
            return outputPath;
            
        } catch (error) {
            throw new Error(`Download failed: ${error.message}`);
        }
    }
    
    /**
     * Download HLS/m3u8 stream using ffmpeg
     */
    async downloadHLSStream(url, outputPath) {
        return new Promise((resolve, reject) => {
            const ffmpegCommand = ffmpeg(url)
                .inputOptions([
                    '-user_agent', this.config.linkedin.userAgent,
                    '-referer', 'https://www.linkedin.com/',
                    '-protocol_whitelist', 'file,http,https,tcp,tls'
                ])
                .outputOptions([
                    '-c', 'copy',  // Copy streams without re-encoding
                    '-bsf:a', 'aac_adtstoasc'  // Fix for AAC audio
                ])
                .output(outputPath)
                .on('start', (cmd) => {
                    console.log('  🎬 FFmpeg command:', cmd);
                })
                .on('progress', (progress) => {
                    if (progress.percent) {
                        console.log(`  ⏳ Progress: ${Math.round(progress.percent)}%`);
                    }
                })
                .on('end', () => {
                    console.log('  ✅ HLS stream downloaded successfully');
                    resolve(outputPath);
                })
                .on('error', (err) => {
                    console.error('  ❌ FFmpeg error:', err.message);
                    reject(new Error(`HLS download failed: ${err.message}`));
                });
            
            ffmpegCommand.run();
        });
    }

    /**
     * Get video metadata using ffmpeg
     */
    async getVideoMetadata(videoPath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) {
                    reject(new Error(`Metadata extraction failed: ${err.message}`));
                    return;
                }

                const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
                if (!videoStream) {
                    reject(new Error('No video stream found'));
                    return;
                }

                resolve({
                    duration: metadata.format.duration,
                    format: metadata.format.format_name,
                    width: videoStream.width,
                    height: videoStream.height,
                    bitrate: metadata.format.bit_rate,
                    size: metadata.format.size
                });
            });
        });
    }

    /**
     * Compress video if it's too large or wrong format
     */
    async compressVideo(inputPath, metadata) {
        const maxSizeBytes = this.parseFileSize(this.config.video.maxSize);
        const stats = await fs.stat(inputPath);
        
        // Check if compression is needed
        const needsCompression = stats.size > maxSizeBytes || 
                               !this.config.video.formats.includes(path.extname(inputPath).slice(1));

        if (!needsCompression) {
            console.log(`  ℹ️  Video within size limits, no compression needed`);
            return inputPath;
        }

        console.log(`  🔄 Compressing video (${this.formatFileSize(stats.size)} → target: ${this.config.video.maxSize})`);
        
        const outputPath = inputPath.replace('.mp4', '_compressed.mp4');
        
        return new Promise((resolve, reject) => {
            let ffmpegCommand = ffmpeg(inputPath)
                .outputFormat(this.config.video.outputFormat)
                .videoCodec('libx264')
                .audioCodec('aac');

            // Apply compression settings based on config
            switch (this.config.video.compression) {
                case 'high':
                    ffmpegCommand = ffmpegCommand
                        .videoBitrate('2000k')
                        .audioBitrate('128k')
                        .size('1280x720');
                    break;
                case 'medium':
                    ffmpegCommand = ffmpegCommand
                        .videoBitrate('1000k')
                        .audioBitrate('96k')
                        .size('854x480');
                    break;
                case 'low':
                    ffmpegCommand = ffmpegCommand
                        .videoBitrate('500k')
                        .audioBitrate('64k')
                        .size('640x360');
                    break;
            }

            ffmpegCommand
                .on('start', (commandLine) => {
                    console.log(`  🔄 FFmpeg command: ${commandLine}`);
                })
                .on('progress', (progress) => {
                    if (progress.percent) {
                        console.log(`  📊 Processing: ${Math.round(progress.percent)}%`);
                    }
                })
                .on('end', async () => {
                    try {
                        const compressedStats = await fs.stat(outputPath);
                        console.log(`  ✅ Compression complete: ${this.formatFileSize(compressedStats.size)}`);
                        
                        // Remove original file
                        await fs.remove(inputPath);
                        
                        resolve(outputPath);
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', (error) => {
                    reject(new Error(`Compression failed: ${error.message}`));
                })
                .save(outputPath);
        });
    }

    /**
     * Utility functions
     */
    slugify(text) {
        return text
            .toString()
            .toLowerCase()
            .trim()
            .replace(/\\s+/g, '_')
            .replace(/[^a-z0-9_-]/g, '')
            .substring(0, 50);
    }

    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    parseFileSize(sizeStr) {
        const units = {
            'B': 1,
            'KB': 1024,
            'MB': 1024 * 1024,
            'GB': 1024 * 1024 * 1024
        };
        
        const match = sizeStr.match(/^(\\d+(?:\\.\\d+)?)\\s*(B|KB|MB|GB)$/i);
        if (!match) {
            throw new Error(`Invalid file size format: ${sizeStr}`);
        }
        
        const [, size, unit] = match;
        return parseFloat(size) * units[unit.toUpperCase()];
    }

    /**
     * Clean up old temp files
     */
    async cleanupTempFiles() {
        try {
            const files = await fs.readdir(this.tempDir);
            const now = Date.now();
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            
            for (const file of files) {
                const filePath = path.join(this.tempDir, file);
                const stats = await fs.stat(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.remove(filePath);
                    console.log(`🗑️  Cleaned up old temp file: ${file}`);
                }
            }
        } catch (error) {
            console.error('Error cleaning up temp files:', error.message);
        }
    }
}

module.exports = VideoProcessor;
