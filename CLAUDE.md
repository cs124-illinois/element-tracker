# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a TypeScript monorepo for element tracking functionality with four main workspaces:

- **types**: Shared TypeScript types and runtime type validation using runtypes
- **react**: React hooks and components for client-side element tracking
- **server**: Koa.js WebSocket server that receives and stores tracking data
- **demo**: Next.js demonstration application

## Development Commands

### Building and Type Checking
```bash
# Build all packages
npm run build --workspaces

# Type check specific packages
cd react && npm run tsc
cd server && npm run tsc
cd types && npm run tsc
```

### Code Quality
```bash
# Run full check (includes depcheck, prettier, eslint, tsc, build)
cd react && npm run check
cd server && npm run check  
cd types && npm run check

# Individual tools
cd react && npm run eslint
cd react && npm run prettier
```

### Development Servers
```bash
# Start demo application
cd demo && npm start

# Start backend server with Docker
npm run backend
# or from demo directory:
cd demo && npm run backend

# Start server in development mode
cd server && npm start
```

### Database
```bash
# Connect to MongoDB shell
npm run db
```

## Architecture

The element tracker system works through real-time WebSocket communication:

1. **React Components**: `ElementTrackerServer` establishes WebSocket connection and `ElementTracker` monitors DOM elements with `data-et` attributes
2. **WebSocket Protocol**: Uses ping-pong WebSocket wrapper with connection queries, login messages, and update messages
3. **Server**: Koa.js server handles WebSocket connections, validates Google OAuth tokens, and stores data in MongoDB
4. **Types**: Shared runtime type validation ensures type safety across client/server boundary

The React client tracks DOM elements using intersection observers and mutation observers, throttling updates to the server. The server stores all tracking data with timestamps and user identification.

## Key Features

- Real-time element visibility tracking
- Google OAuth integration for user identification
- MongoDB storage with connection and update logging
- Automatic hash navigation based on active elements
- Support for both IPv4 and IPv6 client identification
- Docker containerization for server deployment

## Environment Variables

Server requires:
- `MONGODB`: MongoDB connection string
- `MONGODB_COLLECTION`: Collection name (defaults to "elementTracker")
- `GOOGLE_CLIENT_IDS`: Comma-separated OAuth client IDs
- `VALID_DOMAINS`: Comma-separated allowed origins
- `SECRET`: Encryption key for NextAuth session tokens