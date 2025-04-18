# Agent-Ops

A modern web application for conversational AI agent operations with Django backend, React frontend, and supporting services for data storage.

## Project Overview

Agent-Ops provides a platform for managing AI agents, conversations and messages. The application allows users to:

- Create and manage AI agents with specific roles
- Initiate conversations with agents
- View conversation history
- Interact with agents via chat interface

## Project Structure

```
agent-ops/
├── backend/                       # Django application
│   ├── agentops/                  # Main Django project
│   │   ├── agents/                # Django app for agent operations
│   │   │   ├── models.py          # Data models (Agent, Conversation, Message)
│   │   │   ├── serializers.py     # DRF serializers
│   │   │   ├── views.py           # API views
│   │   │   ├── urls.py            # URL routing
│   │   │   └── services/          # Business logic services
│   │   ├── settings.py            # Django configuration
│   │   └── urls.py                # Main URL configuration
│   ├── storage/                   # Storage handling app
│   ├── staticfiles/               # Collected static files
│   ├── Dockerfile                 # Backend container definition
│   ├── requirements.txt           # Python dependencies
│   ├── manage.py                  # Django management script
│   └── entrypoint.sh              # Container entrypoint
├── frontend/                      # React application
│   ├── src/                       # React source code
│   │   ├── api/                   # API integration
│   │   │   ├── endpoints/         # API endpoint clients
│   │   │   └── config/            # API configuration
│   │   ├── components/            # Reusable UI components
│   │   ├── pages/                 # Page components (AgentList, ChatView)
│   │   ├── utils/                 # Utility functions
│   │   ├── services/              # Frontend services
│   │   ├── store/                 # State management
│   │   ├── hooks/                 # Custom React hooks
│   │   └── App.jsx                # Main application component
│   ├── public/                    # Public assets
│   ├── Dockerfile                 # Frontend container definition
│   ├── package.json               # Node.js dependencies
│   └── vite.config.js             # Vite configuration
├── data/                          # Persistent data storage
│   ├── postgres/                  # PostgreSQL data
│   └── minio/                     # MinIO object storage
├── nginx.conf                     # Nginx configuration
└── docker-compose.yml             # Docker services definition
```

## Architecture

### Backend

- **Framework**: Django with Django REST Framework
- **Database**: PostgreSQL for relational data
- **Object Storage**: MinIO for file storage
- **API Pattern**: RESTful API with JSON serialization
- **Models**:
  - `Agent`: Represents an AI agent with name, role, and endpoint configuration
  - `Conversation`: Represents a chat session with an agent
  - `Message`: Individual messages within a conversation

### Frontend

- **Framework**: React 18 with React Router 6
- **UI Library**: Material-UI (MUI)
- **HTTP Client**: Axios for API communication
- **State Management**: Zustand
- **Styling**: Tailwind CSS + MUI theming
- **Markdown**: React Markdown with remark-gfm for rich text display
- **Testing**: Vitest + React Testing Library

### Infrastructure

- **Containerization**: Docker with multi-container orchestration via Docker Compose
- **Web Server**: Nginx as reverse proxy and static file server
- **Development**: Hot-reloading for both frontend and backend

## API Overview

The backend provides a RESTful API with the following key endpoints:

- `/api/agents/` - CRUD operations for agents
- `/api/conversations/` - Manage conversations
- `/api/conversations/{id}/messages/` - Access and create messages in a conversation

## Development Setup

### Prerequisites

- Docker and Docker Compose

### Getting Started

1. Clone the repository:
   ```
   git clone <repository-url>
   cd agent-ops
   ```

2. Start the development environment:
   ```
   docker-compose up -d
   ```

3. Access the application:
   - Frontend: http://localhost:9080
   - API: http://localhost:9080/agent-ops/api
   - Django Admin: http://localhost:9080/agent-ops/admin
   - MinIO Console: http://localhost:9001 (credentials: minio/minio123)

### Development Workflow

- The application is set up with hot-reloading for both frontend and backend
- Backend code changes will be automatically applied
- Frontend code changes will be automatically applied through Vite's dev server

## Environment Variables

