#!/bin/bash

# notionally Production Server Starter
# Automatically kills any existing process on port before starting

PORT=${PORT:-8765}
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Checking for existing processes on port $PORT...${NC}"

# Kill any existing process on the port using a more reliable method
if lsof -ti:$PORT > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Found existing process on port $PORT${NC}"
    echo -e "${YELLOW}🛑 Stopping existing process...${NC}"
    
    # Kill all processes on the port
    lsof -ti:$PORT | xargs kill -9 2>/dev/null
    
    # Wait for port to be released
    sleep 1
    
    echo -e "${GREEN}✅ Port $PORT cleared${NC}"
else
    echo -e "${GREEN}✅ Port $PORT is available${NC}"
fi

echo -e "${GREEN}🚀 Starting notionally server on port $PORT...${NC}"
echo ""

# Start the server
exec node src/server.js