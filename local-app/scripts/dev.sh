#!/bin/bash

# Notionally Development Server Starter
# Automatically kills any existing process on port 8765 before starting

PORT=8765
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Checking for existing processes on port $PORT...${NC}"

# Find and kill any existing process on the port
PID=$(lsof -i :$PORT | grep LISTEN | awk '{print $2}' | head -1)

if [ ! -z "$PID" ]; then
    echo -e "${YELLOW}⚠️  Found existing process (PID: $PID) on port $PORT${NC}"
    echo -e "${YELLOW}🛑 Stopping existing process...${NC}"
    kill $PID 2>/dev/null
    
    # Wait a moment for the process to terminate
    sleep 1
    
    # Force kill if still running
    if kill -0 $PID 2>/dev/null; then
        echo -e "${RED}⚠️  Process didn't stop gracefully, force killing...${NC}"
        kill -9 $PID 2>/dev/null
        sleep 1
    fi
    
    echo -e "${GREEN}✅ Existing process stopped${NC}"
else
    echo -e "${GREEN}✅ Port $PORT is available${NC}"
fi

echo -e "${GREEN}🚀 Starting development server...${NC}"
echo ""

# Start nodemon
exec npx nodemon src/server.js