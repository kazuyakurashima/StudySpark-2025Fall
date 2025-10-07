#!/bin/bash

echo "🧹 Cleaning up all development servers..."

# Kill all Node.js processes
pkill -9 node 2>/dev/null
pkill -9 npm 2>/dev/null

echo "⏳ Waiting for processes to terminate..."
sleep 5

# Free port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null

echo "🗑️  Removing build cache..."
rm -rf .next
rm -rf node_modules/.cache

echo "✅ Cleanup complete!"
echo "🚀 Starting fresh development server..."
npm run dev
