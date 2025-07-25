# Element Tracker

A real-time DOM element visibility tracking system with React components and WebSocket server.

## Overview

Element Tracker provides a complete solution for tracking user interactions with DOM elements in web applications. It consists of React components that monitor element visibility and a WebSocket server that collects and stores this data in MongoDB.

## Features

- 📊 Real-time element visibility tracking using Intersection Observer API
- 🔄 Automatic reconnecting WebSocket connections
- 🔐 Google OAuth integration for user identification
- 📱 Support for both IPv4 and IPv6 client identification
- 🗄️ MongoDB storage for tracking data
- ⚡ Throttled updates to optimize performance
- 🔗 Automatic hash navigation based on active elements
- 🐳 Docker support for easy deployment

## Project Structure

This monorepo contains four packages:

- **`types`** - Shared TypeScript types with runtime validation
- **`react`** - React hooks and components for client-side tracking
- **`server`** - Koa.js WebSocket server for data collection
- **`demo`** - Next.js demonstration application

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/element-tracker.git
cd element-tracker

# Install dependencies
yarn install

# Build all packages
yarn workspaces foreach run build
```

## Quick Start

### 1. Start MongoDB

```bash
yarn backend
# or
docker-compose up
```

### 2. Configure Environment

Create `.env.development` in the server directory:

```env
MONGODB=mongodb://localhost:27017/elementTracker
GOOGLE_CLIENT_IDS=your-client-id-1,your-client-id-2
VALID_DOMAINS=http://localhost:3000,https://yourdomain.com
SECRET=your-encryption-secret
```

### 3. Start the Server

```bash
cd server
yarn start
```

### 4. Run the Demo

```bash
cd demo
yarn start
```

## Usage

### React Components

```tsx
import { ElementTrackerServer, ElementTracker } from "@cs124/element-tracker"

function App() {
  return (
    <ElementTrackerServer 
      server="ws://localhost:8080"
      googleToken={userGoogleToken}
    >
      <ElementTracker>
        <div data-et="true" data-et-id="section-1">
          <h1>Tracked Content</h1>
          <p>This element's visibility will be tracked</p>
        </div>
      </ElementTracker>
    </ElementTrackerServer>
  )
}
```

### Element Attributes

- `data-et="true"` - Mark an element for tracking
- `data-et-id="custom-id"` - Set a custom ID (falls back to element's `id` attribute)

### Server API

The server exposes a WebSocket endpoint at `/` that accepts:

**Connection Query Parameters:**
- `browserID` - Unique browser identifier
- `tabID` - Unique tab identifier

**Message Types:**

1. **Login Message**
```json
{
  "type": "login",
  "googleToken": "oauth-token"
}
```

2. **Update Message**
```json
{
  "type": "update",
  "location": "current-url",
  "width": 1920,
  "height": 1080,
  "elements": [
    {
      "tagName": "div",
      "top": 100,
      "bottom": 200,
      "id": "section-1",
      "text": "Content text"
    }
  ]
}
```

## Development

### Commands

```bash
# Type checking
yarn tsc

# Linting
yarn eslint

# Code formatting
yarn prettier

# Run all checks
yarn checker

# Update dependencies
yarn ncu
```

### Building

```bash
# Build all packages
yarn workspaces foreach run build

# Build specific package
cd types && yarn build
```

### Testing

Run the demo application to test the tracking functionality:

```bash
cd demo
yarn start
```

## Configuration

### Server Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB` | MongoDB connection string | Required |
| `MONGODB_COLLECTION` | Collection name | `elementTracker` |
| `GOOGLE_CLIENT_IDS` | Comma-separated OAuth client IDs | Optional |
| `VALID_DOMAINS` | Comma-separated allowed origins | Optional |
| `SECRET` | Encryption key for session tokens | Optional |
| `SECURE_COOKIE` | Use secure cookies | `false` |

### React Component Props

#### ElementTrackerServer

| Prop | Type | Description | Default |
|------|------|-------------|---------|
| `server` | `string` | WebSocket server URL | Required |
| `googleToken` | `string` | Google OAuth token | Optional |
| `reportInterval` | `number` | Update throttle interval (ms) | `1000` |
| `elementSelector` | `string` | CSS selector for tracked elements | `"[data-et]"` |
| `loggedIn` | `boolean` | User login status | Optional |
| `shouldConnect` | `boolean` | Control connection state | `true` |

#### ElementTracker

| Prop | Type | Description | Default |
|------|------|-------------|---------|
| `onReport` | `function` | Callback for visibility reports | Optional |
| `updateHash` | `boolean` | Update URL hash based on visible elements | `false` |

## Deployment

### Using Docker

```bash
# Build server image
cd server
yarn docker:build

# Push to registry
yarn docker:push
```

### Docker Compose

```yaml
version: "3"
services:
  mongodb:
    image: mongo:6.0.8
    volumes:
      - mongodb_data:/data/db
    ports:
      - 27017:27017
  
  tracker-server:
    image: cs124/element-tracker:latest
    environment:
      - MONGODB=mongodb://mongodb:27017/elementTracker
      - GOOGLE_CLIENT_IDS=${GOOGLE_CLIENT_IDS}
      - VALID_DOMAINS=${VALID_DOMAINS}
      - SECRET=${SECRET}
    ports:
      - 8080:8000
    depends_on:
      - mongodb

volumes:
  mongodb_data:
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure all checks pass before submitting:

```bash
yarn checker
```