# Form Builder Backend API

Node.js + Express + MongoDB backend for dynamic form builder application.

## Architecture

```mermaid
flowchart TB
  Client[(Admin UI / Public Forms)] -->|HTTP /api/*| API[Express API]
  API --> Forms[Forms Controller]
  API --> Subs[Submissions Controller]
  API --> Auth[Admin Token Middleware]
  Subs --> Multer[Multer Disk Storage]
  API <--> WS[(Socket.IO)]
  Forms --> DB[(MongoDB)]
  Subs --> DB
  Subs -->|/uploads/forms/:formId/*| Static[/Static Files/]
```

## Features

✅ **Form Management**
- Create, read, update, delete forms
- Field management with validation rules
- Support for conditional/nested fields
- Form versioning for historical submissions
- Drag-and-drop field reordering

✅ **Field Types**
- Text, Textarea, Number, Email, Date
- Checkbox (multi-select)
- Radio buttons (single-select)
- Select dropdown
- File upload support

✅ **Submissions**
- Server-side validation
- IP tracking and metadata
- Status management (pending/reviewed/archived)
- CSV export functionality
- Submission statistics

✅ **Security**
- Input sanitization
- Rate limiting
- CORS protection
- Helmet security headers
- JWT authentication ready
- MongoDB injection prevention

## Prerequisites

- Node.js 16+ and npm
- MongoDB 4.4+
- Git

## Installation

1. **Clone and navigate to backend folder:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and configure:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/formbuilder
ADMIN_TOKEN=your-secret-admin-token
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=http://localhost:8080
```

4. **Start MongoDB:**
```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod

# Windows
net start MongoDB

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

5. **Start the server:**

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

Server will run at `http://localhost:5000`

## API Endpoints

### Forms

#### Get All Forms (Admin)
```http
GET /api/forms
Authorization: Bearer <ADMIN_TOKEN>

Query params:
- status: draft|active|archived
- page: number (default: 1)
- limit: number (default: 10)
```

#### Get Single Form (Public)
```http
GET /api/forms/:id
```

#### Create Form (Admin)
```http
POST /api/forms
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "title": "Contact Form",
  "description": "Get in touch with us",
  "fields": [
    {
      "label": "Full Name",
      "type": "text",
      "name": "full_name",
      "required": true,
      "validation": {
        "minLength": 2,
        "maxLength": 100
      },
      "order": 0
    },
    {
      "label": "Email",
      "type": "email",
      "name": "email",
      "required": true,
      "order": 1
    }
  ]
}
```

#### Update Form (Admin)
```http
PUT /api/forms/:id
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "title": "Updated Form Title",
  "status": "active"
}
```

#### Delete Form (Admin)
```http
DELETE /api/forms/:id
Authorization: Bearer <ADMIN_TOKEN>
```

### Fields

#### Add Field to Form (Admin)
```http
POST /api/forms/:id/fields
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "label": "Phone Number",
  "type": "text",
  "name": "phone",
  "required": false,
  "validation": {
    "pattern": "^\\d{10}$",
    "customMessage": "Please enter a 10-digit phone number"
  },
  "order": 2
}
```

#### Update Field (Admin)
```http
PUT /api/forms/:id/fields/:fieldId
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "label": "Updated Label",
  "required": true
}
```

#### Delete Field (Admin)
```http
DELETE /api/forms/:id/fields/:fieldId
Authorization: Bearer <ADMIN_TOKEN>
```

#### Reorder Fields (Admin)
```http
PUT /api/forms/:id/reorder
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "fieldOrders": {
    "field_id_1": 0,
    "field_id_2": 1,
    "field_id_3": 2
  }
}
```

### Submissions

#### Submit Form (Public)
```http
POST /api/submissions/:id/submit
Content-Type: application/json

{
  "answers": {
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "country": "USA",
    "interests": ["Technology", "Sports"]
  }
}
```

