#!/bin/bash

# Notionally Server Management Script

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PORT=8765

case "$1" in
    start)
        echo -e "${GREEN}🚀 Starting Notionally server...${NC}"
        npm run dev
        ;;
    
    stop)
        echo -e "${YELLOW}🛑 Stopping Notionally server...${NC}"
        PID=$(lsof -i :$PORT | grep LISTEN | awk '{print $2}')
        if [ ! -z "$PID" ]; then
            kill $PID
            echo -e "${GREEN}✅ Server stopped (PID: $PID)${NC}"
        else
            echo -e "${YELLOW}⚠️  No server running on port $PORT${NC}"
        fi
        ;;
    
    restart)
        echo -e "${YELLOW}🔄 Restarting Notionally server...${NC}"
        $0 stop
        sleep 1
        $0 start
        ;;
    
    status)
        PID=$(lsof -i :$PORT | grep LISTEN | awk '{print $2}')
        if [ ! -z "$PID" ]; then
            echo -e "${GREEN}✅ Server is running (PID: $PID) on port $PORT${NC}"
        else
            echo -e "${RED}❌ Server is not running${NC}"
        fi
        ;;
    
    clean)
        echo -e "${YELLOW}🧹 Cleaning and restarting...${NC}"
        $0 stop
        rm -rf node_modules package-lock.json
        npm install
        $0 start
        ;;
    
    *)
        echo "Notionally Server Manager"
        echo ""
        echo "Usage: $0 {start|stop|restart|status|clean}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the server"
        echo "  stop    - Stop the server"
        echo "  restart - Restart the server"
        echo "  status  - Check if server is running"
        echo "  clean   - Clean install and restart"
        exit 1
        ;;
esac