# Key Rotation & Credential Management

**Last Updated:** October 3, 2025
**Applies to:** notionally v3.0.0+

---

## Overview

This guide covers how to safely rotate your API keys and tokens if they're compromised or as part of regular security maintenance.

**When to Rotate Keys:**
- 🚨 **Immediately** if you suspect compromise (leaked to git, malware, etc.)
- 🔄 **Periodically** as good practice (recommended: every 90 days)
- 📝 **Before sharing** your machine or transferring ownership
- 🔧 **After major version upgrades** that change authentication

---

## Quick Reference

| Credential | Rotation Frequency | Complexity | Downtime |
|------------|-------------------|------------|----------|
| Notion API Key | On demand / 90 days | Easy | < 1 minute |
| Notion Data Source ID | Only if database changes | Easy | None |
| Dropbox Refresh Token | On demand / 180 days | Medium | < 5 minutes |
| Dropbox App Key/Secret | Rarely (only if app compromised) | Hard | Requires all users to reauth |

---

## 1. Notion API Key Rotation

### Why Rotate?
- API key grants full read/write access to your Notion workspace
- If leaked, attacker can read all your data and modify pages

### Rotation Steps

#### Step 1: Create New Integration
1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Name it (e.g., "notionally v2" to distinguish from old one)
4. Select your workspace
5. Set capabilities:
   - ✅ Read content
   - ✅ Update content
   - ✅ Insert content
6. Click **"Submit"**
7. Copy the new API key (starts with `secret_`)

#### Step 2: Update Your Configuration
```bash
# Edit your .env file
nano /Users/broadcaster_one/Github/notionally/local-app/.env
```

Replace the old key:
```bash
# OLD
NOTION_API_KEY=secret_old_key_here

# NEW
NOTION_API_KEY=secret_new_key_here_from_step_1
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X` in nano).

#### Step 3: Grant Database Access
The new integration needs permission to access your database:

1. Open your Notion database in browser
2. Click **"..."** (three dots) in top-right
3. Click **"Add connections"**
4. Select your new integration name
5. Click **"Confirm"**

#### Step 4: Test the New Key
```bash
cd /Users/broadcaster_one/Github/notionally/local-app
npm start
```

Check the startup logs:
```
✅ NOTION_API_KEY is set (secr***)
📋 Configuration loaded:
  Notion database: 1b4a****42ed52
```

Try saving a test post from LinkedIn to verify it works.

#### Step 5: Revoke Old Key
Once confirmed working:

1. Go back to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click on your **old integration**
3. Click **"Delete integration"** (bottom of page)
4. Confirm deletion

**⚠️ Warning:** Deleting the old integration immediately invalidates the old key across all systems using it.

### Rollback Plan
If something breaks:
1. Revert `.env` to use old key
2. Restart server: `npm start`
3. Debug why new key isn't working (usually missing database connection)

---

## 2. Notion Data Source ID

### Why Change?
- You migrated to a new Notion database
- You're switching workspaces

### Update Steps

#### Step 1: Fetch New Data Source ID
```bash
cd /Users/broadcaster_one/Github/notionally/local-app
npm run fetch-data-source-id
```

The script will output:
```
✅ Data Source ID: 1b4a63fa-2eeb-816f-afc9-000b9c7e2975
```

#### Step 2: Update Configuration
```bash
# Edit .env
nano .env
```

Update:
```bash
NOTION_DATA_SOURCE_ID=1b4a63fa-2eeb-816f-afc9-000b9c7e2975
```

#### Step 3: Restart Server
```bash
npm start
```

Verify in logs:
```
✅ Notion data source: 1b4a****e2975
```

---

## 3. Dropbox Refresh Token Rotation

### Why Rotate?
- Refresh token grants long-term access to your Dropbox
- If leaked with App Secret, attacker can access your files indefinitely

### Rotation Steps

#### Step 1: Run Dropbox Setup Script
```bash
cd /Users/broadcaster_one/Github/notionally/local-app
npm run setup:dropbox
```

The script will:
1. Open your browser to Dropbox OAuth page
2. Ask you to authorize the app
3. Generate a new refresh token

#### Step 2: Copy the New Token
The script outputs:
```
✅ Refresh Token: sl.Bxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Add this to your .env file:
DROPBOX_REFRESH_TOKEN=sl.Bxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Step 3: Update .env
```bash
nano .env
```

Replace:
```bash
# OLD
DROPBOX_REFRESH_TOKEN=sl.old_token_here

# NEW
DROPBOX_REFRESH_TOKEN=sl.Bxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### Step 4: Restart and Test
```bash
npm start
```

Check logs:
```
✅ Dropbox API initialized with refresh token
🔄 Refreshing Dropbox access token...
✅ Dropbox access token refreshed successfully
```

Save a LinkedIn post with an image to verify Dropbox uploads work.

#### Step 5: (Optional) Revoke Old Token
Currently, Dropbox doesn't provide an easy way to list/revoke specific refresh tokens. Options:

