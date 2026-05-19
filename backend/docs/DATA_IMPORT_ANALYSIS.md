# DataImportModule.tsx - Comprehensive Fetch Analysis

## 1. ALL FETCH CALLS IN THE FILE

### Fetch Call 1: Preview Endpoint
**Location:** `runPreview()` function (around line 650)
```typescript
const response = await fetch(`${API_URL}/api/data-import/preview`, {
  method: "POST",
  headers: getAuthHeaders(),
  body: JSON.stringify({
    schoolId,
    moduleType,
    useAiMapping,
    headers: currentHeaders,
    rows: currentRows,
    mapping,
  }),
});
```

### Fetch Call 2: Validation Endpoint
**Location:** `runValidation()` function (around line 700)
```typescript
const response = await fetch(`${API_URL}/api/data-import/validate`, {
  method: "POST",
  headers: getAuthHeaders(),
  body: JSON.stringify({
    schoolId,
    moduleType,
    fileName,
    sheetName,
    academicYear,
    rows: currentRows,
    mapping,
  }),
});
```

### Fetch Call 3: Import Endpoint
**Location:** `runImport()` function (around line 770)
```typescript
const response = await fetch(`${API_URL}/api/data-import/import`, {
  method: "POST",
  headers: getAuthHeaders(),
  body: JSON.stringify({
    schoolId,
    batchId,
    duplicateMode: moduleType === "student-fee-record" ? "update" : "skip",
  }),
});
```

### Fetch Call 4: History Endpoint
**Location:** `loadHistory()` function (around line 820)
```typescript
const response = await fetch(`${API_URL}/api/data-import/history/${schoolId}`, {
  headers: getAuthHeaders(),
});
```

### Fetch Call 5: Rollback Endpoint
**Location:** `rollbackBatch()` function (around line 835)
```typescript
const response = await fetch(`${API_URL}/api/data-import/rollback/${selectedBatchId}`, {
  method: "POST",
  headers: getAuthHeaders(),
  body: JSON.stringify({ schoolId }),
});
```

### Fetch Call 6: Re-import Endpoint
**Location:** `reimportBatch()` function (around line 880)
```typescript
const response = await fetch(`${API_URL}/api/data-import/reimport/${selectedBatchId}`, {
  method: "POST",
  headers: getAuthHeaders(),
  body: JSON.stringify({ schoolId }),
});
```

---

## 2. AUTHENTICATION HEADERS ANALYSIS

### Authentication Header Function
**Location:** Line 524-534
```typescript
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  try {
    const token = localStorage.getItem("authToken");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {
    // ignore localStorage errors
  }
  
  return headers;
}
```

### How Headers Are Sent
- **Every fetch call uses `getAuthHeaders()`**
- Token is retrieved from `localStorage.getItem("authToken")`
- Token is sent as: `Authorization: Bearer {token}`
- Content-Type is always set to `application/json`

### Potential Issue 1: Missing Token
If `authToken` is not in localStorage, **no Authorization header will be sent**, which could cause 401 errors.

### Potential Issue 2: No Error Handling for localStorage Errors
The `try-catch` silently ignores localStorage errors, potentially missing token issues.

---

## 3. API_URL CONFIGURATION

### Configuration Logic (src/lib/api.ts)
```typescript
const DEFAULT_LOCAL_API_URL = "http://localhost:5000";
const DEFAULT_LEGACY_API_URL = "https://erp-portal-1-ftwe.onrender.com";

const envApiUrl = trimTrailingSlash(
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_URL || ""
);

export const API_URL = envApiUrl ||
  ((import.meta.env.MODE === "development") ? DEFAULT_LOCAL_API_URL : DEFAULT_LEGACY_API_URL);
```

### URL Resolution Priority
1. **First**: Uses `VITE_API_URL` environment variable (if set)
2. **Second**: In development mode → uses `http://localhost:5000`
3. **Third**: In production mode → uses `https://erp-portal-1-ftwe.onrender.com`

### Critical Issues with API_URL

**Issue A: No Validation**
- No check that the API_URL is actually valid or reachable
- If API_URL is `undefined` or empty string, fetch calls will fail

