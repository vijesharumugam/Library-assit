# Render Deployment Instructions

## Build Command (Use this in Render dashboard):
```bash
chmod +x render-build.sh && ./render-build.sh
```

## Start Command (Use this in Render dashboard):
```bash
node start-production.js
```

## Environment Variables to Add in Render:
- `MONGODB_URI` = your MongoDB Atlas connection string
- `NODE_ENV` = production

## Alternative Build Command (if the script doesn't work):
```bash
npm ci && npx prisma generate && npm run check && npx vite build && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
```

## Alternative Start Command:
```bash
npx prisma generate && npm start
```