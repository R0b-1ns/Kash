# API Authentification

Base URL: `/api/v1/auth`

## Endpoints

### POST /register

Crée un nouveau compte utilisateur.

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

**Erreurs:**

| Code | Description |
|------|-------------|
| 400 | Email déjà utilisé |
| 422 | Données invalides |

---

### POST /login

Authentifie un utilisateur et retourne un token JWT.

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

**Erreurs:**

| Code | Description |
|------|-------------|
| 401 | Email ou mot de passe incorrect |
| 422 | Données invalides |

---

### GET /me

Récupère les informations de l'utilisateur connecté.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Erreurs:**

| Code | Description |
|------|-------------|
| 401 | Token invalide ou expiré |

---

## Authentification JWT

### Format du token

Les tokens JWT sont signés avec l'algorithme HS256 et contiennent :

```json
{
  "sub": "user@example.com",
  "exp": 1705320000
}
```

- `sub` : Email de l'utilisateur
- `exp` : Timestamp d'expiration (7 jours par défaut)

### Utilisation

Inclure le token dans le header `Authorization` :

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
     http://localhost:8000/api/v1/auth/me
```

### Expiration

Les tokens expirent après 7 jours (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`).

Lorsqu'un token expire, l'API retourne une erreur 401 et le client doit redemander une authentification.
