# Dynamic Form Builder (Frontend + Backend)

A full-stack dynamic form builder with an admin dashboard, public form rendering, file upload support, and CSV export of submissions.

## Tech Stack

- Frontend: Vite, React, TypeScript, Tailwind CSS, shadcn-ui, React Router, TanStack Query
- Backend: Node.js, Express, MongoDB (Mongoose), Socket.IO, Multer, json2csv

## Architecture

The app is split into a React SPA frontend and an Express API backend with MongoDB. Files uploaded via forms are stored on the server’s filesystem and served statically.

```mermaid
flowchart LR
  subgraph Browser [Browser]
    UI[React SPA]\nVite build
  end

  subgraph Frontend
    UI -->|REST / WebSocket| APIClient
  end

  APIClient -->|HTTP /api/*| API[(Express API)]

  subgraph Backend
    API --> Auth[Admin Auth (Bearer Token)]
    API --> Forms[Forms Controller]
    API --> Subs[Submissions Controller]
    API --> Uploads[/uploads static/]
    Subs --> Multer[Multer File Storage]
    API <--> WS[(Socket.IO)]
    Forms --> DB[(MongoDB)]
    Subs --> DB
  end

  Uploads --> Static[Static File Server]
```

## Features

- Admin dashboard with protected routes
- Create, edit, reorder, and manage forms (including file field type)
- Public form rendering at `/form/:id`
- File uploads stored under `backend/uploads/forms/<formId>` and accessible via `/uploads/...`
- CSV export of submissions per form (admin-only)
- Real-time updates with Socket.IO for form changes

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or Docker)

### 1) Install dependencies

```bash
# in project root (frontend)
npm install

# backend
cd backend
npm install
```

### 2) Configure environment

Frontend `.env` (optional):
```
VITE_API_URL=http://localhost:5000
VITE_ADMIN_TOKEN=your-admin-token   # optional; used for local testing
```

Backend `.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/formbuilder
ADMIN_TOKEN=your-secret-admin-token
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

### 3) Run

```bash
# terminal 1 (backend)
cd backend
npm run dev

# terminal 2 (frontend, project root)
npm run dev
```

Frontend default: http://localhost:5173  
Backend default: http://localhost:5000

## File Uploads

- Submissions accept multipart form data.
- Files are stored on disk under `backend/uploads/forms/<formId>`.
- Stored file metadata (url, path, originalName, size, mimeType) is attached into the submission answers.

## CSV Export

- Admin can export submissions with a button in the dashboard.
- Route: `GET /api/submissions/:formId/export` (requires Authorization header).

## Scripts

Frontend:
```bash
npm run dev      # start frontend
npm run build    # build
npm run preview  # preview build
```

Backend:
```bash
cd backend
npm run dev      # start with nodemon
npm start        # production
```

## License

MIT
