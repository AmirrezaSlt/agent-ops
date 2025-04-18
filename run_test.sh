#!/bin/bash

# Run all tests in the backend container
docker compose exec backend python manage.py test 