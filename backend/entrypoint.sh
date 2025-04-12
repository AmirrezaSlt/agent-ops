#!/bin/bash

# Wait for database to be ready
echo "Waiting for PostgreSQL..."
until PGPASSWORD=postgres psql -h "db" -U "postgres" -c '\q'; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "PostgreSQL is up - executing command"

# Apply database migrations
python manage.py migrate

# Create superuser if it doesn't exist
python manage.py shell -c "
from django.contrib.auth import get_user_model;
User = get_user_model();
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin');
"

# Collect static files
python manage.py collectstatic --noinput

# Start server
exec "$@" 