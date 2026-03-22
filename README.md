# LiveChat Platform

A modern, full-stack live chat platform that allows website owners to embed a chat widget on their sites and communicate with visitors in real-time through an operator dashboard.

## Features
- **Real-Time Messaging**: Built on WebSockets (Socket.IO) for instant communication.
- **File Uploads**: Support for images and files in both widget and dashboard.
- **Multiple Projects**: Create and manage multiple chat widgets for different websites from a single dashboard.
- **Quick Replies**: Save time with canned responses and shortcuts (e.g., typing `/` in the chat).
- **Visitor Tracking**: Tracks visitor data including country, device, referral source, etc.
- **Typing Indicators**: Shows when the other party is typing.
- **Customizable Widget**: Customize the appearance of the chat widget per project.
- **Offline Mode**: Collect visitor emails and messages when no operators are online.

## Project Structure
This repository contains a monorepo setup with three main components:

- **`/backend`**: Node.js, Express, Socket.IO, and Prisma (SQLite by default). Provides REST API endpoints and real-time socket connections.
- **`/dashboard`**: React (Vite), TailwindCSS, Zustand. The control panel where operators can manage settings, chat with visitors, and configure quick replies.
- **`/widget`**: Vanilla TypeScript (custom web component). The lightweight chat widget that is embedded on external websites.

## Prerequisites
- Node.js (v18 or higher recommended)
- npm

## Installation & Setup

### 1. Backend Setup
```bash
cd backend
npm install

# Create a .env file and set PORT, DATABASE_URL, and JWT_SECRET
# Example:
# PORT=4001
# DATABASE_URL="file:./dev.db"
# JWT_SECRET="your_secret_key"

# Generate Prisma Client and Push DB Schema
npm run prisma:generate
npm run prisma:push

# Start the development server
npm run dev
```

### 2. Dashboard Setup
```bash
cd dashboard
npm install

# Configure API proxy inside vite.config.ts if your backend is on a different port.
# Start the development server
npm run dev
```

### 3. Widget Setup
```bash
cd widget
npm install

# Start the widget development environment
npm run dev
```

## Running the Application
By default:
- Backend API runs on `http://localhost:4001`
- Operator Dashboard runs on `http://localhost:5173`
- Widget Dev Server runs on `http://localhost:5174` (or whatever Vite assigns)

To embed the widget on an external site, you would typically build the `/widget` project to output a bundled script, and then include it on your site using the provided project script tag.

## Security: Media-Origin Isolation

Uploaded files are served from a dedicated media origin, not from backend/dashboard origin.

- `MEDIA_BASE_URL`: public base URL for file links returned by upload API (example: `https://media.example.com`)
- `ENFORCE_MEDIA_ORIGIN`: when `true` (default in docker-compose), backend fails fast if `MEDIA_BASE_URL` is missing

In Docker setup, the `media` service serves `/uploads/*` from a shared read-only volume mounted from backend uploads storage.

Example local media URL:

- `http://localhost:8080/uploads/<filename>`

## Tech Stack
- **Backend:** Node.js, Express, Prisma ORM, Socket.IO, Multer, bcrypt, jsonwebtoken.
- **Frontend (Dashboard):** React 19, Vite, Tailwind CSS v4, Zustand, React Router v7, Axios.
- **Frontend (Widget):** Vanilla TypeScript, Web Components (Shadow DOM), Socket.IO client.
