#!/bin/bash

# setup.sh - Professional setup script for Ting
# Author: Senior DevOps Portfolio

set -e

echo "🚀 Starting setup for Ting..."

# 1. Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install it first."
    exit 1
fi

# 2. Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# 3. Create necessary directories
echo "📁 Creating data directories..."
mkdir -p data

# 4. Setup environment variables
if [ ! -f .env.local ]; then
    echo "📄 Creating .env.local template..."
    cat > .env.local <<EOL
# Ting Environment Variables
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_PATH=./data/ting.db
EOL
    echo "✅ .env.local created. Please update it with your settings."
else
    echo "ℹ️ .env.local already exists, skipping."
fi

# 5. Build for verification (optional)
# echo "🏗️ Running initial build check..."
# npm run build

echo "✨ Setup complete! Run 'make dev' to start."
