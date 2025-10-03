# Script Version Tracking

## Overview

Starting from v1.7.3, notionally tracks which version of the Greasemonkey script was used to save each LinkedIn post. This helps with:

1. **Debugging**: Identify which posts might be affected by specific bugs
2. **Data Quality**: Track improvements in text extraction across versions
3. **Migration**: Know which posts might need re-processing after major fixes

## How It Works

### 1. Greasemonkey Script
The script includes its version in every post sent to the server:

```javascript
const SCRIPT_VERSION = '1.7.3';

// In extractPostData():
const result = {
    text: postText,
    author: author,
    // ... other fields
    scriptVersion: SCRIPT_VERSION  // Tracked here
};
```

### 2. Server Processing
The PostProcessingService passes the version through to Notion:

```javascript
const notionData = {
    title: data.text?.substring(0, 100),
    // ... other fields
    scriptVersion: data.scriptVersion || 'Unknown'
};
```

### 3. Notion Database
A "Script version" select field stores the version:

```javascript
'Script version': {
    select: {
        name: pageData.scriptVersion || 'Unknown'
    }
}
```

## Notion Database Setup

Add a property called "Script version" with these settings:
- **Type**: Select
- **Options**: Will be auto-created as versions are used (e.g., "1.7.1", "1.7.2", "1.7.3")

## Version History & Known Issues

### Pre-1.7.2
- HTML entities not decoded (posts show &quot; instead of ")
- Affected posts can be identified by Script version < 1.7.2

### 1.7.0
- Dropdown detection broken
- Investigation features not working

### 1.7.1
- Fixed dropdown detection
- Investigation features restored

### 1.7.2
- Fixed HTML entity encoding
- All special characters now properly decoded

### 1.7.3
- Added script version tracking

## Using Version Data

### Find Posts by Version
In Notion, filter by "Script version" to find:
- Posts that need re-processing after bug fixes
- Posts saved with experimental versions
- Posts missing version info (saved before v1.7.3)

### Example Queries

**Find posts with HTML entity issues:**
```
Script version is empty OR
Script version < 1.7.2
```

**Find posts saved with latest version:**
```
Script version = 1.7.3
```

## Migration Strategies

### Re-processing Old Posts
If a critical bug is fixed (like HTML entities in v1.7.2), you can:

1. Filter posts by affected versions
2. Re-save them from LinkedIn with the fixed script
3. Archive or update the old versions

### Bulk Updates
For minor issues that don't require re-saving:
1. Use Notion's API to bulk update affected posts
2. Filter by Script version to target specific versions

## Best Practices

### Version Incrementing
- **Bug fixes**: Increment PATCH (1.7.2 → 1.7.3)
- **New features**: Increment MINOR (1.7.0 → 1.8.0)
- **Breaking changes**: Increment MAJOR (1.7.0 → 2.0.0)

### Testing Before Release
Before releasing a new version:
1. Test with posts containing special characters
2. Verify version is correctly saved to Notion
3. Check backwards compatibility

### Documentation
Always document in CHANGELOG:
- What changed in each version
- Which posts might be affected
- Whether re-processing is recommended

## Troubleshooting

### "Unknown" Version
Posts show "Unknown" when:
- Saved before v1.7.3
- Script version not properly passed
- Server error during processing

### Version Mismatch
If saved version doesn't match expected:
1. Check SCRIPT_VERSION constant in Greasemonkey script
2. Verify server is passing scriptVersion through
3. Confirm Notion field name is exactly "Script version"

## Future Enhancements

Potential improvements:
- Auto-detect and flag posts needing re-processing
- Bulk re-processing tool for specific versions
- Version-specific data migration scripts
- Analytics dashboard showing posts by version