**Option A: Revoke All Access**
1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Click your app (notionally)
3. **Settings** tab → Scroll to bottom
4. Click **"Enable additional users"** → **"Disable"** (revokes all tokens)
5. Re-enable and re-run `npm run setup:dropbox`

**Option B: Leave Old Token**
- Old refresh tokens remain valid until explicitly revoked
- If you're rotating due to suspected compromise, use Option A

---

## 4. Dropbox App Key & Secret Rotation

### Why Rotate?
- **Very Rare:** Only if app credentials are compromised
- App secret + refresh token = full access to users' Dropbox

### When This Applies
- You accidentally committed `DROPBOX_APP_SECRET` to git
- You suspect malware stole your credentials
- Dropbox notifies you of suspicious activity

### Rotation Steps

⚠️ **Warning:** This invalidates ALL users' refresh tokens if you distribute your app.

#### Step 1: Generate New App Keys
1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Click your app
3. **Settings** tab
4. Click **"Show"** next to App secret
5. Click **"Generate"** (for new secret)
6. Copy new **App key** and **App secret**

#### Step 2: Update Configuration
```bash
nano .env
```

Update both values:
```bash
DROPBOX_APP_KEY=your_new_app_key
DROPBOX_APP_SECRET=your_new_app_secret
```

#### Step 3: Get New Refresh Token
Old refresh tokens won't work with new app credentials.

```bash
npm run setup:dropbox
```

This generates a new refresh token tied to the new app keys.

#### Step 4: Update .env Again
```bash
DROPBOX_REFRESH_TOKEN=new_token_from_setup
```

#### Step 5: Test
```bash
npm start
```

Verify Dropbox uploads work.

---

## 5. Complete Credential Reset

### Nuclear Option: Start Fresh

If you want to rotate everything at once:

#### Script
```bash
#!/bin/bash
# save-credentials-backup.sh

# Backup current .env
cp .env .env.backup.$(date +%Y%m%d-%H%M%S)

echo "🔐 Starting complete credential rotation..."
echo ""
echo "1️⃣ Notion API Key:"
echo "   - Create new integration: https://www.notion.so/my-integrations"
echo "   - Copy the new key"
read -p "   Paste new NOTION_API_KEY: " NOTION_KEY

echo ""
echo "2️⃣ Notion Data Source ID:"
npm run fetch-data-source-id
read -p "   Paste new NOTION_DATA_SOURCE_ID: " NOTION_DS

echo ""
echo "3️⃣ Dropbox Refresh Token:"
npm run setup:dropbox
read -p "   Paste new DROPBOX_REFRESH_TOKEN: " DROPBOX_TOKEN

# Write new .env
cat > .env << EOF
# Notion Configuration (Rotated: $(date +%Y-%m-%d))
NOTION_API_KEY=${NOTION_KEY}
NOTION_DATABASE_ID=${NOTION_DATABASE_ID}
NOTION_DATA_SOURCE_ID=${NOTION_DS}
NOTION_API_VERSION=2025-09-03

# Dropbox Configuration (Rotated: $(date +%Y-%m-%d))
DROPBOX_APP_KEY=${DROPBOX_APP_KEY}
DROPBOX_APP_SECRET=${DROPBOX_APP_SECRET}
DROPBOX_REFRESH_TOKEN=${DROPBOX_TOKEN}
EOF

echo ""
echo "✅ Credentials rotated successfully!"
echo "🔐 Secure your .env: chmod 600 .env"
echo "🧪 Test: npm start"
```

---

## 6. Emergency Response: Credential Leak

### If You Accidentally Committed .env to Git

#### Immediate Actions (Do ALL of these)

**1. Stop the Leak**
```bash
# Remove file from staging
git rm --cached .env

# Add to .gitignore if not already there
echo ".env" >> .gitignore

# Commit the removal
git add .gitignore
git commit -m "Remove .env from tracking"
```

**⚠️ CRITICAL:** The old .env is still in git history!

**2. Rotate ALL Credentials**
Follow sections 1-4 above immediately. Do not wait.

**3. Purge Git History**

**Option A: BFG Repo-Cleaner (Recommended)**
```bash
# Install BFG
brew install bfg

# Backup your repo
cp -r ~/Github/notionally ~/Github/notionally-backup

# Remove .env from entire history
cd ~/Github/notionally
bfg --delete-files .env

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (if already pushed to remote)
git push origin --force --all
```

**Option B: Git Filter-Branch**
```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch local-app/.env" \
  --prune-empty --tag-name-filter cat -- --all

git push origin --force --all
```

**4. Notify Stakeholders**
If this is a shared repository:
- Email all collaborators
- Post in team chat
- Document the incident

**5. Monitor for Abuse**
- Check Notion audit log: Settings → Workspace → Audit log
- Check Dropbox security: Settings → Security → Sessions
- Look for unexpected API usage or data access

### If Credentials Were Stolen by Malware

**1. Isolate the System**
- Disconnect from internet
- Do not access sensitive accounts from this machine

