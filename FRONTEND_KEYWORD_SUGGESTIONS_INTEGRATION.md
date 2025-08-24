# Frontend Keyword Suggestions Integration Guide

## Overview

This guide provides comprehensive instructions for integrating the Keyword Suggestions API endpoint into your frontend application. The endpoint provides keyword suggestions based on a seed keyword, search engine, and country parameters.

## API Endpoint

**URL:** `GET /api/seo/keyword-suggestions`

**Base URL:** `http://localhost:3000` (development) or your production domain

## Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `keyword` | string | ✅ Yes | - | The seed keyword to generate suggestions for |
| `country` | string | ❌ No | `us` | 2-letter country code (e.g., `us`, `uk`, `ca`) |
| `se` | string | ❌ No | `google` | Search engine (`google`, `bing`, `yahoo`) |

## Example Requests

### Basic Request
```javascript
const response = await fetch('/api/seo/keyword-suggestions?keyword=digital marketing');
```

### Advanced Request with Parameters
```javascript
const response = await fetch('/api/seo/keyword-suggestions?keyword=seo tools&country=uk&se=bing');
```

## Response Format

The API returns keyword suggestions in two categories: **Ideas** and **Questions**. Each suggestion includes difficulty level, search volume, and last updated timestamp.

### Success Response (200)
```json
{
  "status": "success",
  "Ideas": [
    {
      "keyword": "mobile phone",
      "difficulty": "Hard",
      "volume": ">10k",
      "lastUpdated": "2025-08-24T06:55:56Z"
    },
    {
      "keyword": "t mobile phone number",
      "difficulty": "Hard",
      "volume": ">10k",
      "lastUpdated": "2025-08-20T23:42:21Z"
    }
  ],
  "Questions": [
    {
      "keyword": "how to unlock t mobile phone",
      "difficulty": "Medium",
      "volume": null,
      "lastUpdated": "2025-08-20T13:23:52Z"
    },
    {
      "keyword": "when was the first mobile phone invented",
      "difficulty": "Hard",
      "volume": null,
      "lastUpdated": "2025-08-14T19:27:03Z"
    }
  ]
}
```

### Error Response (400)
```json
{
  "error": "Keyword parameter is required",
  "message": "Please provide a keyword query parameter"
}
```

### Error Response (500)
```json
{
  "error": "Failed to fetch keyword suggestions",
  "message": "RapidAPI request failed: 429 Too Many Requests"
}
```

### Response Data Structure

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Response status ("success" or "error") |
| `Ideas` | array | Array of keyword idea suggestions |
| `Questions` | array | Array of question keyword suggestions |

#### Keyword Suggestion Object

| Field | Type | Description |
|-------|------|-------------|
| `keyword` | string | The suggested keyword |
| `difficulty` | string | SEO difficulty level ("Easy", "Medium", "Hard", or empty) |
| `volume` | string \| null | Search volume (e.g., ">10k", ">100", or null) |
| `lastUpdated` | string | ISO timestamp of last update (or empty string) |

## Frontend Implementation Examples

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

interface KeywordSuggestion {
  keyword: string;
  difficulty: string;
  volume: string | null;
  lastUpdated: string;
}

interface KeywordSuggestionsResponse {
  status: string;
  Ideas: KeywordSuggestion[];
  Questions: KeywordSuggestion[];
}

