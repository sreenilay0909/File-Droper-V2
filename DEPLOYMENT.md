# File Droper V2 - Deployment Guide

This guide will help you deploy your file sharing app to production.

## Deployment Options

### Option 1: Vercel (Recommended - Easiest)

Vercel is perfect for this app as it handles both frontend and backend seamlessly.

#### Steps:

1. **Prepare your code:**
   ```bash
   # Make sure everything is committed
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Push to GitHub:**
   - Create a new repository on GitHub
   - Push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/file-droper-v2.git
   git branch -M main
   git push -u origin main
   ```

3. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/Login with GitHub
   - Click "New Project"
   - Import your GitHub repository
   - Configure:
     - Framework Preset: Vite
     - Build Command: `npm run build`
     - Output Directory: `dist`
     - Install Command: `npm install`
   - Add Environment Variables (optional):
     ```
     NODE_ENV=production
     MAX_FILE_SIZE=104857600
     ```
   - Click "Deploy"

4. **Deploy the WebSocket Server:**
   
   Create a new file `vercel.json` in your project root:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "server/index.ts",
         "use": "@vercel/node"
       },
       {
         "src": "package.json",
         "use": "@vercel/static-build",
         "config": {
           "distDir": "dist"
         }
       }
     ],
     "routes": [
       {
         "src": "/socket.io/(.*)",
         "dest": "/server/index.ts"
       },
       {
         "src": "/(.*)",
         "dest": "/dist/$1"
       }
     ]
   }
   ```

5. **Update Socket.IO connection:**
   
   The app already handles this automatically with:
   ```typescript
   const serverUrl = process.env.NODE_ENV === 'production' 
     ? window.location.origin 
     : 'http://localhost:4000'
   ```

6. **Redeploy:**
   - Push changes to GitHub
   - Vercel will auto-deploy

---

### Option 2: Railway (Great for WebSocket)

Railway is excellent for apps with WebSocket support.

#### Steps:

1. **Prepare package.json:**
   
   Make sure you have these scripts:
   ```json
   {
     "scripts": {
       "build": "tsc && vite build",
       "start": "node dist-server/index.js",
       "build:server": "tsc server/index.ts --outDir dist-server"
     }
   }
   ```

2. **Create Procfile:**
   ```
   web: npm run build:server && npm start
   ```

3. **Deploy:**
   - Go to [railway.app](https://railway.app)
   - Sign up/Login with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect and deploy
   - Add environment variables in Settings:
     ```
     NODE_ENV=production
     PORT=4000
     MAX_FILE_SIZE=104857600
     ```

4. **Get your URL:**
   - Railway will provide a URL like: `your-app.railway.app`
   - Update CORS in `server/index.ts` if needed

---

### Option 3: Render (Free Tier Available)

#### Steps:

1. **Create render.yaml:**
   ```yaml
   services:
     - type: web
       name: file-droper-v2
       env: node
       buildCommand: npm install && npm run build
       startCommand: npm run server:prod
       envVars:
         - key: NODE_ENV
           value: production
         - key: PORT
           value: 10000
         - key: MAX_FILE_SIZE
           value: 104857600
   ```

2. **Deploy:**
   - Go to [render.com](https://render.com)
   - Sign up/Login
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Render will use the render.yaml config
   - Click "Create Web Service"

3. **Configure:**
   - Render will provide a URL
   - Update CORS_ORIGIN environment variable with your URL

---

### Option 4: DigitalOcean App Platform

#### Steps:

1. **Create app.yaml:**
   ```yaml
   name: file-droper-v2
   services:
   - name: web
     github:
       repo: YOUR_USERNAME/file-droper-v2
       branch: main
     build_command: npm install && npm run build
     run_command: npm run server:prod
     environment_slug: node-js
     envs:
     - key: NODE_ENV
       value: production
     - key: PORT
       value: 8080
     - key: MAX_FILE_SIZE
       value: 104857600
   ```

2. **Deploy:**
   - Go to [digitalocean.com/products/app-platform](https://www.digitalocean.com/products/app-platform)
   - Click "Create App"
   - Connect GitHub
   - Select repository
   - DigitalOcean will auto-configure
   - Click "Next" → "Launch App"

---

## Important Configuration Changes

### 1. Update CORS Settings

In `server/index.ts`, update CORS origin:

```typescript
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'https://your-deployed-url.com'
```

### 2. Environment Variables

Set these on your hosting platform:

```env
NODE_ENV=production
PORT=4000 (or as required by platform)
CORS_ORIGIN=https://your-frontend-url.com
MAX_FILE_SIZE=104857600
```

### 3. Build the Frontend

```bash
npm run build
```

This creates a `dist` folder with optimized production files.

---

## Testing Before Deployment

1. **Test production build locally:**
   ```bash
   npm run build
   npm run preview
   ```

2. **Test server:**
   ```bash
   npm run server:prod
   ```

3. **Check for errors:**
   - Open browser console
   - Test file uploads
   - Test room creation/joining
   - Test all features

---

## Post-Deployment Checklist

- [ ] Test room creation
- [ ] Test room joining with code
- [ ] Test file upload (small files)
- [ ] Test file upload (large files)
- [ ] Test file download
- [ ] Test file deletion
- [ ] Test user removal (host)
- [ ] Test end room (host)
- [ ] Test on mobile devices
- [ ] Test WebSocket connection
- [ ] Check browser console for errors

---

## Troubleshooting

### WebSocket Connection Issues

If WebSocket doesn't connect:

1. Check CORS settings
2. Ensure your hosting supports WebSocket
3. Check firewall/security settings
4. Verify the server URL in client code

### File Upload Fails

1. Check MAX_FILE_SIZE environment variable
2. Verify server has enough memory
3. Check network timeout settings

### Room Not Found

1. Verify server is running
2. Check database/memory storage
3. Ensure rooms aren't being deleted too quickly

---

## Recommended: Vercel + Railway

**Best Setup:**
- Frontend on Vercel (fast, free, auto-deploy)
- Backend on Railway (WebSocket support, free tier)

**Steps:**
1. Deploy frontend to Vercel
2. Deploy server to Railway
3. Update frontend to use Railway server URL
4. Update Railway CORS to allow Vercel URL

---

## Cost Estimates

- **Vercel:** Free tier (hobby projects)
- **Railway:** $5/month (includes $5 credit)
- **Render:** Free tier available (with limitations)
- **DigitalOcean:** $5/month minimum

---

## Custom Domain (Optional)

1. Buy domain from Namecheap, GoDaddy, etc.
2. Add domain in your hosting platform
3. Update DNS records as instructed
4. Update CORS_ORIGIN with new domain

---

## Monitoring & Maintenance

- Check server logs regularly
- Monitor memory usage
- Set up error tracking (Sentry)
- Monitor WebSocket connections
- Clean up old rooms periodically

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
- Socket.IO Docs: https://socket.io/docs/v4/

Good luck with your deployment! 🚀