**2. Scan for Malware**
```bash
# macOS
sudo /usr/bin/freshclam  # Update virus definitions
sudo /usr/local/bin/clamscan -r /Users/broadcaster_one

# Or use commercial solution
```

**3. Rotate from a Different Device**
- Use another computer or phone to rotate all keys
- Follow sections 1-4 from trusted device

**4. Forensics**
Check what the malware could have accessed:
```bash
# Check .env access times
stat -x ~/Github/notionally/local-app/.env

# Check recent file access
sudo fs_usage -f filesys | grep -i .env
```

**5. Full System Reimage** (if malware severity is high)

---

## 7. Preventive Measures

### Automate Rotation Reminders

Add to your calendar:
- **Every 90 days:** Rotate Notion API key
- **Every 180 days:** Rotate Dropbox refresh token
- **Annually:** Review all access permissions

### Pre-Commit Hooks

Install git hooks to prevent accidental commits:

```bash
# .git/hooks/pre-commit
#!/bin/bash

if git diff --cached --name-only | grep -q "\.env$"; then
    echo "❌ ERROR: Attempting to commit .env file!"
    echo "🔐 This file contains secrets and should not be committed."
    exit 1
fi
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

### Monitor Your Accounts

**Notion:**
- Enable 2FA: Settings → My account → 2-step verification
- Review workspace members regularly
- Check audit logs for unexpected activity

**Dropbox:**
- Enable 2FA: Settings → Security → Two-step verification
- Review linked apps: Settings → Connected apps
- Monitor for unusual file access patterns

---

## 8. Testing Your Rotation

After rotating any credential, verify:

### Notion Connection Test
```bash
npm start
```

Check logs for:
```
✅ NOTION_API_KEY is set (secr***)
✅ Notion: Connected
```

### Dropbox Connection Test
Check logs for:
```
✅ Dropbox API initialized with refresh token
✅ Dropbox access token refreshed successfully
```

### End-to-End Test
1. Open LinkedIn
2. Find a post with text and an image
3. Click notionally extension
4. Verify:
   - ✅ Post appears in Notion database
   - ✅ Image uploaded to Dropbox
   - ✅ Image displays in Notion page

---

## 9. Security Best Practices

### .env File Security
```bash
# Set restrictive permissions
chmod 600 ~/Github/notionally/local-app/.env

# Verify permissions
ls -l ~/Github/notionally/local-app/.env
# Should show: -rw-------
```

### Backup .env Securely
```bash
# Encrypt backup with gpg
gpg -c ~/Github/notionally/local-app/.env

# Store encrypted backup
mv ~/Github/notionally/local-app/.env.gpg ~/Documents/secure-backups/

# Delete unencrypted backup
shred -u ~/Github/notionally/local-app/.env.backup
```

To restore:
```bash
gpg -d ~/Documents/secure-backups/.env.gpg > .env
chmod 600 .env
```

### Regular Audits
Monthly checklist:
- [ ] Check file permissions on `.env`
- [ ] Review Notion integration permissions
- [ ] Review Dropbox connected apps
- [ ] Check for suspicious activity in audit logs
- [ ] Verify backup encryption is working
- [ ] Test credential rotation procedure (dry run)

---

## 10. Troubleshooting

### "Notion API key invalid"
- Key might be revoked or expired
- Integration might be deleted
- Workspace might have changed permissions

**Fix:** Create new integration (Section 1)

### "Could not find database"
- Integration lacks database access
- Database was moved/deleted
- Data source ID is wrong

**Fix:**
1. Grant integration access to database
2. Re-fetch data source ID (`npm run fetch-data-source-id`)

### "Dropbox unauthorized"
- Refresh token revoked
- App credentials changed
- Token expired (shouldn't happen with refresh tokens)

**Fix:** Run `npm run setup:dropbox` to get new token

### "Failed to refresh Dropbox token"
- App secret is wrong
- Network connectivity issue
- Dropbox API is down

**Fix:**
1. Verify `DROPBOX_APP_SECRET` in `.env`
2. Check Dropbox status: https://status.dropbox.com
3. Re-run setup if needed

---

## 11. References

### Official Documentation
- [Notion API Authentication](https://developers.notion.com/docs/authorization)
- [Dropbox OAuth Guide](https://www.dropbox.com/developers/reference/oauth-guide)
- [Notion Integration Management](https://www.notion.so/my-integrations)
- [Dropbox App Console](https://www.dropbox.com/developers/apps)

### notionally Documentation
- [Security Audit Report](./SECURITY_AUDIT_2025.md)
- [Configuration Guide](../architecture/CONFIGURATION.md)
- [Setup Instructions](../../local-app/README.md)

### Security Standards
- [NIST SP 800-57: Key Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

## Support

**Questions?** Open an issue: https://github.com/anthropics/notionally/issues

**Security Concerns?** Email: security@notionally.local

---

**Document Version:** 1.0
**Last Updated:** October 3, 2025
**Next Review:** January 3, 2026
