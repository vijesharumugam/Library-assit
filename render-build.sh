#!/bin/bash
set -e

echo "🔧 Installing dependencies..."
npm ci

echo "🗄️ Generating Prisma client..."
npx prisma generate

echo "🏗️ Building frontend..."
npm run check
npx vite build

echo "📦 Building backend for production..."
npx esbuild server/production.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/server.js

echo "✅ Build completed successfully!"