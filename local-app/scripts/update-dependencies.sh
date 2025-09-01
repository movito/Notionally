#!/bin/bash

# Script to add recommended dependencies for optimization

echo "📦 Adding optimization dependencies..."

# Add performance and utility packages
npm install --save \
    bottleneck@^2.19.5 \
    winston@^3.11.0 \
    uuid@^9.0.1

# Add dev dependencies
npm install --save-dev \
    jest@^29.7.0 \
    nodemon@^3.0.1

echo "✅ Dependencies updated!"
echo ""
echo "New packages added:"
echo "  - bottleneck: Rate limiting and queue management"
echo "  - winston: Advanced logging"
echo "  - uuid: Request ID generation"
echo "  - jest: Testing framework"
echo "  - nodemon: Development auto-restart"
echo ""
echo "Run 'npm run dev' to start with auto-restart enabled"