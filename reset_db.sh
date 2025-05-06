#!/bin/bash

echo "⚠️  WARNING: This will DELETE all data and reset your database and migrations!"
read -p "Are you sure? (y/n): " confirm
if [[ "$confirm" != "y" ]]; then
    echo "Aborted."
    exit 1
fi

echo "🔄 Dropping PostgreSQL DB..."
# Make sure your .env DATABASE_URL contains dbname, user, password, host
DB_NAME=$(python -c "from decouple import config; import dj_database_url; print(dj_database_url.parse(config('DATABASE_URL'))['NAME'])")
DB_USER=$(python -c "from decouple import config; import dj_database_url; print(dj_database_url.parse(config('DATABASE_URL'))['USER'])")

dropdb "$DB_NAME" -U "$DB_USER"
createdb "$DB_NAME" -U "$DB_USER"

echo "🧹 Removing migrations and __pycache__..."
find . -path "*/migrations/*.py" -not -name "__init__.py" -delete
find . -path "*/migrations/*.pyc"  -delete
find . -type d -name "__pycache__" -exec rm -r {} +

echo "⚙️  Recreating migrations..."
python manage.py makemigrations
python manage.py migrate

echo "✅ Database and migrations reset successfully."
