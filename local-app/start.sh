#!/bin/bash

# Notionally Local App Starter Script
# Ensures Node.js 22+ is used

echo "🚀 Starting Notionally Local App..."
echo ""

# Check if nvm is available
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    echo "📦 Loading nvm..."
    source "$HOME/.nvm/nvm.sh"
    
    # Try to use Node 22
    if nvm use 22 2>/dev/null; then
        echo "✅ Using Node.js 22 via nvm"
    else
        echo "⚠️  Node.js 22 not found in nvm"
        echo "💡 Installing Node.js 22..."
        nvm install 22
        nvm use 22
    fi
elif command -v fnm &> /dev/null; then
    echo "📦 Loading fnm..."
    eval "$(fnm env)"
    
    # Try to use Node 22
    if fnm use 22 2>/dev/null; then
        echo "✅ Using Node.js 22 via fnm"
    else
        echo "⚠️  Node.js 22 not found in fnm"
        echo "💡 Installing Node.js 22..."
        fnm install 22
        fnm use 22
    fi
fi

# Check Node version
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)

if [ -z "$NODE_VERSION" ]; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js 22 or higher from https://nodejs.org/"
    exit 1
fi

if [ "$NODE_VERSION" -lt 22 ]; then
    echo "❌ Node.js version is $NODE_VERSION, but version 22+ is required"
    echo ""
    echo "To fix this, you can:"
    echo "  1. Install nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "  2. Then run: nvm install 22 && nvm use 22"
    echo "  3. Or download Node.js 22 from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version check passed (v$(node -v))"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "🚀 Starting server..."
npm run dev