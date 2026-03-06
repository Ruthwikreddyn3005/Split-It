# SplitIt

**Live Demo:** https://split-it-hazel.vercel.app

A full-stack expense splitting web app — split bills with friends and groups, track balances, and settle up easily.

## Features

- **Groups** — create groups, add members, split expenses equally, by exact amount, or by percentage
- **Friends** — split expenses directly with individual friends (no group needed)
- **Balances** — automatic balance computation with debt simplification
- **Settle Up** — record payments per expense or in bulk; undo from history
- **Activity** — full audit log of expenses and settlements
- **Auth** — JWT-based auth with email verification, forgot password, and refresh tokens
- **Dark / Light mode** — theme saved to your account

## Tech Stack

**Frontend:** React 18, Vite, React Router v6, Axios

**Backend:** Node.js, Express 4, MongoDB, Mongoose

**Auth:** JWT (httpOnly cookies, access + refresh token rotation)

**Email:** Nodemailer (Gmail SMTP)

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Setup

```bash
# Clone the repo
git clone https://github.com/Ruthwikreddyn3005/Split-It.git
cd Split-It/splitit

# Install server dependencies
cd server && npm install

# Copy and fill in environment variables
cp .env.example .env

# Install client dependencies
cd ../client && npm install
```

### Environment Variables

Create `server/.env` based on `server/.env.example`:

```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_ACCESS_SECRET=your_secret
JWT_REFRESH_SECRET=your_secret
FRONTEND_URL=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=SplitIt <your@gmail.com>
```

### Run

```bash
# From the splitit/ root
npm run dev
```

This starts both the server (port 5000) and client (port 5173) concurrently.

## Project Structure

```
splitit/
├── client/          # React + Vite frontend
│   └── src/
│       ├── api/         # Axios API calls
│       ├── components/  # Layout, modals
│       ├── context/     # Auth, Theme, Toast
│       ├── pages/       # All page components
│       └── utils/       # Formatters, split calculator
└── server/          # Express backend
    └── src/
        ├── controllers/ # Route handlers
        ├── models/      # Mongoose schemas
        ├── routes/      # Express routers
        ├── services/    # Balance computation
        └── utils/       # Helpers
```

## License

Copyright (c) 2025 Ruthwik Reddy. All rights reserved.
