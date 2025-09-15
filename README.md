# Preference Center API (NestJS)

A production-ready REST API for managing users and their consent preferences (email/SMS).
Tech stack: NestJS, TypeORM, PostgreSQL, Redis (cache), Swagger/OpenAPI, Jest, Docker Compose.

# Quick start (Docker)
0) Prereqs

Docker Desktop / Docker Engine (Compose v2)

Port 3000 (API), 5432 (Postgres), 6379 (Redis) available

1) Clone & create .env

Create a single .env at the repo root:

# App
PORT=3000
GLOBAL_PREFIX=api

# DB (host-run uses localhost; the api container will override DB_HOST to 'postgres')
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=preference_center_db

TYPEORM_LOGGING=true
TYPEORM_SYNCHRONIZE=true
DB_POOL_MAX=10

# Redis (host-run uses localhost; the api container will override REDIS_HOST to 'redis')
REDIS_HOST=localhost
REDIS_PORT=6379

# Cache TTLs (seconds)
CONSENT_TYPE_TTL_SEC=3600
USER_STATE_TTL_SEC=300

# Rate limit for /events (per client IP)
RL_EVENTS_LIMIT=30
RL_EVENTS_TTL_SEC=60


TYPEORM_SYNCHRONIZE=true is for dev. For production, use migrations and set it to false.

2) Seed script (first-time DB initialization)

Ensure you have this file (already included in the repo structure):

init/01_seed_consent_types.sql


Content (idempotent):

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS consent_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) UNIQUE NOT NULL,
  name VARCHAR(160),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO consent_types (slug, name) VALUES ('email_notifications','Email notifications') ON CONFLICT (slug) DO NOTHING;
INSERT INTO consent_types (slug, name) VALUES ('sms_notifications','SMS notifications') ON CONFLICT (slug) DO NOTHING;

3) Start the stack

From the repo root (where docker-compose.yml and .env live):

docker compose up -d --build
docker compose logs -f api


Compose services:

postgres (PostgreSQL 16)

redis (Redis 7, allkeys-lru, maxmemory 256MB)

api (NestJS)

The API becomes available at:
http://localhost:3000/api

4) API docs (Swagger)

UI: http://localhost:3000/api/docs

JSON: http://localhost:3000/api/docs/json


# Architecture
# Core domain

User (users): identified by unique email.

ConsentType (consent_types): catalog of consent channels (e.g., email_notifications, sms_notifications).

ConsentEvent (consent_events): append-only log of user changes. Each row links a user + a consent type + enabled + timestamps.

Current consent state for a user is computed by applying the latest event per consent type.

API (required routes)

GET /api/users?page&limit — paginated users + their current consent state.

POST /api/users — create a user { email }. Enforces unique valid email.

DELETE /api/users/:id — delete a user.

POST /api/events — create one or more consent change events:

{
  "user": {"id": "UUID"},
  "consents": [
    {"id": "email_notifications", "enabled": true},
    {"id": "sms_notifications", "enabled": false}
  ]
}


Validates user exists (404).

Validates consent type slugs exist (422).

Caching (Redis, cache-aside)


Rate limiting

@nestjs/throttler v5 (env-driven) globally configured, guard applied only to EventsModule:

Defaults: RL_EVENTS_LIMIT=30 per RL_EVENTS_TTL_SEC=60.

POST /events may have a stricter @Throttle({ ttl: 60, limit: 10 }) override.

Intended to protect DB/cache from abusive write spikes.

Horizontal scalability

Stateless API containers (no local state).

Shared Redis for cache and invalidation across replicas.

Shared Postgres for persistence (recommend pgbouncer in front at higher scale).

For production: use migrations and set TYPEORM_SYNCHRONIZE=false.

Running locally without Docker (optional)
# 1) Start only Postgres & Redis
docker compose up -d postgres redis

# 2) Install & run the API on your host
npm install
npm run start:dev

# API
open http://localhost:3000/api/docs


Testing
Unit tests
npm run test
# or with coverage:
npm run test:cov

# Create a user
curl -s -X POST http://localhost:3000/api/users \
  -H 'content-type: application/json' \
  -d '{"email":"john.doe@example.com"}'

# Create consent change events
USER_ID="<paste-id>"
curl -s -X POST http://localhost:3000/api/events \
  -H 'content-type: application/json' \
  -d "{\"user\":{\"id\":\"$USER_ID\"},\"consents\":[{\"id\":\"email_notifications\",\"enabled\":true}]}"

curl -s -X POST http://localhost:3000/api/events \
  -H 'content-type: application/json' \
  -d "{\"user\":{\"id\":\"$USER_ID\"},\"consents\":[{\"id\":\"email_notifications\",\"enabled\":false},{\"id\":\"sms_notifications\",\"enabled\":true}]}"

Security & prod notes

Add authentication/authorization (e.g., JWT) before exposing publicly.

Consider idempotency on write endpoints and request size limits.

Add pgbouncer (or an RDS proxy) for connection pooling at scale.


Observability: add request logging, metrics, and tracing (e.g., OpenTelemetry) as needed.