export const useKeywordSuggestions = () => {
  const [ideas, setIdeas] = useState<KeywordSuggestion[]>([]);
  const [questions, setQuestions] = useState<KeywordSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = async (
    keyword: string,
    country: string = 'us',
    se: string = 'google'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        keyword,
        country,
        se
      });

      const response = await fetch(`/api/seo/keyword-suggestions?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch suggestions');
      }

      const data: KeywordSuggestionsResponse = await response.json();
      setIdeas(data.Ideas || []);
      setQuestions(data.Questions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return {
    ideas,
    questions,
    loading,
    error,
    fetchSuggestions
  };
};
```

### React Component Example

```tsx
import React, { useState } from 'react';
import { useKeywordSuggestions } from './hooks/useKeywordSuggestions';

const KeywordSuggestionsComponent: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [country, setCountry] = useState('us');
  const [searchEngine, setSearchEngine] = useState('google');
  
  const { ideas, questions, loading, error, fetchSuggestions } = useKeywordSuggestions();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      fetchSuggestions(keyword.trim(), country, searchEngine);
    }
  };

  return (
    <div className="keyword-suggestions">
      <h2>Keyword Suggestions</h2>
      
      <form onSubmit={handleSubmit} className="suggestions-form">
        <div className="form-group">
          <label htmlFor="keyword">Seed Keyword:</label>
          <input
            type="text"
            id="keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Enter a keyword..."
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="country">Country:</label>
          <select
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="us">United States</option>
            <option value="uk">United Kingdom</option>
            <option value="ca">Canada</option>
            <option value="au">Australia</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="se">Search Engine:</label>
          <select
            id="se"
            value={searchEngine}
            onChange={(e) => setSearchEngine(e.target.value)}
          >
            <option value="google">Google</option>
            <option value="bing">Bing</option>
            <option value="yahoo">Yahoo</option>
          </select>
        </div>

        <button type="submit" disabled={loading || !keyword.trim()}>
          {loading ? 'Loading...' : 'Get Suggestions'}
        </button>
      </form>

      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
        </div>
      )}

      {(ideas.length > 0 || questions.length > 0) && (
        <div className="suggestions-results">
          {ideas.length > 0 && (
            <div className="suggestions-section">
              <h3>Keyword Ideas ({ideas.length})</h3>
              <div className="suggestions-grid">
                {ideas.map((idea, index) => (
                  <div key={index} className="suggestion-card">
                    <h4>{idea.keyword}</h4>
                    <div className="suggestion-metrics">
                      <span className="metric">
                        <strong>Volume:</strong> {idea.volume || 'N/A'}
                      </span>
                      <span className="metric">
                        <strong>Difficulty:</strong> 
                        <span className={`difficulty-${idea.difficulty.toLowerCase()}`}>
                          {idea.difficulty || 'N/A'}
                        </span>
                      </span>
                      <span className="metric">
                        <strong>Last Updated:</strong> {idea.lastUpdated ? new Date(idea.lastUpdated).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {questions.length > 0 && (
            <div className="suggestions-section">
              <h3>Question Keywords ({questions.length})</h3>
              <div className="suggestions-grid">
                {questions.map((question, index) => (
                  <div key={index} className="suggestion-card">
                    <h4>{question.keyword}</h4>
                    <div className="suggestion-metrics">
                      <span className="metric">
                        <strong>Volume:</strong> {question.volume || 'N/A'}
                      </span>
                      <span className="metric">
                        <strong>Difficulty:</strong> 
                        <span className={`difficulty-${question.difficulty.toLowerCase()}`}>
                          {question.difficulty || 'N/A'}
                        </span>
                      </span>
                      <span className="metric">
                        <strong>Last Updated:</strong> {question.lastUpdated ? new Date(question.lastUpdated).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default KeywordSuggestionsComponent;
```

### CSS Styling Example

```css
.keyword-suggestions {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.suggestions-form {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: 15px;
  align-items: end;
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 5px;
  font-weight: 600;
  color: #333;
}

.form-group input,
.form-group select {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

button:hover:not(:disabled) {
  background: #0056b3;
}

button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.error-message {
  padding: 15px;
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  margin-bottom: 20px;
}

.suggestions-results h3 {
  margin-bottom: 20px;
  color: #333;
}

.suggestions-section {
  margin-bottom: 40px;
}

.suggestions-section h3 {
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
  margin-bottom: 25px;
}

.suggestions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.suggestion-card {
  padding: 20px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.suggestion-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.suggestion-card h4 {
  margin: 0 0 15px 0;
  color: #007bff;
  font-size: 16px;
  font-weight: 600;
}

.suggestion-metrics {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric {
  font-size: 14px;
  color: #666;
}

.metric strong {
  color: #333;
}

.difficulty-easy {
  color: #28a745;
  font-weight: 600;
}

.difficulty-medium {
  color: #ffc107;
  font-weight: 600;
}

.difficulty-hard {
  color: #dc3545;
  font-weight: 600;
}

@media (max-width: 768px) {
  .suggestions-form {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .suggestions-grid {
    grid-template-columns: 1fr;
  }
}
```

### Vanilla JavaScript Example

```javascript
class KeywordSuggestionsAPI {
  constructor(baseURL = '/api/seo') {
    this.baseURL = baseURL;
  }

  async getSuggestions(keyword, country = 'us', se = 'google') {
    try {
      const params = new URLSearchParams({
        keyword,
        country,
        se
      });

      const response = await fetch(`${this.baseURL}/keyword-suggestions?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching keyword suggestions:', error);
      throw error;
    }
  }
}

// Usage example
const api = new KeywordSuggestionsAPI();

// Basic usage
api.getSuggestions('digital marketing')
  .then(data => {
    console.log('Ideas:', data.Ideas);
    console.log('Questions:', data.Questions);
  })
  .catch(error => {
    console.error('Error:', error.message);
  });

