#!/bin/bash

echo "🔍 Searching for your Notion Database ID..."
echo ""

# Check environment
if [ ! -z "$NOTION_DATABASE_ID" ] && [ "$NOTION_DATABASE_ID" != "your-notion-database-id-here" ]; then
  echo "✅ Found in environment: $NOTION_DATABASE_ID"
  exit 0
fi

# Check .env
if [ -f .env ]; then
  DB_ID=$(grep "^NOTION_DATABASE_ID=" .env | cut -d'=' -f2)
  if [ ! -z "$DB_ID" ] && [ "$DB_ID" != "your-notion-database-id-here" ]; then
    echo "✅ Found in .env: $DB_ID"
    exit 0
  fi
fi

# Check for any backup files
for file in config.json.backup config.json.bak config.json.old .env.backup CURRENT_CONFIG.md; do
  if [ -f "$file" ]; then
    echo "Found backup file: $file"
    grep -o '"databaseId"[[:space:]]*:[[:space:]]*"[^"]*"' "$file" 2>/dev/null | cut -d'"' -f4
  fi
done

# Check Notion pages created by the app
echo ""
echo "Looking for recently created Notion pages..."
echo "Check your Notion database directly - the ID is in the URL:"
echo ""
echo "1. Open Notion in your browser"
echo "2. Navigate to your LinkedIn Posts database"
echo "3. Look at the URL: https://notion.so/workspace/YOUR_DATABASE_ID_HERE?v=..."
echo "4. The database ID is the 32-character string"
echo ""

# Check if we can find it in server logs
if [ -d logs ]; then
  echo "Checking logs..."
  grep -h "databaseId\|database_id" logs/*.log 2>/dev/null | tail -5
fi

echo ""
echo "💡 Tips to find your database ID:"
echo ""
echo "1. Check your Notion workspace:"
echo "   - Open the database you've been saving posts to"
echo "   - Copy the URL and extract the 32-char ID"
echo ""
echo "2. Check your browser history:"
echo "   - Search for 'notion.so' URLs"
echo "   - Look for the database you created"
echo ""
echo "3. Once found, add it to your .env file:"
echo "   NOTION_DATABASE_ID=your_actual_id_here"