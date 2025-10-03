# Dropbox API Setup Guide

This guide will help you set up Dropbox API access to enable automatic image embedding in Notion.

## Why Dropbox API?

Without the Dropbox API, images are saved locally but can't be embedded in Notion (Notion can't access localhost URLs). With the API, images get real shareable URLs that work in Notion.

## Step 1: Create a Dropbox App

1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Click "Create app"
3. Choose:
   - **API**: Choose "Scoped access"
   - **Access type**: Choose "Full Dropbox"
   - **Name**: Enter a unique name like "notionally-YourName"
4. Click "Create app"

## Step 2: Configure Permissions

1. In your app settings, go to the "Permissions" tab
2. Check these scopes (IMPORTANT - all are required):
   - `files.content.write` - To upload files (REQUIRED for API upload!)
   - `files.content.read` - To read files  
   - `files.metadata.read` - To check if files exist
   - `files.metadata.write` - To create folders
   - `sharing.write` - To create share links (REQUIRED!)
   - `sharing.read` - To read share links
3. Click "Submit" to save permissions

⚠️ **Important**: After changing permissions, you need to:
1. Generate a NEW access token (the old one won't have the new permissions)
2. Update the token in your config.json

## Step 3: Generate Access Token

1. Go to the "Settings" tab
2. Under "OAuth 2", find "Generated access token"
3. Click "Generate"
4. Copy the token (it starts with `sl.`)

⚠️ **Important**: This token gives full access to your Dropbox. Keep it secure!

## Step 4: Add Token to Config

1. Open `local-app/config.json`
2. Replace `YOUR_DROPBOX_ACCESS_TOKEN` with your actual token:

```json
"dropbox": {
  "localPath": "~/Dropbox (Personal)/LinkedIn_Videos",
  "accessToken": "sl.YOUR-ACTUAL-TOKEN-HERE"
}
```

## Step 5: Restart the Server

```bash
./server.sh restart
# or
npm run dev
```

## How It Works

When configured:
1. Images are saved to your local Dropbox folder
2. The API creates shareable links immediately
3. Images are embedded directly in Notion using these links
4. No waiting for Dropbox sync!

## Troubleshooting

### "Path not found" error
- Make sure the file has synced to Dropbox
- Check that the path in config matches your actual Dropbox folder

### "Invalid access token"
- Regenerate the token in Dropbox App Console
- Make sure you copied the entire token

### Images still not embedding
- Check the server logs for API errors
- Verify permissions are set correctly in your Dropbox app

## Security Notes

- The access token is stored locally in your config.json
- Never commit config.json to git (it's in .gitignore)
- The token has full Dropbox access, so keep it secure
- You can revoke the token anytime from Dropbox App Console

## Without API Setup

If you don't set up the API, the app still works but:
- Images are saved to your Dropbox folder
- Notion shows where images are saved
- You need to manually add images to Notion after Dropbox syncs