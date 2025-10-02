# Migration Guide: v2.0.0 → v3.0.0

**Last Updated:** 2025-10-02
**Migration Difficulty:** ⭐⭐ Medium (Config change required)
**Time Required:** 10 minutes
**Rollback Difficulty:** ⭐ Easy

---

## ⚠️ BREAKING CHANGES

**v3.0.0 is a BREAKING release.** You MUST update your configuration before upgrading.

### What Breaks

1. ❌ **App will not start without `dataSourceId`**
2. ❌ **Config from v2.0.0 needs one new field**
3. ❌ **Old API patterns no longer supported**

### What Doesn't Break

1. ✅ **Your Notion database stays the same**
2. ✅ **Your existing pages remain unchanged**
3. ✅ **Your Greasemonkey script works as-is**
4. ✅ **Your Dropbox setup unchanged**

---

## Quick Summary

**What Changed:**
- Notion API upgraded from database-centric to data-source-centric
- `dataSourceId` changed from optional → **REQUIRED**
- Now uses Notion API version 2025-09-03

**What You Need to Do:**
1. Run `npm run fetch-data-source-id`
2. Add the data source ID to your config
3. Restart the app

**That's it!** 🎉

---

## Migration Steps

### Step 1: Check Current Version

```bash
cd /Users/broadcaster_one/Github/Notionally/local-app
cat package.json | grep version
```

**Should show:** `"version": "2.0.0"`

---

### Step 2: Backup Your Config

```bash
# Backup your current config
cp config.json config.json.v2.backup
cp .env .env.v2.backup  # if you use .env
```

---

### Step 3: Fetch Your Data Source ID

```bash
npm run fetch-data-source-id
```

**Expected Output:**
```
🔍 Fetching Data Source ID for Notion Database

✅ API Key found: secret_xxx...
✅ Database ID: abc123...

🔄 Fetching database information from Notion...

✅ Database found: LinkedIn Posts
✅ Data source ID: abc123...

ℹ️  Your data source ID is the same as your database ID
   This is typical for most Notion databases

📝 Next Steps:

Add this to your configuration:

Option 1: In your .env file:
──────────────────────────────────────────────────
NOTION_DATA_SOURCE_ID=abc123...
NOTION_API_VERSION=2025-09-03
──────────────────────────────────────────────────

Option 2: In your config.json file:
──────────────────────────────────────────────────
{
  "notion": {
    "apiKey": "...",
    "databaseId": "...",
    "dataSourceId": "abc123...",
    "apiVersion": "2025-09-03"
  }
}
──────────────────────────────────────────────────
```

**Copy the `dataSourceId` value** - you'll need it in the next step.

---

### Step 4: Update Your Configuration

**Choose ONE option:**

#### Option A: Using .env file (Recommended)

Edit `/Users/broadcaster_one/Github/Notionally/local-app/.env`:

```bash
# Add this line:
NOTION_DATA_SOURCE_ID=abc123...  # Use YOUR actual ID from Step 3

# Optional (defaults to 2025-09-03):
NOTION_API_VERSION=2025-09-03
```

#### Option B: Using config.json

Edit `/Users/broadcaster_one/Github/Notionally/local-app/config.json`:

```json
{
  "notion": {
    "apiKey": "secret_xxx...",
    "databaseId": "abc123...",
    "dataSourceId": "abc123...",  // ← ADD THIS LINE
    "apiVersion": "2025-09-03"     // ← OPTIONAL
  },
  "dropbox": { ... },
  "server": { ... }
}
```

---

### Step 5: Upgrade to v3.0.0

```bash
# Make sure you're in the Notionally directory
cd /Users/broadcaster_one/Github/Notionally

# Pull the latest changes
git pull origin main

# Install dependencies (if needed)
cd local-app && npm install

# Start the app
npm start
```

---

### Step 6: Verify It Works

**You should see:**
```
📋 Configuration loaded:
  Server: localhost:8765
  Dropbox path: ~/Dropbox (Personal)/LinkedIn_Videos
  Notion database: abc1****123
  Notion data source: abc1****123  ← NEW in v3.0.0
  Notion API key: secr****xxxx
  Notion API version: 2025-09-03   ← NEW in v3.0.0
  Dropbox auth: Local file system only

🚀 Server running on http://localhost:8765
```

**If you see this, migration successful!** ✅

---

## Troubleshooting

### Error: "dataSourceId is required in v3.0.0"

**Problem:** You didn't add `dataSourceId` to config

**Solution:**
```bash
# Run the fetch script
npm run fetch-data-source-id

# Add to .env or config.json (see Step 4)
```

---

### Error: "Missing required configuration: notion.dataSourceId"

**Problem:** ConfigManager can't find your `dataSourceId`

**Solution:**
1. Check `.env` file exists and has `NOTION_DATA_SOURCE_ID`
2. OR check `config.json` has `"dataSourceId": "..."`
3. Restart the app

---

### Error: "object_not_found" from Notion API

**Problem:** Your `dataSourceId` is incorrect

**Solution:**
```bash
# Re-fetch the correct ID
npm run fetch-data-source-id

# Double-check you copied it correctly
# Update config and restart
```

---

### Server starts but LinkedIn saves fail

**Problem:** API version mismatch or permissions

**Solution:**
1. Check Notion API version is 2025-09-03 (or unset to use default)
2. Verify your Notion integration has access to the database
3. Check server logs for specific error

---

## Rollback to v2.0.0

If you need to rollback:

```bash
# Stop the server (Ctrl+C)

# Checkout v2.0.0
cd /Users/broadcaster_one/Github/Notionally
git checkout v2.0.0

# Restore old config
cd local-app
cp config.json.v2.backup config.json
cp .env.v2.backup .env  # if using .env

# Reinstall dependencies
npm install

# Start server
npm start
```

