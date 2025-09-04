#!/bin/bash

# Simulate a fresh install experience
echo "🎭 Simulating Fresh Install Experience"
echo "======================================"
echo ""

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Backup existing config
if [ -f "config.json" ]; then
  echo -e "${YELLOW}Backing up existing config...${NC}"
  mv config.json config.json.original
fi

# Step 2: Show what happens when user runs npm run dev
echo -e "${CYAN}User runs: npm run dev${NC}"
echo ""
echo "Expected behavior:"
echo "- Detects no config.json"
echo "- Launches interactive setup wizard"
echo "- Guides through Notion, Dropbox, Greasemonkey setup"
echo "- Creates config.json"
echo "- Starts server"
echo ""

# Step 3: Test the detection
echo -e "${CYAN}Testing setup detection...${NC}"
node -e "
const fs = require('fs');
const configExists = fs.existsSync('config.json');
if (!configExists) {
  console.log('✅ No config detected - setup will run');
} else {
  console.log('❌ Config exists - setup will be skipped');
}
"

# Step 4: Show available commands
echo ""
echo -e "${CYAN}Available Commands:${NC}"
echo "  npm run dev           - Start with auto-setup if needed"
echo "  npm run dev:skip-setup - Skip setup check"
echo "  npm run setup         - Run setup manually"
echo "  npm run dev:simple    - Original dev mode (no setup)"
echo ""

# Step 5: Restore config
if [ -f "config.json.original" ]; then
  echo -e "${YELLOW}Restoring original config...${NC}"
  mv config.json.original config.json
  echo -e "${GREEN}✅ Config restored${NC}"
fi

echo ""
echo "======================================"
echo -e "${GREEN}Ready for testing!${NC}"
echo ""
echo "To test the full experience:"
echo "1. Remove config: rm config.json"
echo "2. Run: npm run dev"
echo "3. Follow the wizard"