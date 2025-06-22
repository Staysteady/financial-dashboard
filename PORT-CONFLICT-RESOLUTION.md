# Port Conflict Resolution Guide

This guide explains how to resolve port conflicts between the Financial Dashboard and other applications (like the Bloomberg dashboard) that may be running on the same port.

## Problem Description

When multiple applications try to use the same port (typically port 3000), you may experience:
- Redirects to the wrong application when clicking dashboard links
- "Port already in use" errors when starting the application
- Confusion between different dashboard applications

## Solution Implemented

The Financial Dashboard has been configured to run on **port 3001** instead of the default port 3000 to avoid conflicts.

## Changes Made

### 1. Package.json Scripts Updated
```json
{
  "scripts": {
    "dev": "next dev --turbopack -p 3001",
    "start": "next start -p 3001",
    "check-port": "node scripts/check-port.js",
    "dev:safe": "npm run check-port && npm run dev"
  }
}
```

### 2. Environment Variables Updated
- `.env.local.example`: `NEXT_PUBLIC_APP_URL=http://localhost:3001`
- All documentation updated to reference port 3001

### 3. Configuration Files Updated
- `next.config.ts`: Added port configuration and security headers
- `src/lib/auth-middleware.ts`: Updated CORS origins to use port 3001
- All README files updated with correct port references

### 4. Port Checking Utility Added
- `scripts/check-port.js`: Utility to check port availability
- New npm scripts for safe startup

## How to Start the Application

### Option 1: Quick Start (Recommended)
```bash
cd financial-dashboard
npm run dev:safe
```

This will:
1. Check if port 3001 is available
2. Show you which ports are in use
3. Start the application if the port is free

### Option 2: Manual Start
```bash
cd financial-dashboard
npm run dev
```

### Option 3: Check Ports First
```bash
cd financial-dashboard
npm run check-port
```

This will show you:
- ✅ Port 3000: Available/In use (Bloomberg dashboard)
- ✅ Port 3001: Available/In use
- Alternative ports if 3001 is occupied

## Accessing the Application

After starting the application, open your browser and navigate to:
**http://localhost:3001**

### Important URLs:
- **Home Page**: http://localhost:3001
- **Dashboard**: http://localhost:3001/dashboard
- **Login**: http://localhost:3001/auth/login
- **Signup**: http://localhost:3001/auth/signup

## Troubleshooting

### Port 3001 Still in Use?
If port 3001 is also occupied, you can:

1. **Find what's using the port:**
   ```bash
   lsof -i :3001
   # or on Windows:
   netstat -ano | findstr :3001
   ```

2. **Use a different port:**
   ```bash
   npm run dev -- -p 3002
   ```

3. **Kill the process using the port:**
   ```bash
   # Replace PID with the actual process ID
   kill -9 PID
   ```

### Multiple Dashboard Applications
If you're running multiple dashboard applications:

1. **Financial Dashboard**: http://localhost:3001
2. **Bloomberg Dashboard**: http://localhost:3000 (if running)
3. **Other Dashboards**: Use ports 3002, 3003, etc.

### Environment Variables
Make sure your `.env.local` file has the correct URL:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### Supabase Configuration
Update your Supabase project settings:
1. Go to Authentication → Settings
2. Update **Site URL** to: `http://localhost:3001`
3. Add `http://localhost:3001/auth/callback` to **Redirect URLs**

## Verification Steps

1. **Start the application:**
   ```bash
   npm run dev:safe
   ```

2. **Check the terminal output:**
   ```
   ▲ Next.js 15.3.4
   - Local:        http://localhost:3001
   - Environments: .env.local
   ```

3. **Open the browser:**
   - Navigate to http://localhost:3001
   - You should see the Financial Dashboard landing page
   - Click "Launch Dashboard" - it should go to http://localhost:3001/dashboard

4. **Test authentication:**
   - Click "Get Started" or navigate to http://localhost:3001/auth/login
   - The login page should load without redirecting to other applications

## Production Deployment

When deploying to production, update:
1. **Environment variables** with your production URL
2. **Supabase settings** with your production domain
3. **CORS settings** in the auth middleware if needed

## Support

If you continue to experience port conflicts:
1. Run `npm run check-port` to diagnose the issue
2. Check what applications are running on nearby ports
3. Consider using a port manager or Docker containers for isolation
4. Update the port number in package.json if needed:
   ```json
   "dev": "next dev --turbopack -p YOUR_PREFERRED_PORT"
   ```

Remember to update all references to the port number if you choose a different port than 3001.
