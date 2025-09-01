#!/bin/bash

echo "🚀 Starting Optimized Server..."
echo ""
echo "Options:"
echo "  1. Run on default port 8765 (replaces original)"
echo "  2. Run on port 8766 (test alongside original)"
echo "  3. Run on custom port"
echo ""
read -p "Choose option (1-3): " choice

case $choice in
    1)
        echo "Starting optimized server on port 8765..."
        node src/server-optimized.js
        ;;
    2)
        echo "Starting optimized server on port 8766 (test mode)..."
        TEST_OPTIMIZED=true node src/server-optimized.js
        ;;
    3)
        read -p "Enter port number: " port
        echo "Starting optimized server on port $port..."
        OPTIMIZED_PORT=$port node src/server-optimized.js
        ;;
    *)
        echo "Invalid option. Using default port 8765..."
        node src/server-optimized.js
        ;;
esac