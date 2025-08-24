# Saved Keywords API Documentation

## Overview

The Saved Keywords API allows authenticated users to save, manage, and organize keyword suggestions from the SEO API. Users can save keywords from suggestions, add notes, categorize them, and manage their keyword library.

## Database Schema

### MySQL Table Creation

```sql
CREATE TABLE IF NOT EXISTS saved_keywords (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  difficulty VARCHAR(50),
  volume VARCHAR(50),
  last_updated DATETIME,
  search_engine VARCHAR(50) DEFAULT 'google',
  country VARCHAR(10) DEFAULT 'us',
  category ENUM('idea', 'question') DEFAULT 'idea',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for better performance
  INDEX idx_user_id (user_id),
  INDEX idx_keyword (keyword),
  INDEX idx_category (category),
  INDEX idx_created_at (created_at),
  
  -- Foreign key constraint
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Unique constraint to prevent duplicate keywords per user
  UNIQUE KEY unique_user_keyword (user_id, keyword, category)
);
```

## API Endpoints

### Base URL
All endpoints are prefixed with `/api/saved-keywords` and require authentication.

### 1. Save a Single Keyword

**POST** `/api/saved-keywords`

Save a keyword to the user's profile.

**Request Body:**
```json
{
  "keyword": "local seo services",
  "difficulty": "Hard",
  "volume": ">10k",
  "last_updated": "2025-08-22T14:14:07Z",
  "search_engine": "google",
  "country": "us",
  "category": "idea",
  "notes": "High competition but good volume"
}
```

**Response (201):**
```json
{
  "message": "Keyword saved successfully",
  "data": {
    "id": 1,
    "user_id": 123,
    "keyword": "local seo services",
    "difficulty": "Hard",
    "volume": ">10k",
    "last_updated": "2025-08-22T14:14:07Z",
    "search_engine": "google",
    "country": "us",
    "category": "idea",
    "notes": "High competition but good volume",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

### 2. Get Saved Keywords

**GET** `/api/saved-keywords`

Retrieve all saved keywords for the authenticated user with pagination and filtering.

**Query Parameters:**
- `category` (optional): Filter by category (`idea` or `question`)
- `limit` (optional): Number of results per page (default: 50, max: 100)
- `offset` (optional): Number of results to skip (default: 0)
- `search` (optional): Search keywords by text

**Example Request:**
```
GET /api/saved-keywords?category=idea&limit=20&offset=0&search=seo
```

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 123,
      "keyword": "local seo services",
      "difficulty": "Hard",
      "volume": ">10k",
      "last_updated": "2025-08-22T14:14:07Z",
      "search_engine": "google",
      "country": "us",
      "category": "idea",
      "notes": "High competition but good volume",
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### 3. Check if Keyword is Saved

**GET** `/api/saved-keywords/check`

Check if a specific keyword is already saved by the user.

**Query Parameters:**
- `keyword` (required): The keyword to check
- `category` (optional): Category to check (default: `idea`)

**Example Request:**
```
GET /api/saved-keywords/check?keyword=local%20seo%20services&category=idea
```

**Response (200):**
```json
{
  "isSaved": true,
  "keyword": "local seo services",
  "category": "idea"
}
```

### 4. Get Specific Saved Keyword

**GET** `/api/saved-keywords/:id`

Retrieve a specific saved keyword by ID.

**Response (200):**
```json
{
  "data": {
    "id": 1,
    "user_id": 123,
    "keyword": "local seo services",
    "difficulty": "Hard",
    "volume": ">10k",
    "last_updated": "2025-08-22T14:14:07Z",
    "search_engine": "google",
    "country": "us",
    "category": "idea",
    "notes": "High competition but good volume",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

### 5. Update Saved Keyword

**PUT** `/api/saved-keywords/:id`

Update a saved keyword's details.

**Request Body:**
```json
{
  "difficulty": "Medium",
  "volume": ">5k",
  "notes": "Updated notes about this keyword"
}
```

**Response (200):**
```json
{
  "message": "Saved keyword updated successfully",
  "data": {
    "id": 1,
    "user_id": 123,
    "keyword": "local seo services",
    "difficulty": "Medium",
    "volume": ">5k",
    "last_updated": "2025-08-22T14:14:07Z",
    "search_engine": "google",
    "country": "us",
    "category": "idea",
    "notes": "Updated notes about this keyword",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:35:00Z"
  }
}
```

### 6. Delete Saved Keyword

**DELETE** `/api/saved-keywords/:id`

Delete a saved keyword.

**Response (200):**
```json
{
  "message": "Saved keyword deleted successfully",
  "data": {
    "id": 1
  }
}
```

### 7. Bulk Save Keywords

**POST** `/api/saved-keywords/bulk`

Save multiple keywords at once.

**Request Body:**
```json
{
  "keywords": [
    {
      "keyword": "local seo services",
      "difficulty": "Hard",
      "volume": ">10k",
      "last_updated": "2025-08-22T14:14:07Z",
      "search_engine": "google",
      "country": "us",
      "category": "idea",
      "notes": "High competition"
    },
    {
      "keyword": "how to do local seo",
      "difficulty": "Hard",
      "volume": ">100",
      "last_updated": "2025-08-22T03:07:45Z",
      "search_engine": "google",
      "country": "us",
      "category": "question",
      "notes": "Educational content opportunity"
    }
  ]
}
```

**Response (201):**
```json
{
  "message": "Bulk save completed",
  "data": {
    "saved": [
      {
        "id": 1,
        "keyword": "local seo services",
        "category": "idea"
      },
      {
        "id": 2,
        "keyword": "how to do local seo",
        "category": "question"
      }
    ],
    "errors": [],
    "summary": {
      "total": 2,
      "saved": 2,
      "errors": 0
    }
  }
}
```

### 8. Save Keyword from Suggestions

**POST** `/api/save-keyword`

Save a keyword directly from the keyword suggestions API.

**Request Body:**
```json
{
  "keyword": "local seo services",
  "difficulty": "Hard",
  "volume": ">10k",
  "last_updated": "2025-08-22T14:14:07Z",
  "search_engine": "google",
  "country": "us",
  "category": "idea",
  "notes": "From keyword suggestions"
}
```

**Response (201):**
```json
{
  "message": "Keyword saved successfully",
  "data": {
    "id": 1,
    "user_id": 123,
    "keyword": "local seo services",
    "difficulty": "Hard",
    "volume": ">10k",
    "last_updated": "2025-08-22T14:14:07Z",
    "search_engine": "google",
    "country": "us",
    "category": "idea",
    "notes": "From keyword suggestions",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Keyword is required",
  "message": "Please provide a keyword to save"
}
```

### 401 Unauthorized
```json
{
  "error": "Authentication required",
  "message": "You must be logged in to save keywords"
}
```

### 404 Not Found
```json
{
  "error": "Saved keyword not found",
  "message": "The requested saved keyword does not exist or does not belong to you"
}
```

### 409 Conflict
```json
{
  "error": "Keyword already saved",
  "message": "This keyword is already saved in your profile"
}
```

### 422 Validation Error
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "keyword": ["Keyword is required"],
    "category": ["Category must be either 'idea' or 'question'"]
  }
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to save keyword",
  "message": "Database connection error"
}
```

## Frontend Integration Examples

### React Hook for Saved Keywords

```typescript
import { useState, useEffect } from 'react';

