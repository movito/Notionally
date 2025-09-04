#!/bin/bash

# Test script for documentation references
# Can be run before and after reorganization to verify nothing breaks

echo "📚 Documentation Reference Test"
echo "==============================="

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

# Function to test if a file exists
test_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ FOUND${NC}: $description"
        echo "   Path: $file"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ MISSING${NC}: $description"
        echo "   Expected at: $file"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Function to test if a reference in a file works
test_reference() {
    local source_file=$1
    local search_pattern=$2
    local description=$3
    
    if [ ! -f "$source_file" ]; then
        echo -e "${YELLOW}⚠️  SKIP${NC}: Cannot test $description (source missing)"
        return 1
    fi
    
    # Extract the referenced path
    ref_path=$(grep -o "$search_pattern" "$source_file" 2>/dev/null | head -1)
    
    if [ -z "$ref_path" ]; then
        echo -e "${YELLOW}⚠️  No reference found${NC}: $description"
        return 1
    fi
    
    # Clean up the path (remove markdown link syntax if present)
    clean_path=$(echo "$ref_path" | sed -E 's/.*\(([^)]+)\).*/\1/')
    
    # Check if it's an absolute path from root
    if [[ "$clean_path" == /* ]]; then
        check_path="${clean_path:1}"
    else
        # Relative path from source file location
        dir=$(dirname "$source_file")
        check_path="$dir/$clean_path"
    fi
    
    if [ -f "$check_path" ] || [ -d "$check_path" ]; then
        echo -e "${GREEN}✅ VALID REF${NC}: $description"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}❌ BROKEN REF${NC}: $description"
        echo "   In file: $source_file"
        echo "   Reference: $ref_path"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo -e "\n🔍 Testing Critical Documents..."
echo "--------------------------------"

# Test main documentation files
test_file "README.md" "Main README"
test_file "claude.md" "Claude context (current location)" || \
test_file "docs/architecture/CLAUDE.md" "Claude context (new location)"

test_file "VERSION_HISTORY.md" "Version history (current)" || \
test_file "docs/architecture/VERSION_HISTORY.md" "Version history (new)"

test_file "coordination/ROADMAP.md" "Development roadmap"
test_file "coordination/testing-strategy/TEST-RUNNER-GUIDE.md" "Test runner guide"

echo -e "\n🤖 Testing Agent Configurations..."
echo "-----------------------------------"

# Test agent files exist
test_file ".claude/agents/test-runner.md" "Test runner agent"
test_file ".claude/agents/coordinator.md" "Coordinator agent"
test_file ".claude/agents/feature-developer.md" "Feature developer agent"
test_file ".claude/agents/security-reviewer.md" "Security reviewer agent"

echo -e "\n🔗 Testing Agent References..."
echo "------------------------------"

# Test specific references in agent files
if [ -f ".claude/agents/test-runner.md" ]; then
    grep -q "TEST-RUNNER-GUIDE.md" ".claude/agents/test-runner.md"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ FOUND${NC}: test-runner references TEST-RUNNER-GUIDE.md"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ MISSING${NC}: test-runner should reference TEST-RUNNER-GUIDE.md"
        FAILED=$((FAILED + 1))
    fi
fi

if [ -f ".claude/agents/coordinator.md" ]; then
    grep -q "VERSION_HISTORY\|ROADMAP" ".claude/agents/coordinator.md"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ FOUND${NC}: coordinator references version/roadmap docs"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ MISSING${NC}: coordinator should reference version/roadmap"
        FAILED=$((FAILED + 1))
    fi
fi

echo -e "\n📁 Testing Documentation Structure..."
echo "-------------------------------------"

# Check if new structure exists (for post-migration)
if [ -d "docs" ]; then
    echo -e "${YELLOW}📂 New structure detected${NC}"
    test_file "docs/INDEX.md" "Documentation index"
    test_file "docs/architecture/README.md" "Architecture index"
    test_file "docs/development/README.md" "Development index"
    test_file "docs/security/README.md" "Security index"
else
    echo -e "${YELLOW}📂 Current structure (pre-migration)${NC}"
    # Count scattered markdown files in root
    root_md_count=$(find . -maxdepth 1 -name "*.md" -type f | wc -l)
    echo "   Markdown files in root: $root_md_count"
fi

echo -e "\n==============================="
echo "📊 Test Summary:"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ All reference tests passed!${NC}"
    echo "Documentation structure is intact."
    exit 0
else
    echo -e "\n${RED}⚠️  Some references are broken${NC}"
    echo "Please review and fix before proceeding."
    exit 1
fi