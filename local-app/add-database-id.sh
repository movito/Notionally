#!/bin/bash

# Helper script to add NOTION_DATABASE_ID to .env file

echo "📝 Adding NOTION_DATABASE_ID to your .env file"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ No .env file found"
  echo "Create one with: cp .env.example .env"
  exit 1
fi

# Check if already has database ID
if grep -q "^NOTION_DATABASE_ID=" .env; then
  echo "✅ NOTION_DATABASE_ID already exists in .env"
  echo ""
  echo "Current value:"
  grep "^NOTION_DATABASE_ID=" .env
  echo ""
  echo "To update it, edit .env directly"
  exit 0
fi

# Get the database ID from config.json if it exists
if [ -f config.json ]; then
  DB_ID=$(cat config.json | grep -o '"databaseId": *"[^"]*"' | cut -d'"' -f4)
  if [ ! -z "$DB_ID" ] && [ "$DB_ID" != '${NOTION_DATABASE_ID}' ]; then
    echo "Found database ID in config.json: $DB_ID"
    echo ""
    echo "Adding to .env..."
    echo "" >> .env
    echo "# Your Notion database ID (added by setup)" >> .env
    echo "NOTION_DATABASE_ID=$DB_ID" >> .env
    echo "✅ Added NOTION_DATABASE_ID to .env"
    echo ""
    echo "You can now delete config.json if you want (it will be auto-generated from .env)"
    exit 0
  fi
fi

# Manual entry
echo "Enter your Notion database ID:"
echo "(32 character string from your Notion database URL)"
echo ""
read -p "Database ID: " DB_ID

if [ -z "$DB_ID" ]; then
  echo "❌ No database ID provided"
  exit 1
fi

# Add to .env
echo "" >> .env
echo "# Your Notion database ID" >> .env
echo "NOTION_DATABASE_ID=$DB_ID" >> .env

echo "✅ Added NOTION_DATABASE_ID to .env"
echo ""
echo "Your credentials are now securely stored in .env"
echo "Run 'npm run dev' to start the server"