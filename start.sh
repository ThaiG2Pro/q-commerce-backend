#!/bin/sh
set -e

# Set default HOST and PORT
export HOST=${HOST:-0.0.0.0}
export PORT=${PORT:-9000}

echo "🚀 Starting Medusa application..."
echo "   HOST: $HOST"
echo "   PORT: $PORT"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL is not set"
    echo "   Please set DATABASE_URL environment variable in Render dashboard"
    exit 1
fi

echo "✓ DATABASE_URL is configured"

# Run migrations with timeout and better error handling
echo "📦 Running database migrations..."
if timeout 120 pnpm exec medusa db:migrate; then
    echo "✓ Migrations completed successfully"
else
    MIGRATION_EXIT_CODE=$?
    echo "⚠️  Migration failed with exit code: $MIGRATION_EXIT_CODE"
    
    # If migrations fail, try to start anyway (migrations might already be applied)
    echo "⚠️  Attempting to start server anyway (migrations may already be applied)"
fi

# Start the Medusa server
echo "🌐 Starting Medusa server on $HOST:$PORT..."
exec pnpm exec medusa start
