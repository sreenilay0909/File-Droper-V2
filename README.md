# File Droper V2

A production-ready file sharing web application built with React, TypeScript, and Socket.IO.

## Features

- Create rooms with 4-digit codes
- Join rooms using codes or direct links
- Real-time file sharing with progress tracking
- Drag & drop support
- Large file support (up to 100MB)
- All file types supported
- Live user count and management
- Host controls (remove users, delete files, end room)
- Clean, modern UI with mobile support

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the WebSocket server:
```bash
npm run server
```

3. Start the development server (in a new terminal):
```bash
npm run dev
```

4. Open http://localhost:3000

## Production Deployment

### Build the frontend:
```bash
npm run build
```

### Start the production server:
```bash
npm run start
```

### Environment Variables

Create a `.env` file in the root directory:

```env
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
MAX_FILE_SIZE=104857600
```

## Configuration

- **MAX_FILE_SIZE**: Maximum file size in bytes (default: 100MB)
- **PORT**: Server port (default: 4000)
- **CORS_ORIGIN**: Allowed origin for CORS (default: http://localhost:3000)

## Tech Stack

- React 18
- TypeScript
- Socket.IO (WebSocket)
- React Router
- Vite
- Express

## File Upload

- Small files (< 1MB): Direct upload
- Large files (> 1MB): Chunked upload with progress tracking
- Maximum file size: 100MB (configurable)
- All file types supported

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)
