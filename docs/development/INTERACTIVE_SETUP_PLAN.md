---
title: Interactive Setup Plan
version: 1.0.0
last_updated: 2025-01-10
category: development
status: draft
---

# Interactive Setup Plan for v1.1.0

## Overview
Create a seamless first-time setup experience that automatically launches when a new user runs `npm run dev` without configuration.

## User Journey

### Current Experience (v1.0.5)
1. Clone repo
2. Run `npm install`
3. Manually create `config.json`
4. Copy/paste API keys
5. Run Dropbox setup separately
6. Manually install Greasemonkey script
7. Start server
8. Hope it works

### New Experience (v1.1.0)
1. Clone repo
2. Run `npm install`
3. Run `npm run dev`
4. **Automatic setup wizard launches**
5. Server starts with everything configured

## Detection Logic

### How to Detect First Run
Check for these conditions on startup:
```javascript
const isFirstRun = () => {
  return !fs.existsSync('config.json') || 
         !config.notion?.apiKey || 
         !config.notion?.databaseId;
}
```

### Setup Status Tracking
Create `.notionally-setup` file to track setup progress:
```json
{
  "version": "1.1.0",
  "setupCompleted": false,
  "steps": {
    "notion": false,
    "dropbox": false,
    "greasemonkey": false,
    "validation": false
  },
  "timestamp": "2025-01-10T..."
}
```

## Implementation Approaches

### Option 1: Embedded Web UI (Recommended)
**How it works:**
- Server starts on port 8765 as usual
- If not configured, serves setup UI instead of normal endpoints
- Browser automatically opens to `http://localhost:8765/setup`
- Web-based wizard guides through steps
- After completion, server restarts in normal mode

**Pros:**
- Rich UI with proper forms
- Can show images/videos for guidance
- Copy/paste friendly
- Can validate in real-time
- Better error display

**Cons:**
- More complex to implement
- Requires frontend code

**Tech Stack:**
- Simple HTML/CSS/JS (no framework needed)
- Embedded in server as static files
- Progressive enhancement

### Option 2: CLI Interactive Prompts
**How it works:**
- Uses `inquirer` or `prompts` npm package
- Terminal-based wizard
- Asks questions sequentially
- Saves config.json at the end

**Pros:**
- Simpler to implement
- Stays in terminal
- No browser needed
- Lighter weight

**Cons:**
- Less user-friendly
- Hard to show Greasemonkey instructions
- Copy/paste can be tricky in terminal
- Limited formatting

### Option 3: Hybrid Approach
**How it works:**
- CLI for basic config (Notion, Dropbox)
- Opens browser for Greasemonkey installation
- Returns to CLI for validation

**Pros:**
- Best of both worlds
- Simpler than full web UI
- Better than pure CLI for complex steps

**Cons:**
- Context switching
- Still requires some web code

## Detailed Setup Flow (Option 1 - Web UI)

### Step 1: Welcome Screen
```
Welcome to Notionally! 🎉

Let's get you set up to save LinkedIn posts to Notion.

You'll need:
✓ A Notion account with API access
✓ A Dropbox account (free works)
✓ Firefox with Greasemonkey extension

[Start Setup] [I'll do this later]
```

### Step 2: Notion Configuration
```
Step 1 of 4: Connect to Notion

1. Create a Notion integration:
   [Open Notion Integrations] (opens https://www.notion.so/my-integrations)
   
2. Click "New Integration"
   - Name: "Notionally"
   - Copy the API key
   
3. Paste your API key:
   [_________________________] [Validate]
   
4. Share your database with the integration:
   - Open your Notion database
   - Click ••• → Connections → Add Connection → Notionally
   
5. Get your database ID:
   - Open database as full page
   - Copy ID from URL: notion.so/{workspace}/{DATABASE_ID}?v={view}
   
   Database ID: [_________________________] [Validate]

[← Back] [Next →]
```

### Step 3: Dropbox Configuration
```
Step 2 of 4: Set Up Dropbox

Choose your setup method:

○ Simple (Recommended)
  Just use your local Dropbox folder
  
● API Access (Advanced)
  Generate shareable links automatically
  
For Simple Setup:
✓ Make sure Dropbox desktop app is installed and running
✓ We'll save videos to: ~/Dropbox (Personal)/LinkedIn_Videos

[← Back] [Configure Dropbox API] [Continue with Simple →]
```

### Step 4: Greasemonkey Script
```
Step 3 of 4: Install Browser Extension

1. Install Greasemonkey (if not already):
   [Open Firefox Add-ons] (opens Greasemonkey page)
   
2. Install our script:
   [Click to Install Script] 
   
   This will:
   - Open the script in a new tab
   - Greasemonkey will prompt to install
   - Click "Install" in the popup

3. Verify installation:
   ✓ Open LinkedIn.com
   ✓ Look for "Save to Notion" buttons on posts
   
[← Back] [I've installed it →]
```

### Step 5: Validation
```
Step 4 of 4: Test Everything

Let's make sure everything works:

Notion Connection:    ✅ Connected
Database Access:       ✅ Verified
Dropbox Folder:        ✅ Found
Server Status:         ✅ Running
Greasemonkey Script:   ⏳ Please test manually

Test the full flow:
1. Go to LinkedIn
2. Find a post with an image
3. Click "Save to Notion"
4. Check your Notion database

[← Back] [Run Test Post] [Finish Setup]
```

