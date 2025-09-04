# Dropbox Token Regeneration Required

Since you've created a new Dropbox app with new credentials, you need to generate a new refresh token that matches your new app.

## Steps to Generate New Refresh Token:

1. **Run the setup script:**
   ```bash
   npm run setup:dropbox
   ```

2. **When prompted:**
   - "Are you using your own Dropbox app?" → Enter: `y`
   - "Enter your App Key" → Enter: `h6xgs87llnqk1oi` (from your new .env)
   - "Enter your App Secret" → Enter: `81aonfjr6su8obf` (from your new .env)

3. **Follow the authorization URL:**
   - The script will give you a URL to visit
   - Log into Dropbox if needed
   - Authorize the app
   - Copy the authorization code

4. **Paste the authorization code:**
   - Enter it when the script asks for it
   - The script will generate a new refresh token

5. **Update your .env file:**
   - Replace the old `DROPBOX_REFRESH_TOKEN` with the new one

## Alternative: Manual Token Generation

If the script doesn't work, you can manually generate the token:

1. Visit: https://www.dropbox.com/developers/apps
2. Select your new app
3. Go to the "Permissions" tab and ensure these scopes are enabled:
   - `files.content.write`
   - `files.content.read`
   - `sharing.write`
   
4. Go to "Settings" tab
5. Under "OAuth 2", click "Generate access token"
6. Use the Dropbox API Explorer to convert it to a refresh token

## Why This Is Needed:

- Dropbox refresh tokens are tied to specific app key/secret pairs
- Your old refresh token (`Xmxr6UQv7W4...`) was for the old app
- The new app (`h6xgs87llnqk1oi`) needs its own refresh token
- This is a security feature to prevent token reuse across apps

Once you have the new refresh token, the Dropbox integration will work again.