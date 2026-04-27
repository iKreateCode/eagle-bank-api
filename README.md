# Eagle Bank API

A REST API for Eagle Bank built with Node.js, Express, TypeScript, and PostgreSQL via Prisma. Supports user registration, JWT authentication, and personal bank account management.

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express 5
- **Database:** PostgreSQL (via Prisma ORM + `@prisma/adapter-pg`)
- **Auth:** JSON Web Tokens (JWT)
- **Validation:** Zod
- **Testing:** Vitest + Supertest

## Prerequisites

- Node.js 18+
- Docker (for the PostgreSQL database)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the database

```bash
docker compose up -d
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://eagle_user:eagle_password@localhost:5432/eagle_bank
JWT_SECRET=your-secret-key-here
```

### 4. Run database migrations

```bash
npm run prisma:migrate
```

### 5. Start the development server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled production build |
| `npm test` | Run integration tests (single pass) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run prisma:migrate` | Apply database migrations |
| `npm run prisma:studio` | Open Prisma Studio (database browser) |

---

## API Overview

All authenticated endpoints require an `Authorization: Bearer <token>` header. Tokens are obtained via the login endpoint.

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Server health check |

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/v1/auth/login` | No | Login and receive a JWT token |

### Users

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/v1/users` | No | Create a new user |
| GET | `/v1/users/:userId` | Yes | Get user by ID |
| PATCH | `/v1/users/:userId` | Yes | Partially update a user |
| DELETE | `/v1/users/:userId` | Yes | Delete a user |

> Users can only access and modify their own account. A user cannot be deleted while they have open bank accounts.

### Accounts

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/v1/accounts` | Yes | Create a bank account |
| GET | `/v1/accounts` | Yes | List all accounts for the authenticated user |
| GET | `/v1/accounts/:accountNumber` | Yes | Get a single account |
| PATCH | `/v1/accounts/:accountNumber` | Yes | Partially update an account |
| DELETE | `/v1/accounts/:accountNumber` | Yes | Delete an account |

Account numbers are 8 digits in the format `01XXXXXX`. The default sort code is `10-10-10` and the currency is `GBP`.

---

## Request & Response Examples

### Create a user

```http
POST /v1/users
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "securepass",
  "phoneNumber": "+447911123456",
  "address": {
    "line1": "123 High Street",
    "town": "London",
    "county": "Greater London",
    "postcode": "EC1A 1BB"
  }
}
```

**Phone number** must be in [E.164 format](https://en.wikipedia.org/wiki/E.164) (e.g. `+447911123456`).

### Login

```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "jane@example.com",
  "password": "securepass"
}
```

```json
{ "token": "eyJhbGci..." }
```

### Create an account

```http
POST /v1/accounts
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Current Account",
  "accountType": "personal"
}
```

---

## Error Responses

Validation errors return a `400` with a `details` array:

```json
{
  "message": "Invalid request body",
  "details": [
    {
      "field": "email",
      "message": "Invalid email",
      "type": "invalid_string"
    }
  ]
}
```

All other errors return a simple `message`:

```json
{ "message": "Invalid credentials" }
```

---

## Running Tests

Tests are integration tests that run against a real database. Make sure the database is running and your `.env` file is configured before running them.

```bash
npm test
```

Tests automatically clean the database between each test using `beforeEach` hooks, so they are safe to run repeatedly without side effects.

---

## API Reference

The full OpenAPI 3.1 specification is available at [openapi.yaml](openapi.yaml).

## Postman Collection

Import [eagle-bank-api.postman_collection.json](eagle-bank-api.postman_collection.json) into Postman for a ready-to-use collection with automatic token and ID capture.
