# Frontend Authentication URL Fix

Your frontend code has incorrect API URLs. The backend routes are mounted at `/api/auth/*` but your frontend is calling `/auth/*`.

## Current (Incorrect) URLs in your code:
- `${API_BASE_URL}/auth/login` ❌
- `${API_BASE_URL}/auth/register` ❌

## Should be:
- `${API_BASE_URL}/api/auth/login` ✅
- `${API_BASE_URL}/api/auth/register` ✅

## Updated Frontend Code:

```typescript
const login = async (email: string, password: string) => {
  setLoading(true);
  setError(null);

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    const userData = {
      ...data.user,
      created_at: new Date(data.user.created_at),
      updated_at: new Date(data.user.updated_at),
    };

    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", data.token);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Login failed");
    throw err;
  } finally {
    setLoading(false);
  }
};

const register = async (name: string, email: string, password: string) => {
  setLoading(true);
  setError(null);

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Registration failed");
    }

    const userData = {
      ...data.user,
      created_at: new Date(data.user.created_at),
      updated_at: new Date(data.user.updated_at),
    };

    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", data.token);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Registration failed");
    throw err;
  } finally {
    setLoading(false);
  }
};
```

## API Helper Function (Recommended)

Create an API helper to handle authenticated requests:

```typescript
// utils/api.ts
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}/api${endpoint}`, config);
  
  if (response.status === 401) {
    // Token expired, redirect to login
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/login';
    return;
  }

  return response;
};
```

Then use it for all API calls:
```typescript
// Get dashboard stats
const response = await apiRequest('/dashboard/stats');
const stats = await response.json();

// Create a task
const response = await apiRequest('/tasks', {
  method: 'POST',
  body: JSON.stringify(taskData)
});
```