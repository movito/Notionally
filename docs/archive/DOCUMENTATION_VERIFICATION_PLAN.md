---
title: Documentation Reorganization Verification Plan
version: 1.0.0
last_updated: 2025-01-10
category: testing
status: active
---

# Documentation Reorganization Verification Plan

## Test Objectives
1. Verify all document references still work
2. Confirm agents can find their required documents
3. Validate navigation structure is intuitive
4. Ensure version headers are correct
5. Check no functionality is broken

## Test Suite Components

### 1. Automated Link Checker Script (`/scripts/verify-docs.sh`)
```bash
#!/bin/bash

# Script to verify documentation structure and references
echo "🔍 Documentation Verification Suite"
echo "=================================="

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Test 1: Check all markdown files have version headers
echo -e "\n📋 Test 1: Checking version headers..."
for file in $(find docs -name "*.md" -type f); do
    if ! grep -q "^---$" "$file"; then
        echo -e "${YELLOW}⚠️  Missing version header: $file${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
done

# Test 2: Verify no broken internal links
echo -e "\n🔗 Test 2: Checking internal links..."
for file in $(find . -name "*.md" -type f | grep -v node_modules); do
    # Extract markdown links
    grep -oE '\[([^\]]+)\]\(([^)]+)\)' "$file" | while read -r link; do
        path=$(echo "$link" | sed -E 's/.*\(([^)]+)\).*/\1/')
        # Check if it's a relative path
        if [[ "$path" == /* ]] || [[ "$path" == ./* ]] || [[ "$path" == ../* ]]; then
            # Convert to absolute path from project root
            if [[ "$path" == /* ]]; then
                check_path="${path:1}"
            else
                dir=$(dirname "$file")
                check_path="$dir/$path"
            fi
            
            # Normalize path
            check_path=$(realpath --relative-to=. "$check_path" 2>/dev/null || echo "$check_path")
            
            if [ ! -f "$check_path" ] && [ ! -d "$check_path" ]; then
                echo -e "${RED}❌ Broken link in $file: $path${NC}"
                ERRORS=$((ERRORS + 1))
            fi
        fi
    done
done

# Test 3: Check critical paths exist
echo -e "\n📁 Test 3: Checking critical paths..."
CRITICAL_PATHS=(
    "docs/INDEX.md"
    "docs/architecture/CLAUDE.md"
    "docs/architecture/VERSION_HISTORY.md"
    "coordination/ROADMAP.md"
    "coordination/testing-strategy/TEST-RUNNER-GUIDE.md"
    ".claude/agents/test-runner.md"
    ".claude/agents/coordinator.md"
)

for path in "${CRITICAL_PATHS[@]}"; do
    if [ -f "$path" ]; then
        echo -e "${GREEN}✅ Found: $path${NC}"
    else
        echo -e "${RED}❌ Missing: $path${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

# Test 4: Verify agent configuration references
echo -e "\n🤖 Test 4: Checking agent references..."
for agent in .claude/agents/*.md; do
    if [ -f "$agent" ]; then
        echo "Checking $agent..."
        # Extract paths from agent files
        grep -oE '/[^"'\''`\s]+\.md' "$agent" | while read -r ref; do
            check_path="${ref:1}"
            if [ ! -f "$check_path" ]; then
                echo -e "${RED}❌ Agent $agent has broken reference: $ref${NC}"
                ERRORS=$((ERRORS + 1))
            fi
        done
    fi
done

