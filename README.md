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
```

The application code is in `medical-monitoring-platform`.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- Google OAuth credentials for Google sign-in

## Run locally

Open two terminals from the repository root.

### 1. Configure environment variables

Copy the example files:

```powershell
Copy-Item medical-monitoring-platform\server\.env.example medical-monitoring-platform\server\.env
Copy-Item medical-monitoring-platform\client\.env.example medical-monitoring-platform\client\.env
```

Fill in the blank values. Generate a unique `SESSION_SECRET` and `DEVICE_API_KEY`; set both demo passwords to private values at least 8 characters long. Set the same device key in the server's `DEVICE_API_KEY` and the client's `VITE_DEVICE_API_KEY`.

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in the server file and the matching `VITE_GOOGLE_CLIENT_ID` in the client file. `VITE_API_URL` may be left blank for local development; it defaults to `http://localhost:5000`.

In the Google Cloud OAuth client settings, allow this authorized JavaScript origin:

```text
http://localhost:5173
```

And this authorized redirect URI:

```text
http://localhost:5000/auth/google/callback
```

Keep the real `.env` files private; they are excluded from Git.
The `VITE_DEVICE_API_KEY` is included in browser code and is not a secret for production deployments. For production, send device traffic through a trusted server-side service instead of exposing a shared key in the browser.

### 2. Start the backend

```powershell
cd medical-monitoring-platform/server
npm ci
npm run dev
```

The API and Socket.IO server run at `http://localhost:5000`. On first startup, the server initializes the SQLite schema and sample records.
The demo accounts use `doctor@medical.org` for the doctor portal and `john@patient.org` or `jane@patient.org` for the patient portal. Use the corresponding demo passwords from the server `.env` file.

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
