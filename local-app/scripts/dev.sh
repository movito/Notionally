#!/bin/bash

# notionally Development Server Starter
# Automatically kills any existing process on port before starting

PORT=${PORT:-8765}
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Checking for existing processes on port $PORT...${NC}"

# Use the same reliable method as in your example
if lsof -ti:$PORT > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Found existing process on port $PORT${NC}"
    echo -e "${YELLOW}🛑 Stopping existing process...${NC}"
    
    # Kill all processes on the port (more reliable than PID approach)
    lsof -ti:$PORT | xargs kill -9 2>/dev/null
    
    # Wait for port to be released
    sleep 1
    
    echo -e "${GREEN}✅ Port $PORT cleared${NC}"
else
    echo -e "${GREEN}✅ Port $PORT is available${NC}"
fi

echo -e "${GREEN}🚀 Starting development server...${NC}"
echo ""

# Start nodemon
exec npx nodemon src/server.js