# Test 5: Check for orphaned documents
echo -e "\n📄 Test 5: Checking for orphaned documents..."
for doc in $(find docs -name "*.md" -type f); do
    doc_name=$(basename "$doc")
    # Check if document is referenced anywhere
    if ! grep -r "$doc_name" . --include="*.md" --exclude-dir=node_modules -q > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Potentially orphaned: $doc${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
done

# Summary
echo -e "\n=================================="
echo "📊 Test Summary:"
echo -e "Errors: ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All critical tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Documentation verification failed${NC}"
    exit 1
fi
```

### 2. Agent Test Prompts

#### Test Prompt for test-runner Agent
```markdown
TEST: Documentation Navigation Verification

Please verify you can access and read the following documents:
1. Find and summarize the first section of TEST-RUNNER-GUIDE.md
2. Locate VERSION_HISTORY.md and report the current version
3. Navigate to the security documentation and list available docs
4. Use the main documentation index to find the development safeguards

Report any issues accessing these documents.
```

#### Test Prompt for coordinator Agent
```markdown
TEST: Coordination Document Access

Please perform these verification tasks:
1. Access VERSION_HISTORY.md and confirm latest version
2. Check ROADMAP.md for next planned features
3. Navigate through docs/INDEX.md and verify structure
4. Confirm you can read task documentation in coordination/tasks/

Report success/failure for each item.
```

#### Test Prompt for feature-developer Agent
```markdown
TEST: Development Documentation Access

Please verify:
1. Can you find and read DEVELOPMENT_SAFEGUARDS.md?
2. Can you access the main architecture document (CLAUDE.md)?
3. Can you navigate to setup documentation?
4. Can you find the safe development process guide?

List any broken references or navigation issues.
```

### 3. Manual Verification Checklist

#### Pre-Migration Backup
- [ ] Create git branch `backup/pre-doc-reorg`
- [ ] Document current working agent commands
- [ ] Note any custom navigation patterns in use

#### Post-Migration Verification
- [ ] Main README links work
- [ ] `/docs/INDEX.md` loads and all links work
- [ ] Each category README is accessible
- [ ] YAML headers render correctly
- [ ] No console errors when agents run

#### Agent Functionality Tests
- [ ] test-runner can execute test suite
- [ ] coordinator can create tasks
- [ ] feature-developer can read task specs
- [ ] security-reviewer can access security docs

#### Navigation Tests
- [ ] Can navigate from INDEX to any document
- [ ] Category indexes link correctly
- [ ] Cross-category links work
- [ ] Related documents are discoverable

### 4. Rollback Plan

If tests fail:
```bash
# Immediate rollback
git checkout backup/pre-doc-reorg
git branch -D feature/doc-reorg  # Delete failed attempt

# Or partial rollback
git checkout backup/pre-doc-reorg -- <specific-files>
```

### 5. Success Criteria

The reorganization is successful if:
1. ✅ All automated tests pass (0 errors)
2. ✅ All agent test prompts complete successfully
3. ✅ Manual checklist 100% complete
4. ✅ No degradation in agent performance
5. ✅ Users can navigate documentation easier than before

### 6. Performance Baseline

Before migration, capture:
```bash
# Time to find a document
time find . -name "DEVELOPMENT_SAFEGUARDS.md"

# Count of documentation files
find . -name "*.md" | wc -l

# Agent reference check
grep -r "\.md" .claude/agents/ | wc -l
```

After migration, compare these metrics.

## Test Execution Order

1. **Before Migration**
   - Run baseline performance tests
   - Create backup branch
   - Document current state

2. **During Migration**
   - Run tests after each major step
   - Verify critical paths remain accessible

3. **After Migration**
   - Run full automated test suite
   - Execute all agent test prompts
   - Complete manual checklist
   - Compare performance metrics

4. **Sign-off**
   - All tests passing
   - Agent functionality confirmed
   - User navigation improved
   - Document the changes

## Monitoring Post-Migration

For 24 hours after migration:
- Monitor agent error rates
- Check for user complaints about broken links
- Watch for increased "file not found" errors
- Track documentation access patterns

## Emergency Contacts

If critical issues arise:
1. Check `git log` for migration commit hash
2. Revert with `git revert <hash>`
3. Run verification suite to confirm restoration
4. Document what went wrong for next attempt

---

**Note**: This verification plan ensures the documentation reorganization maintains all functionality while improving organization and navigation.