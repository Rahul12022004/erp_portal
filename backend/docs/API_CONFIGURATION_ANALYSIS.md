# API Configuration & Fetch Interceptor Analysis

## 1. API URL Configuration

### ✅ **Current Setup**
- **Default Local**: `http://localhost:5000` (development)
- **Default Legacy**: `https://erp-portal-1-ftwe.onrender.com` (production fallback)
- **Environment Variable**: `VITE_API_URL` (from `.env` file)

### Configuration Logic
```typescript
// From src/lib/api.ts
const envApiUrl = trimTrailingSlash(
  (import.meta.env).VITE_API_URL || ""
);

export const API_URL = envApiUrl ||
  ((import.meta.env.MODE === "development") ? DEFAULT_LOCAL_API_URL : DEFAULT_LEGACY_API_URL);
```

**Analysis:**
- ✅ Properly trims trailing slashes to prevent double slashes in URLs
- ✅ Falls back to local dev URL in development mode
- ✅ Falls back to legacy Render URL in production
- ✅ Warns users if not in dev and VITE_API_URL is missing
- ⚠️ **Note:** Users must create `.env` file with `VITE_API_URL=http://localhost:5000` for it to be used

---

## 2. Fetch Rewriter Implementation

### **Entry Point**
```typescript
// src/main.tsx
import { installApiFetchRewriter } from "./lib/api";
installApiFetchRewriter();
```
✅ Called at app startup before React renders

### **Function: `installApiFetchRewriter()`**

#### How It Works:
1. ✅ **Guard Clause**: Only installs once, prevents duplicate rewriting
2. ✅ **Wraps Native Fetch**: Intercepts all `window.fetch` calls
3. ✅ **Handles Multiple Input Types**:
   - String URLs: `fetch("/api/endpoint")`
   - URL objects: `fetch(new URL("..."))`
   - Request objects: `fetch(new Request(...))`

#### URL Rewriting Logic
```typescript
function rewriteUrl(url: string) {
  if (url.startsWith("/api/")) {
    return `${API_URL}${url}`;  // Relative paths
  }
  
  if (url.startsWith(`${DEFAULT_LEGACY_API_URL}/`)) {
    return `${API_URL}${url.slice(DEFAULT_LEGACY_API_URL.length)}`;  // Legacy URLs
  }
  
  if (url.startsWith(`${DEFAULT_LOCAL_API_URL}/`)) {
    return `${API_URL}${url.slice(DEFAULT_LOCAL_API_URL.length)}`;  // Local URLs
  }
  
  return url;  // Pass through unchanged
}
```

**Analysis:**
- ✅ Converts relative `/api/*` paths to full URLs
- ✅ Migrates legacy Render URLs transparently
- ✅ Preserves non-API URLs unchanged
- ⚠️ **Issue**: DataImportModule uses `${API_URL}/api/...` directly - double wrapping possible

---

## 3. Authorization Header Handling

### **Function: `withAuthHeaders()`**
```typescript
function withAuthHeaders(init?: RequestInit): RequestInit {
  const token = readAuthToken();
  if (!token) {
    return init || {};
  }

  const headers = new Headers(init?.headers || {});
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return {
    ...(init || {}),
    headers,
  };
}
```

**Analysis:**
- ✅ Retrieves token from localStorage safely (try-catch)
- ✅ Won't override existing Authorization headers
- ✅ Skips adding header if token is missing
- ⚠️ **Warning**: Token mismatch possible - see "Token Storage Issues" below

### **Token Reading**
```typescript
function readAuthToken() {
  try {
    return localStorage.getItem("authToken") || "";
  } catch {
    return "";  // Graceful fallback
  }
}
```
✅ Safe localStorage access with error handling

---

## 4. Unauthorized Response Handling

### **Function: `handleUnauthorizedIfNeeded()`**
```typescript
function handleUnauthorizedIfNeeded(url: string, response: Response) {
  if (response.status !== 401 || isPublicAuthUrl(url)) {
    return response;  // Only handle 401 on protected routes
  }

  // Clear all session data
  try {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("teacher");
    localStorage.removeItem("school");
    localStorage.removeItem("teacherPermissions");
  } catch {
    // ignore storage errors
  }

  // Redirect to home if not already on login page
  if (typeof window !== "undefined" && !window.location.pathname.includes("login")) {
    window.location.assign("/");
  }

  return response;
}
```

