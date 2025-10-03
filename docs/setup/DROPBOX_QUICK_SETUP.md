# Quick Dropbox Setup Guide

## Option 1: Create Your Own Dropbox App (5 minutes)

### Step 1: Create the App
1. Go to https://www.dropbox.com/developers/apps
2. Click "Create app"
3. Choose:
   - **API**: Scoped access
   - **Access**: Full Dropbox
   - **Name**: notionally-YourName (must be unique)
4. Click "Create app"

### Step 2: Configure Permissions
1. Go to the **Permissions** tab
2. Check these boxes:
   - `files.content.write`
   - `files.content.read`
   - `sharing.write`
   - `sharing.read`
3. Click "Submit"

### Step 3: Get Your Credentials
1. Go to the **Settings** tab
2. Copy your:
   - **App key** (starts with letters/numbers)
   - **App secret** (click "Show" and copy it)

### Step 4: Generate Refresh Token
Run this command and follow the prompts:
```bash
npm run setup:dropbox
```

When asked:
- Answer "y" for using your own app
- Enter your App key
- Enter your App secret
- Open the URL in your browser
- Click "Continue" and "Allow"
- Copy the authorization code
- Paste it back in the terminal

### Step 5: Store Your Credentials Securely

**IMPORTANT**: Don't put secrets in config.json! Use the `.env` file instead:

1. Open `.env` (created automatically, or copy from `.env.example`)
2. Add your credentials:
```bash
DROPBOX_APP_KEY=your_app_key_here
DROPBOX_APP_SECRET=your_app_secret_here
DROPBOX_REFRESH_TOKEN=your_refresh_token_here
```

3. Keep `config.json` minimal:
```json
"dropbox": {
  "localPath": "~/Dropbox (Personal)/LinkedIn_Videos"
}
```

The `.env` file is in `.gitignore` and won't be accidentally committed to Git.

## Option 2: Manual Token Generation

If the script doesn't work, you can do it manually:

### Step 1: Get Authorization Code
Visit this URL (replace YOUR_APP_KEY):
```
https://www.dropbox.com/oauth2/authorize?client_id=YOUR_APP_KEY&response_type=code&token_access_type=offline
```

### Step 2: Exchange for Refresh Token
```bash
curl https://api.dropbox.com/oauth2/token \
  -d code=YOUR_AUTH_CODE \
  -d grant_type=authorization_code \
  -d client_id=YOUR_APP_KEY \
  -d client_secret=YOUR_APP_SECRET
```

### Step 3: Update config.json
Use the refresh_token from the response.

## Testing Your Setup

After updating config.json:

1. Restart the server:
   ```bash
   npm run dev
   ```

2. Look for this message:
   ```
   ✅ Dropbox API initialized with refresh token
   🔄 Refreshing Dropbox access token...
   ✅ Dropbox access token refreshed successfully
   ```

3. Check the status:
   ```bash
   curl http://localhost:8765/status | jq .dropbox
   ```

   Should show:
   ```json
   {
     "hasApiAccess": true,
     "hasRefreshToken": true,
     "lastTokenRefresh": "2025-08-31T...",
     "nextRefreshIn": "3 hours"
   }
   ```

## Troubleshooting

### "invalid_client" Error
- Double-check your app key and secret
- Make sure you're using the correct values from your app

### "invalid_grant" Error
- The authorization code expired (they're only valid for a few minutes)
- Start over and use the code immediately

### "expired_access_token" Still Appearing
- Make sure you replaced the entire dropbox section in config.json
- Remove the old "accessToken" field if it's still there
- Restart the server

## Benefits of Refresh Tokens

- **Never expires** (unless revoked)
- **Automatic renewal** - the app refreshes tokens every 3 hours
- **No manual intervention** - set it once and forget it
- **Survives server restarts** - tokens are refreshed on startup