interface SavedKeyword {
  id: number;
  keyword: string;
  difficulty: string;
  volume: string;
  last_updated: string;
  search_engine: string;
  country: string;
  category: 'idea' | 'question';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useSavedKeywords = () => {
  const [savedKeywords, setSavedKeywords] = useState<SavedKeyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedKeywords = async (options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.category) params.append('category', options.category);
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.search) params.append('search', options.search);

      const response = await fetch(`/api/saved-keywords?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch saved keywords');
      }

      const data = await response.json();
      setSavedKeywords(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const saveKeyword = async (keywordData: Partial<SavedKeyword>) => {
    try {
      const response = await fetch('/api/saved-keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(keywordData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save keyword');
      }

      const data = await response.json();
      setSavedKeywords(prev => [data.data, ...prev]);
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save keyword');
      throw err;
    }
  };

  const deleteKeyword = async (id: number) => {
    try {
      const response = await fetch(`/api/saved-keywords/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete keyword');
      }

      setSavedKeywords(prev => prev.filter(kw => kw.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete keyword');
      throw err;
    }
  };

  const checkIfSaved = async (keyword: string, category: string = 'idea') => {
    try {
      const response = await fetch(`/api/saved-keywords/check?keyword=${encodeURIComponent(keyword)}&category=${category}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to check if keyword is saved');
      }

      const data = await response.json();
      return data.isSaved;
    } catch (err) {
      console.error('Error checking if keyword is saved:', err);
      return false;
    }
  };

  return {
    savedKeywords,
    loading,
    error,
    fetchSavedKeywords,
    saveKeyword,
    deleteKeyword,
    checkIfSaved
  };
};
```

### React Component Example

```tsx
import React, { useState, useEffect } from 'react';
import { useSavedKeywords } from './hooks/useSavedKeywords';

const SavedKeywordsComponent: React.FC = () => {
  const [category, setCategory] = useState<'idea' | 'question' | ''>('');
  const [search, setSearch] = useState('');
  
  const { 
    savedKeywords, 
    loading, 
    error, 
    fetchSavedKeywords, 
    deleteKeyword 
  } = useSavedKeywords();

  useEffect(() => {
    fetchSavedKeywords({ category: category || undefined, search });
  }, [category, search]);

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this keyword?')) {
      try {
        await deleteKeyword(id);
      } catch (error) {
        console.error('Failed to delete keyword:', error);
      }
    }
  };

  return (
    <div className="saved-keywords">
      <h2>My Saved Keywords</h2>
      
      <div className="filters">
        <select 
          value={category} 
          onChange={(e) => setCategory(e.target.value as any)}
        >
          <option value="">All Categories</option>
          <option value="idea">Ideas</option>
          <option value="question">Questions</option>
        </select>
        
        <input
          type="text"
          placeholder="Search keywords..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading saved keywords...</div>
      ) : (
        <div className="keywords-grid">
          {savedKeywords.map((keyword) => (
            <div key={keyword.id} className="keyword-card">
              <h3>{keyword.keyword}</h3>
              <div className="keyword-metrics">
                <span className="difficulty">{keyword.difficulty}</span>
                <span className="volume">{keyword.volume}</span>
                <span className="category">{keyword.category}</span>
              </div>
              {keyword.notes && (
                <p className="notes">{keyword.notes}</p>
              )}
              <div className="actions">
                <button onClick={() => handleDelete(keyword.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedKeywordsComponent;
```

## Best Practices

1. **Authentication**: Always include the Authorization header with the JWT token
2. **Error Handling**: Implement proper error handling for all API calls
3. **Pagination**: Use pagination for large lists of saved keywords
4. **Validation**: Validate input data before sending to the API
5. **Caching**: Consider caching saved keywords locally for better performance
6. **Real-time Updates**: Use optimistic updates for better UX

## Rate Limiting

The API includes rate limiting to prevent abuse. Users are limited to:
- 100 requests per minute for read operations
- 50 requests per minute for write operations

## Security

- All endpoints require authentication
- Users can only access their own saved keywords
- Input validation prevents SQL injection and XSS attacks
- CORS is properly configured for frontend integration
