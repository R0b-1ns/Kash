# Authentication API

Base URL: `/api/v1/auth`

## Endpoints

### POST /register

Creates a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Errors:**

| Code | Description |
|------|-------------|
| 400 | Email already registered |
| 422 | Invalid data |

---

### POST /login

Authenticates a user and returns a JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

**Errors:**

| Code | Description |
|------|-------------|
| 401 | Incorrect email or password |
| 422 | Invalid data |

---

### GET /me

Retrieves information about the logged-in user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):</b>
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Errors:**

| Code | Description |
|------|-------------|
| 401 | Invalid or expired token |

---

## JWT Authentication

### Token Format

JWT tokens are signed with the HS256 algorithm and contain:

```json
{
  "sub": "user@example.com",
  "exp": 1705320000
}
```

- `sub`: User email
- `exp`: Expiration timestamp (7 days by default)

### Usage

Include the token in the `Authorization` header:

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
     http://localhost:8000/api/v1/auth/me
```

### Expiration

Tokens expire after 7 days (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`).

When a token expires, the API returns a 401 error and the client must re-authenticate.
