# Dropbox OAuth Setup Guide

This guide explains how to set up Dropbox authentication for Notionally with long-lived refresh tokens.

## Why Refresh Tokens?

Dropbox access tokens expire after a few hours. Using refresh tokens allows the app to automatically get new access tokens without manual intervention.

## Setup Steps

### Option 1: Use Notionally's Default App (Easiest)

1. Visit the Dropbox OAuth flow URL:
   ```
   https://www.dropbox.com/oauth2/authorize?client_id=lxx59je81bsuya4&response_type=code&token_access_type=offline
   ```

2. Authorize the app and copy the authorization code

3. Exchange the code for a refresh token using curl:
   ```bash
   curl https://api.dropbox.com/oauth2/token \
     -d code=YOUR_AUTH_CODE \
     -d grant_type=authorization_code \
     -d client_id=lxx59je81bsuya4 \
     -d client_secret=APP_SECRET
   ```

4. Add the refresh token to your `config.json`:
   ```json
   "dropbox": {
     "localPath": "~/Dropbox (Personal)/LinkedIn_Videos",
     "refreshToken": "YOUR_REFRESH_TOKEN_HERE",
     "appSecret": "APP_SECRET"
   }
   ```

### Option 2: Create Your Own Dropbox App

1. Go to https://www.dropbox.com/developers/apps
2. Click "Create app"
3. Choose:
   - API: "Scoped access"
   - Access type: "Full Dropbox"
   - Name: Your app name

4. In the app settings:
   - Go to "Permissions" tab
   - Enable these scopes:
     - `files.content.write`
     - `files.content.read`
     - `sharing.write`
     - `sharing.read`
   - Click "Submit"

5. Get your app credentials from the "Settings" tab:
   - App key
   - App secret

6. Generate a refresh token:
   ```bash
   # Step 1: Get authorization code
   # Visit this URL in your browser (replace YOUR_APP_KEY):
   https://www.dropbox.com/oauth2/authorize?client_id=YOUR_APP_KEY&response_type=code&token_access_type=offline
   
   # Step 2: Exchange code for refresh token
   curl https://api.dropbox.com/oauth2/token \
     -d code=YOUR_AUTH_CODE \
     -d grant_type=authorization_code \
     -d client_id=YOUR_APP_KEY \
     -d client_secret=YOUR_APP_SECRET
   ```

7. Update your `config.json`:
   ```json
   "dropbox": {
     "localPath": "~/Dropbox (Personal)/LinkedIn_Videos",
     "refreshToken": "YOUR_REFRESH_TOKEN",
     "appKey": "YOUR_APP_KEY",
     "appSecret": "YOUR_APP_SECRET"
   }
   ```

## Testing Your Setup

After configuring, restart the server:
```bash
npm run dev
```

You should see:
```
✅ Dropbox API initialized with refresh token
```

If you see this instead, your configuration needs updating:
```
⚠️  Dropbox API initialized with access token (will expire)
```

## Troubleshooting

### "expired_access_token" Error
Your access token has expired. Follow the steps above to set up a refresh token.

### "invalid_access_token" Error
The token format is incorrect. Make sure you're using the refresh token, not the access token.

### Files Not Uploading
1. Check that your Dropbox app has the correct permissions
2. Ensure the local Dropbox folder path exists
3. Check the server logs for detailed error messages

## Security Notes

- Never commit your tokens to git
- Keep your `config.json` file private
- Use environment variables for production deployments