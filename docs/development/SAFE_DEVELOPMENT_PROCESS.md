# Safe Development Process for Notionally

## The Three Commandments

1. **Thou Shalt Not Break LinkedIn Integration**
2. **Thou Shalt Not Break Image Embedding**  
3. **Thou Shalt Test Before Committing**

## Development Workflow

### Step 1: Before Starting Any Work
```bash
# 1. Ensure you're on the right branch
git status

# 2. Create a safety backup
git branch backup/$(date +%Y%m%d-%H%M%S)

# 3. Start the server
npm start

# 4. Run the test suite
./local-app/scripts/test-critical.sh

# 5. If all tests pass, you may proceed
```

### Step 2: Making Changes

#### SAFE Changes (Low Risk)
✅ Adding comments or documentation
✅ Adding console.log statements
✅ Creating new utility functions (not used yet)
✅ Modifying coordination/documentation files
✅ Adding new test endpoints

#### RISKY Changes (Requires Testing)
⚠️ Modifying existing endpoints
⚠️ Changing error handling
⚠️ Adding middleware
⚠️ Updating dependencies
⚠️ Modifying configuration

#### DANGEROUS Changes (Requires Extensive Testing)
🚨 Modifying CORS settings
🚨 Changing Dropbox upload logic
🚨 Altering Notion page creation
🚨 Touching image processing
🚨 "Optimizing" or "refactoring" working code

### Step 3: Testing Your Changes

#### Quick Test (After every file save)
```bash
# Just check the server still starts
curl http://localhost:8765/health
```

#### Standard Test (After each feature)
```bash
./local-app/scripts/test-critical.sh
```

#### Full Test (Before committing)
```bash
# 1. Run automated tests
./local-app/scripts/test-critical.sh

# 2. Test with a real LinkedIn post
# - Go to LinkedIn in Firefox
# - Find a post with images
# - Click "Save to Notion"
# - Verify in Notion that images appear

# 3. Check server logs for errors
# Look for any ❌ or "error" messages
```

### Step 4: Committing Changes

```bash
# The pre-commit hook will run automatically
git add .
git commit -m "Clear description of what and why"

# If tests fail, you'll see:
# ❌ Pre-commit tests failed!

# DO NOT use --no-verify unless absolutely certain
```

## Decision Tree for Changes

```
Question: "Should I make this change?"
│
├─ Is it fixing a broken feature?
│  └─ YES → Proceed with caution
│
├─ Is it adding new functionality?
│  └─ Does it touch existing code?
│     ├─ NO → Safe to proceed
│     └─ YES → Run full test suite first
│
├─ Is it "optimizing" working code?
│  └─ NO, STOP! → Working code > "Clean" code
│
└─ Is it adding security?
   └─ Will it affect CORS or LinkedIn?
      ├─ YES → Test extensively with LinkedIn
      └─ NO → Proceed with standard tests
```

## What to Do When Things Break

### Scenario 1: Server Won't Start
```bash
# Check the error message
npm start

# Common fixes:
# - Missing env vars: Check .env file
# - Port in use: Kill process on 8765
# - Syntax error: Check recent changes

# Nuclear option:
git checkout stable-v1.0.0
npm install
npm start
```

### Scenario 2: LinkedIn Can't Connect
```bash
# Test CORS
curl -X POST http://localhost:8765/save-post \
  -H "Origin: https://www.linkedin.com" \
  -v

# Look for "NetworkError" in Firefox console
# Usually means CORS is broken

# Fix:
git checkout stable-v1.0.0 -- src/server.js
npm start
```

### Scenario 3: Images Don't Appear in Notion
```bash
# Check the processing flow:
# 1. Is image downloaded? (Check logs)
# 2. Is image uploaded to Dropbox? (Check logs for "✅ Image uploaded")
# 3. Is share link created? (Check for "✅ Created share link")
# 4. Is streaming URL correct? (Should be dl.dropboxusercontent.com)

# Quick fix:
git checkout stable-v1.0.0 -- src/dropbox-handler.js
git checkout stable-v1.0.0 -- src/notion-client.js
npm start
```

## The No-Touch Zone

These code sections are fragile and working. DO NOT modify without extreme caution:

### 1. Dropbox API Upload (dropbox-handler.js:234-298)
```javascript
// This uploads images and creates share links
// It took many iterations to get right
// DO NOT "optimize" the async/await flow
```

### 2. Image Embedding (notion-client.js:172-224)
```javascript
// This embeds images in Notion
// The URL format is very specific
// DO NOT change the streaming URL conversion
```

### 3. CORS Configuration (server.js:50)
```javascript
app.use(cors()); // This MUST remain permissive
// DO NOT add origin restrictions
```

## Version Management

### Current Stable Versions
- **stable-v1.0.0**: Last known fully working version
- **feature/v1.0.1-careful-upgrades**: Current development branch

### Creating New Versions
```bash
# When current version is stable
git tag -a v1.0.x -m "Description of what works"
git push origin v1.0.x

# Create new stable branch
git checkout -b stable-v1.0.x
git push origin stable-v1.0.x
```

## The Safety Checklist

Before EVERY coding session:
- [ ] Server starts without errors
- [ ] Test suite passes
- [ ] Backup branch created

After EVERY change:
- [ ] Server still starts
- [ ] No new errors in console
- [ ] Test suite still passes

Before EVERY commit:
- [ ] Full test suite passes
- [ ] Manual test with LinkedIn
- [ ] Images work in Notion
- [ ] No duplicate pages created

Before EVERY merge:
- [ ] All above checks pass
- [ ] Document what changed
- [ ] Update CLAUDE.md if needed
- [ ] Tag stable version

## Remember: Past Mistakes

1. **v2.0.0 "Optimization"**: Broke image handling completely
2. **Security Middleware**: Blocked LinkedIn with CORS errors
3. **Retry Logic**: Created duplicate Notion pages
4. **Mock URLs**: Images showed 404 errors

Each of these seemed like a good idea at the time.

## The Golden Rules

1. **If it works, don't fix it**
2. **Test after every change**
3. **LinkedIn must always work**
4. **Images must always embed**
5. **When in doubt, don't**

## Emergency Contacts

- Last stable commit: `a500537`
- Stable branch: `stable-v1.0.0`
- Test command: `./local-app/scripts/test-critical.sh`
- Rollback command: `git checkout stable-v1.0.0`

---

**Remember**: Every optimization that broke the app started with "this will make it better."

**The goal**: Keep it working, not make it perfect.