**Issue B: Environment Variable Not Set (Development)**
- If `VITE_API_URL` is not configured in `.env` file
- Falls back to `http://localhost:5000`
- If backend is not running on port 5000 → "Failed to fetch" error

**Issue C: CORS Issues**
- No mention of CORS headers being set
- Frontend at one origin trying to fetch from another will fail without proper CORS headers on backend

**Issue D: Relative URL Rewriting**
- The `api.ts` file has a fetch rewriter that rewrites URLs starting with `/api/`
- But `DataImportModule.tsx` uses absolute URLs: `${API_URL}/api/data-import/...`
- The fetch rewriter might double-rewrite the URL

---

## 4. ERROR HANDLING ANALYSIS

### Error Handling Pattern (Consistent Across All Calls)
```typescript
if (!response.ok) {
  const errorText = await response.text();
  let errorMsg = "Preview failed"; // varies by endpoint
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
```

### Issues with Error Handling

**Issue 1: No Network Error Handling**
- If fetch itself fails (network error, no internet, backend unreachable), it throws an error
- Error is caught but user only sees generic "Failed to fetch" message
- No distinction between network errors vs HTTP errors

**Issue 2: "Failed to fetch" Error (Classic CORS Issue)**
- When fetch fails at network level (CORS, network unreachable, timeout), the error message is literally "Failed to fetch"
- This happens when:
  - Backend is down/unreachable
  - CORS headers are missing on backend
  - Network connectivity issues
  - API_URL is incorrect

**Issue 3: Success Check is Too Strict**
```typescript
if (!payload?.success) {
  throw new Error(payload?.message || "Preview failed");
}
```
- Assumes response always has `success` field
- If endpoint returns different response structure, it will fail

**Issue 4: No Timeout Handling**
- Fetch calls have no timeout
- If backend is slow or stuck, request could hang indefinitely
- User sees loading spinner forever

---

## 5. STATE MANAGEMENT FOR LOADING AND ERRORS

### Loading State
**Location:** Line 543
```typescript
const [loading, setLoading] = useState(false);
```

### Error State
**Location:** Line 546
```typescript
const [error, setError] = useState<string>("");
```

### Message State
**Location:** Line 545
```typescript
const [message, setMessage] = useState<string>("");
```

### Loading State Updates Pattern
All fetch functions follow this pattern:
```typescript
setLoading(true);
setError("");
setMessage("");

try {
  // fetch call
  setMessage("Success message");
} catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  setError(errorMsg || "Generic error");
} finally {
  setLoading(false);
}
```

### Issues with State Management

**Issue 1: Both `error` and `message` Can Be Displayed**
- User sees them in the same UI area (lines 1245-1250)
- During intermediate states, old messages might persist

**Issue 2: No State Clearing on Module Type Change**
```typescript
useEffect(() => {
  setMapping({});
  setPreview(null);
  setValidation(null);
  setBatchId("");
  setMessage("");
  setError("");
}, [moduleType]);
```
- Error and message are cleared when module type changes
- But not when user navigates away
- Could show old errors on fresh module selection

**Issue 3: Loading State is Global**
- All 6 endpoints share the same `loading` state
- If one request is loading, all buttons are disabled
- Can't distinguish which operation is in progress

---

## 6. HEADERS ANALYSIS - WHAT'S BEING SENT

### DataImportModule Headers (getAuthHeaders())
```
Content-Type: application/json
Authorization: Bearer {authToken from localStorage}
```

### Issue: Headers Are Manually Constructed
- DataImportModule directly calls `getAuthHeaders()` instead of using the global fetch rewriter
- The global fetch rewriter in `src/lib/api.ts` also adds auth headers
- **This could result in duplicate header addition or conflicts**

### Global Fetch Rewriter (src/lib/api.ts)
When `installApiFetchRewriter()` is called in `main.tsx`, every fetch gets:
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

### URL Rewriting in Global Fetch Rewriter
```typescript
function rewriteUrl(url: string) {
  if (url.startsWith("/api/")) {
    return `${API_URL}${url}`;
  }
  // ... more cases
  return url;
}
```