**Public URLs (no 401 handling):**
- `/api/schools/login`
- `/api/staff/login`
- `/api/schools/super-admin-login`
- `/api/schools/register`

**Analysis:**
- ✅ Clears all session storage on 401
- ✅ Redirects to home if not on login page
- ✅ Safe fallback for auth errors
- ⚠️ **Potential Issue**: Clears token but response still returns - could cause confusion

---

## 5. CORS & Origin Configuration

### Vite Dev Server Setup
```javascript
// vite.config.js
server: {
  proxy: {
    "/api": {
      target: "http://localhost:5000",
      changeOrigin: true,      // ✅ Sets Origin header correctly
      secure: false,           // ✅ Allows self-signed certs
    }
  }
}
```

**Analysis:**
- ✅ `changeOrigin: true` - Vite proxies `/api/*` requests to backend properly
- ✅ Prevents CORS issues during local development
- ⚠️ **Development Only**: Proxy doesn't work in production builds
- ⚠️ **Production Issue**: Production build will make direct requests to API_URL, requiring backend CORS headers

### Backend CORS (Not Visible in Frontend)
- Assumed configured in backend `server.ts` or `middleware/auth.ts`
- Should allow origin of deployed frontend (Vercel)

---

## 6. Error Handling in Modules

### Example: DataImportModule Pattern
```typescript
try {
  const response = await fetch(`${API_URL}/api/data-import/preview`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({...}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMsg = "Preview failed";
    try {
      const errorData = JSON.parse(errorText);
      errorMsg = errorData?.message || errorMsg;
    } catch {
      errorMsg = `Server error (${response.status}): ${errorText.slice(0, 100)}`;
    }
    throw new Error(errorMsg);
  }

  const payload = await response.json();
  if (!payload?.success) {
    throw new Error(payload?.message || "Preview failed");
  }

  // Success handling...
} catch (previewError) {
  const errorMsg = previewError instanceof Error 
    ? previewError.message 
    : String(previewError);
  setError(errorMsg);
}
```

**Analysis:**
- ✅ Checks `response.ok` before parsing JSON
- ✅ Safely attempts to parse error responses
- ✅ Provides fallback error messages
- ✅ Handles both network and application errors
- ⚠️ **Inconsistency**: Some modules manually add headers with `getAuthHeaders()`

---

## 7. Duplicate Authorization Header Problem ⚠️

### The Issue
**Location 1: Global Rewriter** (src/lib/api.ts)
```typescript
window.fetch = ((input, init) => {
  // ... URL rewriting ...
  return originalFetch(url, withAuthHeaders(init))  // 👈 Headers added here
})
```

**Location 2: Module-Level** (DataImportModule.tsx)
```typescript
function getAuthHeaders(): Record<string, string> {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem("authToken");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;  // 👈 Headers added again
  }
  return headers;
}

// Used in:
fetch(`${API_URL}/api/data-import/preview`, {
  headers: getAuthHeaders(),  // Headers added by module
  // Then wrapped by global rewriter again
})
```

### Problem
The `withAuthHeaders()` function in the global rewriter checks `!headers.has("Authorization")` which prevents duplicates, but there's redundancies:
- DataImportModule passes full URLs with explicit headers
- Global rewriter then tries to add headers again

### Impact
- ✅ No actual duplicate headers (prevented by `has()` check)
- ⚠️ But unnecessary duplication of auth logic
- ⚠️ Confusing which layer handles authentication

---

## 8. Environment Setup Issues ⚠️⚠️

### Missing `.env` File
**Current State:**
- Only `.env.example` exists
- No actual `.env` file checked into repo

**Problem:**
```
User runs: npm run dev
↓
VITE_API_URL is not set in .env
↓
Falls back to hardcoded http://localhost:5000
↓
Wrong if backend is running elsewhere (remote server, different port, etc.)
```

