# Clinical Decision Support

A web-based medical monitoring demo for viewing patient information, tracking vital signs, and reviewing monitoring alerts. The main application uses a React frontend and an Express API with SQLite and Socket.IO.

> **Important:** This project is for demonstration and educational use. It is not a medical device and must not be used to diagnose, treat, or monitor real patients.

## Features

- Patient dashboard and patient detail pages
- Medical history, appointments, and shared records views
- Google OAuth sign-in
- SQLite database initialization with sample data
- Real-time vital-sign ingestion and monitoring alerts
- Socket.IO messaging and a mock device data generator

## Project structure

```text
medical-monitoring-platform/
  client/   React, Vite, and Tailwind frontend
  server/   Express, Socket.IO, and SQLite backend
sk-hospital/ Separate Express/MongoDB Google OAuth prototype
```

The instructions below run the main application in `medical-monitoring-platform`. The `sk-hospital` folder is a separate prototype and is not required.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- Google OAuth credentials for Google sign-in

## Run locally

Open two terminals from the repository root.

### 1. Configure Google OAuth

Create `medical-monitoring-platform/server/.env`:

```env
PORT=5000
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

Create `medical-monitoring-platform/client/.env`:

```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

In the Google Cloud OAuth client settings, allow this authorized JavaScript origin:

```text
http://localhost:5173
```

And this authorized redirect URI:

```text
http://localhost:5000/auth/google/callback
```

Keep the real `.env` files private; they are excluded from Git.

### 2. Start the backend

```powershell
cd medical-monitoring-platform/server
npm ci
npm run dev
```

The API and Socket.IO server run at `http://localhost:5000`. On first startup, the server initializes the SQLite schema and sample records.

### 3. Start the frontend

In a second terminal:

```powershell
cd medical-monitoring-platform/client
npm ci
npm run dev
```

Open `http://localhost:5173`.

## Optional: simulate device readings

With the backend running, use another terminal:

```powershell
cd medical-monitoring-platform/server
node src/scripts/mock-device.js
```

The script periodically posts simulated vital readings to the local API. Stop it with `Ctrl+C`.

## Useful commands

Run these from the appropriate `client` or `server` directory:

| Directory | Command | Description |
| --- | --- | --- |
| `client` | `npm run dev` | Start the Vite development server |
| `client` | `npm run build` | Create a production frontend build |
| `client` | `npm run lint` | Run ESLint |
| `client` | `npm run preview` | Preview a production build |
| `server` | `npm run dev` | Start the backend with nodemon |
| `server` | `npm start` | Start the backend |

## Separate `sk-hospital` prototype

`sk-hospital` is an independent Express/Passport application that uses MongoDB. It has its own dependencies and configuration and also defaults to port `5000`, so do not run it at the same time as the main application's backend unless you configure a different port.