**Your v2.0.0 config will work immediately.**

---

## What Actually Changed?

### API Calls: Before vs. After

#### Creating Pages

**v2.0.0:**
```javascript
await notion.pages.create({
  parent: {
    database_id: databaseId
  },
  properties: { ... }
});
```

**v3.0.0:**
```javascript
await notion.pages.create({
  parent: {
    type: 'data_source_id',
    data_source_id: dataSourceId
  },
  properties: { ... }
});
```

#### Querying Pages

**v2.0.0:**
```javascript
await notion.databases.query({
  database_id: databaseId,
  filter: { ... }
});
```

**v3.0.0:**
```javascript
await notion.dataSources.query({
  data_source_id: dataSourceId,
  filter: { ... }
});
```

---

## Why This Change?

### The Problem

Notion's old API treated each database as a single data source. With their new multi-source database feature, one database can contain multiple data sources (like multiple tables in one database).

### The Solution

The new API requires you to specify **which data source** you're working with, even if your database only has one.

### For Most Users

Your `dataSourceId` will be **the same as your `databaseId`** because most databases have only one data source. That's why the migration is easy!

---

## FAQ

### Q: Will my existing Notion pages break?

**A:** No! Your existing pages remain unchanged. Only new pages created with v3.0.0 use the new API.

---

### Q: Do I need to change my Greasemonkey script?

**A:** No! The script doesn't change. Only the backend server uses the new API.

---

### Q: Can I use both v2.0.0 and v3.0.0?

**A:** Not at the same time. Choose one version. v3.0.0 is recommended for future compatibility.

---

### Q: What if Notion doesn't enforce the new API yet?

**A:** That's fine! v3.0.0 uses the new API proactively. It will work now and when Notion eventually requires it.

---

### Q: My dataSourceId is different from databaseId. Is that okay?

**A:** Yes! Some databases have multiple data sources, so the IDs differ. Just use the ID from `npm run fetch-data-source-id`.

---

### Q: Can I skip v3.0.0 and stay on v2.0.0?

**A:** Yes, for now. But eventually Notion will require the new API. Better to upgrade while it's optional.

---

## Testing Your Migration

### Test 1: Server Starts

```bash
npm start
```

**Expected:** Server starts without errors

---

### Test 2: Configuration Loads

**Expected output includes:**
```
📋 Configuration loaded:
  Notion data source: abc1****123
  Notion API version: 2025-09-03
```

---

### Test 3: Save a LinkedIn Post

1. Open LinkedIn in Firefox
2. Find any post
3. Click "Save to Notion"
4. Check server logs

**Expected:** Post saves successfully

---

### Test 4: Check Notion

1. Open your Notion database
2. Find the newly saved page

**Expected:** Page appears with all content

---

## Post-Migration Checklist

- [ ] Data source ID fetched
- [ ] Config updated (.env or config.json)
- [ ] Server starts without errors
- [ ] Configuration shows data source ID
- [ ] Can save LinkedIn posts
- [ ] Posts appear in Notion
- [ ] No errors in server logs
- [ ] Backups of old config saved

**All checked?** Migration complete! 🎉

---

## Getting Help

### Check Logs

```bash
# Start server in dev mode for detailed logs
npm run dev
```

### Verify Config

```bash
# Check config values (masks sensitive data)
npm start
# Look at "Configuration loaded" output
```

### Test Notion Connection

```bash
# Test Notion API connectivity
curl http://localhost:8765/test-notion
```

---

## Migration Timeline

| Step | Time | Difficulty |
|------|------|------------|
| Fetch data source ID | 1 min | ⭐ Easy |
| Update config | 2 min | ⭐ Easy |
| Upgrade code | 2 min | ⭐ Easy |
| Test | 5 min | ⭐ Easy |
| **Total** | **10 min** | **⭐⭐ Medium** |

---

## Success Stories

### Expected Experience

1. Run `npm run fetch-data-source-id` → Get your ID
2. Add to `.env` → One line
3. `npm start` → Server starts
4. Save LinkedIn post → Works perfectly

**Most users complete migration in under 10 minutes.**

---

## Technical Details

### Files Modified in v3.0.0

1. `/local-app/src/notion-client.js`
   - Constructor requires `dataSourceId`
   - `pages.create()` uses `data_source_id`
   - `findPageByUrl()` uses `dataSources.query()`
   - `findExistingPage()` uses `dataSources.query()`
   - Default API version: `2025-09-03`

2. `/local-app/src/config/ConfigManager.js`
   - Validates `dataSourceId` presence
   - Logs data source ID and API version

3. `/local-app/config.example.json`
   - Updated comments for v3.0.0

4. `/local-app/package.json`
   - Version: 3.0.0

### Backward Compatibility

**What's NOT backward compatible:**
- Configs without `dataSourceId` won't work
- Old API patterns (`databases.query`) no longer used

**What IS backward compatible:**
- Existing Notion pages unchanged
- Greasemonkey script unchanged
- Dropbox setup unchanged
- Database schema unchanged

---

## Summary

**v3.0.0 Migration: Simple 4-Step Process**

1. ✅ Fetch data source ID
2. ✅ Add to config
3. ✅ Upgrade code
4. ✅ Test

**Time:** 10 minutes
**Difficulty:** Medium (one config change)
**Rollback:** Easy (restore v2.0.0)

**You've got this!** 💪

---

**Migration Guide Version:** 1.0
**Last Updated:** 2025-10-02
**For:** Notionally v2.0.0 → v3.0.0

🎯 **Ready to migrate? Start with Step 1!**