#### Get Submissions (Admin)
```http
GET /api/submissions/:formId
Authorization: Bearer <ADMIN_TOKEN>

Query params:
- status: pending|reviewed|archived
- page: number
- limit: number
- sortBy: createdAt|status
- order: asc|desc
```

#### Get Single Submission (Admin)
```http
GET /api/submissions/:formId/:submissionId
Authorization: Bearer <ADMIN_TOKEN>
```

#### Update Submission Status (Admin)
```http
PATCH /api/submissions/:formId/:submissionId
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{
  "status": "reviewed"
}
```

#### Delete Submission (Admin)
```http
DELETE /api/submissions/:formId/:submissionId
Authorization: Bearer <ADMIN_TOKEN>
```

#### Export Submissions to CSV (Admin)
```http
GET /api/submissions/:formId/export
Authorization: Bearer <ADMIN_TOKEN>
```

#### Get Submission Statistics (Admin)
```http
GET /api/submissions/:formId/stats
Authorization: Bearer <ADMIN_TOKEN>
```

## Field Types & Validation

### Text & Textarea
```json
{
  "type": "text",
  "validation": {
    "minLength": 2,
    "maxLength": 100,
    "pattern": "^[A-Za-z\\s]+$",
    "customMessage": "Only letters allowed"
  }
}
```

### Number
```json
{
  "type": "number",
  "validation": {
    "min": 0,
    "max": 100
  }
}
```

### Select/Radio
```json
{
  "type": "select",
  "options": ["Option 1", "Option 2", "Option 3"],
  "conditionalFields": [
    {
      "showWhen": {
        "parentFieldName": "country",
        "parentFieldValue": "USA"
      },
      "label": "State",
      "type": "select",
      "name": "state",
      "options": ["CA", "NY", "TX"]
    }
  ]
}
```

### Checkbox
```json
{
  "type": "checkbox",
  "options": ["Choice 1", "Choice 2", "Choice 3"]
}
```

## Authentication

The API uses Bearer token authentication for admin endpoints.

**Setting the admin token:**
1. Set `ADMIN_TOKEN` in `.env` file
2. Include in requests: `Authorization: Bearer <ADMIN_TOKEN>`

**For production:** Implement JWT-based authentication using the provided `generateToken()` function.

## Testing

### Manual Testing with cURL

**Create a form:**
```bash
curl -X POST http://localhost:5000/api/forms \
  -H "Authorization: Bearer your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Form",
    "fields": [
      {
        "label": "Name",
        "type": "text",
        "name": "name",
        "required": true,
        "order": 0
      }
    ]
  }'
```

**Submit a form:**
```bash
curl -X POST http://localhost:5000/api/submissions/<FORM_ID>/submit \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "name": "John Doe"
    }
  }'
```

## Error Handling

API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

## Production Deployment

### Docker Deployment

**Create Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]
```

**Create docker-compose.yml:**
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
  
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/formbuilder
      - NODE_ENV=production
    depends_on:
      - mongodb

volumes:
  mongo-data:
```

**Run:**
```bash
docker-compose up -d
```

### Environment Variables (Production)

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/formbuilder
JWT_SECRET=<strong-random-secret>
ADMIN_TOKEN=<strong-random-token>
CORS_ORIGIN=https://your-frontend-domain.com
```

## Security Checklist

- ✅ Input validation and sanitization
- ✅ Rate limiting enabled
- ✅ CORS configured
- ✅ Helmet security headers
- ✅ MongoDB injection prevention
- ✅ No sensitive data in logs
- ⚠️ Replace basic token auth with proper JWT/OAuth
- ⚠️ Enable HTTPS in production
- ⚠️ Set strong JWT secret
- ⚠️ Implement role-based access control

## Troubleshooting

**MongoDB connection error:**
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
Solution: Ensure MongoDB is running (`mongod` service)

**Validation errors:**
Check that field names are lowercase with underscores only: `field_name`

**CORS errors:**
Update `CORS_ORIGIN` in `.env` to match your frontend URL

## License

MIT