### Backend

- `DATABASE_URL`: PostgreSQL connection string
- `DEBUG`: Enable/disable debug mode
- `SECRET_KEY`: Django secret key
- `ALLOWED_HOSTS`: Allowed hosts for Django
- `BASE_PATH`: Base URL path (defaults to /agent-ops)
- `MINIO_ENDPOINT`: MinIO server hostname
- `MINIO_PORT`: MinIO server port
- `MINIO_ACCESS_KEY`: MinIO access key
- `MINIO_SECRET_KEY`: MinIO secret key
- `MINIO_BUCKET`: MinIO default bucket
- `MINIO_USE_SSL`: Whether to use SSL for MinIO

### Frontend

- `VITE_API_BASE_URL`: Backend API URL

## Useful Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for a specific service
docker-compose logs -f backend

# Restart a specific service
docker-compose restart <service-name>

# Stop all services
docker-compose down

# Create database migrations
docker-compose exec backend python manage.py makemigrations

# Apply migrations
docker-compose exec backend python manage.py migrate

# Create superuser
docker-compose exec backend python manage.py createsuperuser

# Run backend tests
docker-compose exec backend python manage.py test

# Run frontend tests
docker-compose exec frontend npm test
```

## Adding New Features

### Backend

#### Adding a New Model

1. Define the model in the appropriate app's `models.py`
2. Create a serializer in `serializers.py`
3. Add viewsets or views in `views.py`
4. Register URLs in `urls.py`
5. Create migrations: `docker-compose exec backend python manage.py makemigrations`
6. Apply migrations: `docker-compose exec backend python manage.py migrate`

#### Adding Business Logic

Place business logic in the `services/` directory to keep views clean and focused on request/response handling.

### Frontend

#### Adding a New Page

1. Create a new page component in `src/pages/`
2. Add routing in `App.jsx`
3. If needed, create API clients in `src/api/endpoints/`

#### Adding a New Component

1. Create the component in `src/components/`
2. Use React hooks for state management
3. Follow the existing styling patterns (MUI + Tailwind)

#### State Management

- Use Zustand for global state
- Use React hooks (useState, useContext) for component-level state

## Testing

- Backend: Django's test framework
- Frontend: Vitest with React Testing Library

## Deployment

The application is containerized and can be deployed to any environment that supports Docker. For production:

1. Update environment variables with production values
2. Set `DEBUG=False` in Django settings
3. Use a proper reverse proxy setup (nginx configuration included)
4. Ensure proper security measures for MinIO and PostgreSQL

## Troubleshooting

### Common Issues

- PostgreSQL connection errors: Ensure the database is running and accessible
- MinIO access issues: Check credentials and endpoint configuration
- Frontend API connection issues: Verify the `VITE_API_BASE_URL` environment variable

### Debugging

- Check container logs: `docker-compose logs -f <service-name>`
- Inspect Django logs in the backend container
- Use browser developer tools for frontend issues

## Running Tests

This project includes comprehensive test coverage for its REST API endpoints. Here's how to run the tests using Docker Compose:

### Quick Start

```bash
# Run all tests in a fresh Docker environment
./run_backend_tests.sh

# Run tests in an existing environment (faster if containers are already running)
./run_backend_tests.sh --use-existing

# Generate coverage report only
./run_backend_tests.sh --coverage
```

### Test Environment

The test suite uses a dedicated Docker Compose configuration (`docker-compose.test.yml`) that includes:

- PostgreSQL database
- MinIO object storage
- Django backend test container

### Test Coverage

Tests cover the following API endpoints:

1. **Agents API** - CRUD operations for agent management
2. **Chat API** - Conversations and chat completion functionality
3. **Storage API** - File storage operations with MinIO

### Running Specific Tests

To run specific tests, you can use the `--use-existing` flag and specify the test path:

```bash
# Start the test environment
docker-compose -f docker-compose.test.yml up -d

# Run specific tests
docker-compose -f docker-compose.test.yml exec backend-test python manage.py test agentops.agents.tests.test_views

# Clean up when done
docker-compose -f docker-compose.test.yml down
```