### Step 6: Success
```
🎉 Setup Complete!

Your configuration has been saved to config.json

Server is running at: http://localhost:8765

Next steps:
- Open LinkedIn in Firefox
- Try saving a post
- Check your Notion database

[Open LinkedIn] [View Documentation] [Close]
```

## Configuration Management

### config.json Generation
```javascript
const generateConfig = (answers) => {
  return {
    notion: {
      apiKey: answers.notionApiKey,
      databaseId: answers.notionDatabaseId
    },
    dropbox: {
      localPath: answers.dropboxPath || "~/Dropbox (Personal)/LinkedIn_Videos",
      accessToken: answers.dropboxToken,
      refreshToken: answers.dropboxRefresh,
      appKey: answers.dropboxAppKey,
      appSecret: answers.dropboxAppSecret
    },
    server: {
      port: 8765,
      host: "localhost"
    },
    setup: {
      completed: true,
      version: "1.1.0",
      timestamp: new Date().toISOString()
    }
  };
};
```

### Migration from Existing Config
- Detect existing config.json
- Offer to migrate/update
- Preserve existing settings
- Add new required fields

## Error Handling

### Common Issues to Handle
1. **Invalid Notion API key**
   - Clear error message
   - Link to troubleshooting
   - Retry option

2. **Database not shared**
   - Explain the sharing step
   - Show screenshot/video
   - Verify permissions

3. **Dropbox not running**
   - Detect if app is installed
   - Provide download link
   - Offer manual path entry

4. **Port already in use**
   - Detect conflict
   - Offer alternative port
   - Update Greasemonkey script

## Technical Implementation

### File Structure
```
local-app/
├── setup/
│   ├── index.html          # Main setup UI
│   ├── setup.css          # Styling
│   ├── setup.js           # Client-side logic
│   └── setup-server.js    # Server-side handler
├── src/
│   └── server.js          # Modified to detect first run
└── package.json           # Updated scripts
```

### NPM Scripts Update
```json
{
  "scripts": {
    "dev": "node src/check-setup.js && nodemon src/server.js",
    "setup": "node setup/cli-setup.js",
    "start": "node src/server.js",
    "skip-setup": "SKIP_SETUP=true npm run dev"
  }
}
```

### Setup Detection in server.js
```javascript
// At startup
if (!config.setup?.completed && !process.env.SKIP_SETUP) {
  console.log('🚀 First time setup detected!');
  console.log('Opening setup wizard in your browser...');
  
  // Serve setup UI instead of normal routes
  app.use('/', express.static('setup'));
  
  // Open browser
  const open = require('open');
  await open('http://localhost:8765');
  
  // After setup completes, restart server
  app.post('/setup/complete', (req, res) => {
    saveConfig(req.body);
    res.json({ success: true });
    console.log('✅ Setup complete! Restarting server...');
    process.exit(0); // Nodemon will restart
  });
} else {
  // Normal server operation
  loadNormalRoutes();
}
```

## Alternative: Pure CLI Implementation

If we go with Option 2, here's the simpler approach:

```javascript
const inquirer = require('inquirer');
const fs = require('fs-extra');

async function runSetup() {
  console.log('\n🎉 Welcome to Notionally Setup!\n');
  
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'notionApiKey',
      message: 'Enter your Notion API key:',
      validate: (input) => input.length > 0
    },
    {
      type: 'input',
      name: 'notionDatabaseId',
      message: 'Enter your Notion database ID:',
      validate: (input) => input.length > 0
    },
    {
      type: 'confirm',
      name: 'useDropboxApi',
      message: 'Set up Dropbox API access?',
      default: false
    },
    // ... more questions
  ]);
  
  const config = generateConfig(answers);
  await fs.writeJson('config.json', config, { spaces: 2 });
  
  console.log('✅ Configuration saved!');
  console.log('\n📄 Now install the Greasemonkey script:');
  console.log('1. Open Firefox');
  console.log('2. Install Greasemonkey extension');
  console.log('3. Open: file://' + path.resolve('greasemonkey-script/linkedin-notion-saver.user.js'));
  console.log('\n Run `npm run dev` to start the server!');
}
```

## Recommendation

**Go with Option 1 (Web UI) because:**
1. Much better UX for new users
2. Can provide visual guidance
3. Easier to validate and show errors
4. Can open links directly
5. More professional appearance
6. Can be enhanced over time

**Implementation Priority:**
1. Basic setup flow (Notion + Dropbox path)
2. Validation and testing
3. Greasemonkey installation helper
4. Enhanced error handling
5. Setup status tracking

## Success Metrics

- New user can go from clone to working in < 5 minutes
- Zero manual file editing required
- Clear error messages for all failure cases
- Ability to re-run setup if needed
- Graceful handling of existing configs

## Next Steps

1. Choose implementation approach
2. Create setup detection logic
3. Build UI or CLI interface
4. Implement validation
5. Add Greasemonkey installer
6. Test with fresh clone
7. Update documentation