### Issue: Double URL Handling
- DataImportModule uses full URLs: `${API_URL}/api/data-import/preview`
- The global fetch rewriter looks for URLs starting with `/api/`
- Since DataImportModule already includes the full URL, the rewriter won't match it
- This means the global rewriter won't touch the URL
- **But the global fetch rewriter WILL try to add auth headers** (if they're not already present)

---

## 7. ROOT CAUSES OF "Failed to fetch" ERRORS

### Most Likely Cause #1: Backend Not Running
- Default development API_URL is `http://localhost:5000`
- If backend server is not running → "Failed to fetch" error
- **Solution**: Start backend: `npm run dev` in backend folder

### Most Likely Cause #2: CORS Configuration on Backend
- Frontend is making cross-origin requests
- Backend CORS headers missing or misconfigured
- **Solution**: Check backend has:
  ```typescript
  app.use(cors({
    origin: "http://localhost:5173", // frontend URL
    credentials: true,
  }));
  ```

### Most Likely Cause #3: Incorrect API_URL
- `VITE_API_URL` environment variable not set
- Backend running on different port than expected
- **Solution**: 
  - Check `.env` file has `VITE_API_URL=http://localhost:5000`
  - Or adjust if backend is on different port

### Most Likely Cause #4: Missing Authentication Token
- User is not logged in (no `authToken` in localStorage)
- Requests fail with 401 Unauthorized (shown as "Failed to fetch")
- **Solution**: Ensure user is logged in before accessing Data Import module

### Most Likely Cause #5: Network Issues
- Bad internet connection
- Request timeout (no timeout configured)
- DNS resolution failure
- **Solution**: Check network connectivity, add timeout handling

### Cause #6: Invalid Response Format
- Backend endpoint doesn't return `{ success: true, data: ... }` format
- Fetch succeeds but response parsing fails
- **Solution**: Verify backend endpoints return correct JSON format

---

## 8. CRITICAL RECOMMENDATIONS

### High Priority Fixes

1. **Add Timeout to Fetch Calls**
   ```typescript
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 sec timeout
   
   try {
     const response = await fetch(url, {
       ...options,
       signal: controller.signal,
     });
   } finally {
     clearTimeout(timeoutId);
   }
   ```

2. **Add Better Error Messages**
   - Distinguish between network errors, CORS errors, and server errors
   - Provide actionable error messages

3. **Check Backend Startup**
   - Add debug logging for API_URL
   - Add endpoint health check on component mount

4. **Consolidate Auth Header Logic**
   - Remove manual `getAuthHeaders()` calls
   - Rely only on global fetch rewriter in `api.ts`

5. **Add Logging**
   ```typescript
   console.debug('Fetch URL:', `${API_URL}/api/data-import/preview`);
   console.debug('Auth token exists:', !!localStorage.getItem("authToken"));
   ```

### Medium Priority Fixes

6. **Add Fallback for Missing Response Fields**
   - Check if response has expected structure before accessing

7. **Use Relative URLs with Fetch Rewriter**
   - Change `${API_URL}/api/data-import/preview` to `/api/data-import/preview`
   - Let the global rewriter handle URL rewriting consistently

8. **Add Retry Logic**
   - For transient failures, implement exponential backoff

### Low Priority

9. **Separate Loading States**
   - Track which operation is loading instead of global loading

10. **Add Network Status Monitoring**
    - Show when user is offline

---

## Summary Table

| Aspect | Status | Issue |
|--------|--------|-------|
| Fetch Calls | 6 total | ✓ Consistent pattern |
| Auth Headers | Manual | ⚠ Could conflict with global rewriter |
| API_URL | Configurable | ⚠ Missing validation |
| Error Handling | Basic | ❌ No network/timeout handling |
| Loading State | Global | ⚠ Can't distinguish requests |
| Headers Sent | Authorization + Content-Type | ✓ Correct |
| CORS | Not mentioned | ❌ Backend config issue likely |
| "Failed to fetch" cause | Multiple | 🔴 Usually backend not running or CORS issue |