// Advanced usage with parameters
api.getSuggestions('seo tools', 'uk', 'bing')
  .then(data => {
    console.log('UK Bing Ideas:', data.Ideas);
    console.log('UK Bing Questions:', data.Questions);
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
```

## Error Handling

### Common Error Scenarios

1. **Missing Keyword Parameter**
   - Status: 400
   - Solution: Ensure the `keyword` parameter is provided

2. **Invalid Country Code**
   - Status: 400
   - Solution: Use valid 2-letter country codes (e.g., `us`, `uk`, `ca`)

3. **Invalid Search Engine**
   - Status: 400
   - Solution: Use valid search engines (`google`, `bing`, `yahoo`)

4. **Rate Limiting**
   - Status: 429
   - Solution: Implement retry logic with exponential backoff

5. **API Service Unavailable**
   - Status: 500
   - Solution: Show user-friendly error message and retry option

### Error Handling Example

```javascript
const handleApiError = (error, response) => {
  if (response?.status === 429) {
    return {
      type: 'rate_limit',
      message: 'Too many requests. Please try again in a few minutes.',
      retryAfter: response.headers.get('Retry-After')
    };
  }
  
  if (response?.status === 400) {
    return {
      type: 'validation_error',
      message: 'Please check your input parameters.',
      details: error.message
    };
  }
  
  if (response?.status >= 500) {
    return {
      type: 'server_error',
      message: 'Service temporarily unavailable. Please try again later.',
      retry: true
    };
  }
  
  return {
    type: 'unknown_error',
    message: 'An unexpected error occurred. Please try again.',
    retry: true
  };
};
```

## Best Practices

### 1. Input Validation
- Validate keyword length (1-100 characters)
- Sanitize input to prevent XSS attacks
- Use proper country code validation

### 2. User Experience
- Show loading states during API calls
- Implement debouncing for search inputs
- Provide clear error messages
- Add retry functionality for failed requests

### 3. Performance
- Cache results when appropriate
- Implement pagination for large result sets
- Use proper loading indicators

### 4. Accessibility
- Add proper ARIA labels
- Ensure keyboard navigation
- Provide screen reader support

## Testing

### Unit Test Example (Jest)

```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KeywordSuggestionsComponent from './KeywordSuggestionsComponent';

// Mock the fetch function
global.fetch = jest.fn();

describe('KeywordSuggestionsComponent', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should fetch suggestions when form is submitted', async () => {
    const mockResponse = {
      status: 'success',
      Ideas: [
        {
          keyword: 'test idea',
          difficulty: 'Medium',
          volume: '>1k',
          lastUpdated: '2025-01-15T10:00:00Z'
        }
      ],
      Questions: [
        {
          keyword: 'how to test',
          difficulty: 'Easy',
          volume: '>100',
          lastUpdated: '2025-01-15T10:00:00Z'
        }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    render(<KeywordSuggestionsComponent />);

    const input = screen.getByLabelText(/seed keyword/i);
    const submitButton = screen.getByText(/get suggestions/i);

    fireEvent.change(input, { target: { value: 'test keyword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/seo/keyword-suggestions?keyword=test%20keyword&country=us&se=google')
      );
    });

    await waitFor(() => {
      expect(screen.getByText('test idea')).toBeInTheDocument();
      expect(screen.getByText('how to test')).toBeInTheDocument();
    });
  });

  it('should show error message when API call fails', async () => {
    fetch.mockRejectedValueOnce(new Error('API Error'));

    render(<KeywordSuggestionsComponent />);

    const input = screen.getByLabelText(/seed keyword/i);
    const submitButton = screen.getByText(/get suggestions/i);

    fireEvent.change(input, { target: { value: 'test keyword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/error: api error/i)).toBeInTheDocument();
    });
  });
});
```

## Environment Variables

Make sure your backend has the following environment variables configured:

```env
RAPIDAPI_KEY=your_rapidapi_key_here
RAPIDAPI_HOST=your_rapidapi_host_here
```

## Rate Limiting

The RapidAPI service may have rate limits. Implement appropriate error handling and user feedback for rate limit scenarios.

## Support

For issues or questions regarding this integration:

1. Check the browser's Network tab for detailed error information
2. Verify your RapidAPI credentials are correctly configured
3. Ensure all required parameters are provided
4. Check the server logs for detailed error messages

## Changelog

- **v1.0.0** - Initial implementation of keyword suggestions endpoint
- Added support for multiple search engines (Google, Bing, Yahoo)
- Added country-specific suggestions
- Implemented comprehensive validation and error handling
