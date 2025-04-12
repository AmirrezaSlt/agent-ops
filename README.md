# AgentOps - AI Agent Management Platform

A Django application with Vue.js frontend for managing AI Agents.

## Features

- List, create, and delete AI agents
- Django 5.1.7 backend with Django REST Framework
- Vue.js 3 frontend with Tailwind CSS
- PostgreSQL database for data storage
- Nginx for routing

## Architecture

- **Backend**: Django 5.1.7 with Django REST Framework
- **Frontend**: Vue.js 3 with Vite and Tailwind CSS
- **Database**: PostgreSQL 16
- **Web Server**: Nginx 1.25.3
- **Deployment**: Docker and Docker Compose

## Prerequisites

- Docker and Docker Compose

## Getting Started

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/agent-ops.git
   cd agent-ops
   ```

2. Start the application:
   ```bash
   docker-compose up
   ```

3. Access the application:
   - Frontend: http://localhost:9080/agent-ops/
   - API: http://localhost:9080/agent-ops/api/
   - Django Admin: http://localhost:9080/agent-ops/admin/
     - Username: admin
     - Password: admin

## Development

### Backend

- Django models are in `backend/agentops/agents/models.py`
- API endpoints are in `backend/agentops/agents/views.py`
- API serializers are in `backend/agentops/agents/serializers.py`

### Frontend

- Vue components are in `frontend/src/components/`
- Views are in `frontend/src/views/`
- State management is in `frontend/src/store/`

## Testing

### Backend Tests

Run Django tests:

```bash
docker-compose exec backend python manage.py test
```

### Frontend Tests

Run Vue.js tests:

```bash
docker-compose exec frontend npm run test
```

Run Vue.js tests in watch mode:

```bash
docker-compose exec frontend npm run test:watch
```

### Test Coverage

The application includes the following tests:

#### Backend Tests
- Model tests: Verify the Agent model works properly
- API tests: Verify the RESTful endpoints for CRUD operations

#### Frontend Tests
- Component tests: Verify the Vue components render correctly
- Store tests: Verify the Pinia state management works correctly

## API Endpoints

- **GET /agent-ops/api/agents/** - List all agents
- **POST /agent-ops/api/agents/** - Create a new agent
- **GET /agent-ops/api/agents/{id}/** - Get a specific agent
- **PUT /agent-ops/api/agents/{id}/** - Update a specific agent
- **DELETE /agent-ops/api/agents/{id}/** - Delete a specific agent 