# EC2 Docker Blazor OAuth Setup Guide

This guide explains step-by-step how we set up a **Blazor frontend** with a **Node.js OAuth backend** on **AWS EC2**, using **Docker and Nginx**, including troubleshooting and production considerations. It is written for beginners to intermediates.

---

## 1. AWS EC2 Setup

- Created an **EC2 instance** on AWS for hosting the application.
- Configured **SSH access** using a private key (`oll1.pem`), stored in `~/.ssh`.
- Verified connectivity:
  ```bash
  ssh -i oll1.pem ubuntu@<EC2-IP>
  ```
- Ensured security group allows ports **22** (SSH) and **80** (HTTP).

**Why:** EC2 serves as the remote host for running Docker containers that host the frontend, backend, and Nginx reverse proxy.

---

## 2. Project Structure

```
app/
├─ OAuthFrontend/       # Blazor SPA frontend
├─ node/                # Node.js OAuth backend
├─ nginx.conf           # Nginx config
└─ docker-compose.yaml  # Docker Compose orchestration
```

**Why:** Separation ensures clear boundaries between frontend, backend, and reverse proxy.

---

## 3. Docker Compose Services

```yaml
services:
  backend:
    build: ./node
    container_name: backend
    ports:
      - "5000:5000"
    env_file: ./node/.env

  frontend:
    build: ./OAuthFrontend
    container_name: frontend
    expose:
      - "80"

  nginx:
    image: nginx:alpine
    container_name: nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

**Why:**
- **Backend**: Handles Google OAuth.
- **Frontend**: Blazor SPA served via Nginx.
- **Nginx**: Reverse proxy for SPA, API, and OAuth.

---

## 4. Node.js OAuth Backend

**Key Points:**
- Uses `google-auth-library` to handle OAuth 2.0.
- Endpoints:
  - `/auth/google` → Redirects to Google login.
  - `/auth/google/callback` → Handles Google callback, fetches user info, redirects to frontend.
- Environment variables in `.env`:
  ```env
  PORT=5000
  CLIENT_ORIGIN_URL=http://oll1.duckdns.org
  CLIENT_ID=<GOOGLE_CLIENT_ID>
  CLIENT_SECRET=<GOOGLE_CLIENT_SECRET>
  REDIRECT_URI=http://oll1.duckdns.org/auth/google/callback
  ```

**Why:** Backend performs secure token exchange and user info retrieval. Frontend never directly communicates with Google OAuth.

---

## 5. Google OAuth Setup

- Created OAuth 2.0 Client in Google Cloud Console.
- Authorized JavaScript origins:
  ```text
  http://oll1.duckdns.org
  ```
- Authorized redirect URIs:
  ```text
  http://oll1.duckdns.org/auth/google/callback
  ```

**Why:** Google must know exact domain and callback URI for security. Otherwise, OAuth fails.

---

## 6. Nginx Configuration

**Original Problem:** SPA requests and OAuth `/auth/` were not correctly routed.

**Updated `nginx.conf`:**
```nginx
http {
    server {
        listen 80;

        # SPA frontend
        location / {
            proxy_pass http://frontend:80;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_intercept_errors on;
            error_page 404 =200 /index.html;
        }

        # API calls
        location /api/ {
            proxy_pass http://backend:5000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        # OAuth redirects
        location /auth/ {
            proxy_pass http://backend:5000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
```

**Why:**
- `/auth/` → Node backend for OAuth.
- `/api/` → Node backend for REST API.
- `/` → SPA frontend, any 404s return `index.html` for Blazor client-side routing.

---

## 7. Blazor Frontend Button Fix

**Problem:** SPA routing intercepted OAuth link.

**Solution:** Use `forceLoad` in Blazor:
```csharp
@inject NavigationManager Nav
<button @onclick="GoogleLogin">Sign in with Google</button>
@code {
    void GoogleLogin() {
        Nav.NavigateTo("http://oll1.duckdns.org/auth/google", forceLoad: true);
    }
}
```

**Why:** `forceLoad: true` forces a full browser redirect, required for OAuth flows.

---

## 8. Docker Networking Fix

- Verified containers are on the same Compose network (default in Compose).
- `backend` reachable from `nginx` using service name `backend`.
- Test with:
  ```bash
  docker exec nginx ping backend
  ```

**Why:** Nginx must resolve the backend container for `/auth/` and `/api/` routes.

---

## 9. Testing & Verification

1. Health check:
   ```bash
   http://oll1.duckdns.org/api/health
   ```
   Should return `{"status":"ok"}`.

2. OAuth redirect:
   ```bash
   http://oll1.duckdns.org/auth/google
   ```
   Should go to Google login page.

3. Blazor SPA routes:
   ```bash
   http://oll1.duckdns.org/login
   http://oll1.duckdns.org/profile
   ```
   Should load SPA pages (not 500 error).

---

## 10. Key Lessons Learned

- **Nginx reverse proxy is mandatory** for SPA + backend separation.
- **Docker Compose networking** allows service name resolution between containers.
- **Blazor SPA routing** requires `forceLoad: true` for external redirects.
- **Google OAuth redirect URI** must match exactly `.env` and Google Cloud settings.
- **SPA 404s** need to return `index.html` to let Blazor handle client-side routes.
- Future: Enable HTTPS for production OAuth compliance.

---

End of guide.

