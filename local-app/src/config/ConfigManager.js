/**
 * Configuration management with validation and environment variable support
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

class ConfigManager {
    constructor() {
        this.configPath = path.join(__dirname, '..', '..', 'config.json');
        this.config = null;
        this.loadConfig();
    }
    
    loadConfig() {
        // Load base configuration
        if (!fs.existsSync(this.configPath)) {
            throw new Error(`Configuration file not found: ${this.configPath}`);
        }
        
        try {
            this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        } catch (error) {
            throw new Error(`Failed to parse config.json: ${error.message}`);
        }
        
        // Apply environment variable overrides
        this.applyEnvironmentOverrides();
        
        // Validate configuration
        this.validateConfig();
        
        // Mask sensitive values in logs
        this.logConfiguration();
    }
    
    applyEnvironmentOverrides() {
        // Dropbox configuration
        if (process.env.DROPBOX_APP_KEY) {
            this.config.dropbox.appKey = process.env.DROPBOX_APP_KEY;
        }
        if (process.env.DROPBOX_APP_SECRET) {
            this.config.dropbox.appSecret = process.env.DROPBOX_APP_SECRET;
        }
        if (process.env.DROPBOX_REFRESH_TOKEN) {
            this.config.dropbox.refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
        }
        
        // Notion configuration
        if (process.env.NOTION_API_KEY) {
            this.config.notion.apiKey = process.env.NOTION_API_KEY;
        }
        if (process.env.NOTION_DATABASE_ID) {
            this.config.notion.databaseId = process.env.NOTION_DATABASE_ID;
        }
        
        // Server configuration
        if (process.env.PORT) {
            this.config.server.port = parseInt(process.env.PORT);
        }
        if (process.env.HOST) {
            this.config.server.host = process.env.HOST;
        }
    }
    
    validateConfig() {
        const required = {
            'notion.apiKey': this.config.notion?.apiKey,
            'notion.databaseId': this.config.notion?.databaseId,
            'dropbox.localPath': this.config.dropbox?.localPath,
            'server.port': this.config.server?.port,
            'server.host': this.config.server?.host
        };
        
        const missing = [];
        for (const [key, value] of Object.entries(required)) {
            if (!value) {
                missing.push(key);
            }
        }
        
        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }
        
        // Validate port range
        if (this.config.server.port < 1000 || this.config.server.port > 65535) {
            throw new Error('Server port must be between 1000 and 65535');
        }
        
        // Validate Dropbox path exists
        const expandedPath = this.config.dropbox.localPath.replace('~', process.env.HOME || process.env.USERPROFILE);
        if (!fs.existsSync(expandedPath)) {
            console.warn(`⚠️ Dropbox path does not exist: ${expandedPath}`);
        }
    }
    
    logConfiguration() {
        console.log('📋 Configuration loaded:');
        console.log('  Server:', `${this.config.server.host}:${this.config.server.port}`);
        console.log('  Dropbox path:', this.config.dropbox.localPath);
        console.log('  Notion database:', this.maskValue(this.config.notion.databaseId));
        console.log('  Notion API key:', this.maskValue(this.config.notion.apiKey));
        
        if (this.config.dropbox.refreshToken) {
            console.log('  Dropbox auth: Using refresh token');
        } else if (this.config.dropbox.accessToken) {
            console.log('  Dropbox auth: Using access token (will expire)');
        } else {
            console.log('  Dropbox auth: Local file system only');
        }
    }
    
    maskValue(value) {
        if (!value) return 'Not configured';
        if (value.length <= 8) return '****';
        return value.substring(0, 4) + '****' + value.substring(value.length - 4);
    }
    
    get(path) {
        const keys = path.split('.');
        let value = this.config;
        
        for (const key of keys) {
            value = value?.[key];
            if (value === undefined) {
                return undefined;
            }
        }
        
        return value;
    }
    
    getAll() {
        // Return a copy to prevent accidental modifications
        return JSON.parse(JSON.stringify(this.config));
    }
    
    isProduction() {
        return process.env.NODE_ENV === 'production';
    }
    
    isDevelopment() {
        return process.env.NODE_ENV !== 'production';
    }
}

// Singleton instance
let instance = null;

module.exports = {
    getInstance: () => {
        if (!instance) {
            instance = new ConfigManager();
        }
        return instance;
    },
    ConfigManager
};