**Recommendation:**
- Ensure users copy `.env.example` to `.env` and configure correctly

---

## 9. Token Storage Consistency Issue ⚠️

### Multiple Auth Functions Exist

**In src/lib/api.ts:**
```typescript
function readAuthToken() {
  try {
    return localStorage.getItem("authToken") || "";
  } catch {
    return "";
  }
}
```

**In DataImportModule.tsx:**
```typescript
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("authToken");
  // ...
}
```

**In src/lib/auth.ts:**
```typescript
export function readAuthToken() {
  return localStorage.getItem("authToken") || "";
}

export function persistAuthToken(token: string) {
  localStorage.setItem("authToken", token);
}
```

**Problem:**
- 3 different implementations of the same logic
- No centralized token management
- Inconsistent error handling (some have try-catch, some don't)
- Risk of getting out of sync

---

## 10. CORS Preflight Request Handling

### How It Works
1. Browser sends `OPTIONS` request before actual request (for complex requests)
2. Options request must include `Authorization` header response header from backend

### Backend Configuration Needed
Backend `server.ts` should have CORS like:
```typescript
const corsOptions = {
  origin: ["http://localhost:8081", "https://your-frontend.vercel.app"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
```

---

## 11. Content-Type Headers

### DataImportModule
```typescript
const headers: Record<string, string> = {
  "Content-Type": "application/json",
};
```
✅ Explicitly sets Content-Type

### Global Rewriter
```typescript
function withAuthHeaders(init?: RequestInit): RequestInit {
  // Does NOT set Content-Type
  // Relies on fetch() default or caller
}
```

**Analysis:**
- ⚠️ Global rewriter doesn't ensure Content-Type is set
- ✅ But Fetch API automatically sets it for JSON body

---

## Summary of Issues Found

| Issue | Severity | Solutions |
|-------|----------|-----------|
| Missing `.env` file in repo | ⚠️ Medium | Provide setup instructions or template |
| Duplicate auth logic (3 places) | ⚠️ Medium | Centralize into `src/lib/auth.ts` |
| Fetch rewriter not used in DataImportModule | ⚠️ Low | Use fetch directly with `/api/...` paths |
| No CORS configuration docs | ⚠️ Medium | Document required backend CORS |
| API_URL usage inconsistency | ⚠️ Low | Some modules use it, some use relative paths |
| No error boundary for auth errors | ⚠️ Low | Consider retry logic for 401 responses |

---

## ✅ What's Working Well

1. **Safe fetch interception** - Properly wraps and preserves all request types
2. **Automatic token injection** - Authorization headers added transparently
3. **Session expiry handling** - Clears storage and redirects on 401
4. **Error handling** - Graceful fallbacks and console warnings
5. **Environment flexibility** - Supports multiple backends via VITE_API_URL
6. **Safe localStorage access** - Try-catch blocks prevent crashes

---

## Recommendations

### 1. **Create `.env` from `.env.example`**
```bash
cp .env.example .env
# Edit .env and set VITE_API_URL for your backend
```

### 2. **Centralize Token Management**
Move all `readAuthToken()` and `persistAuthToken()` to `src/lib/auth.ts`

### 3. **Use Relative Paths in Fetch Calls**
Change DataImportModule from:
```typescript
fetch(`${API_URL}/api/data-import/preview`, ...)
```
To:
```typescript
fetch("/api/data-import/preview", ...)
```
This lets the global rewriter handle API_URL resolution.

### 4. **Add CORS Documentation**
Document required backend CORS configuration in a setup guide.

### 5. **Add Fetch Error Logging**
Enhance the global rewriter to log fetch errors for debugging.

---

## Testing Checklist

- [ ] Local development with `VITE_API_URL=http://localhost:5000`
- [ ] Production build connects to correct backend
- [ ] Authorization headers present on all API calls (check Network tab)
- [ ] 401 responses clear session and redirect properly
- [ ] Public login endpoints don't require Authorization header
- [ ] Cross-origin requests work (test with remote backend)
- [ ] Token refresh/rotation works if implemented
