# Render Deployment Instructions

## Build Command (Use this in Render dashboard):
```bash
chmod +x render-build.sh && ./render-build.sh
```

## Start Command (Use this in Render dashboard):
```bash
node start-render.js
```

## Environment Variables to Add in Render:
- `MONGODB_URI` = your MongoDB Atlas connection string
- `NODE_ENV` = production

## 🔥 SIMPLIFIED APPROACH (Try this first):

### Build Command:
```bash
npm install && npx prisma generate && npm run build
```

### Start Command:
```bash
npm start
```

## 🛠️ Alternative Commands:

### Build Command Option 2:
```bash
chmod +x render-simple-build.sh && ./render-simple-build.sh
```

### Start Command Option 2:
```bash
node simple-start.js
```

### Build Command Option 3:
```bash
chmod +x render-build.sh && ./render-build.sh
```

### Start Command Option 3:
```bash
node start-render.js
```