# SEO API Mode Parameter Documentation

## Overview

The SEO API endpoints now support a `mode` parameter that allows the frontend to control how domain analysis is performed. This parameter accepts two values: `subdomains` and `exact`.

## Supported Endpoints

The following SEO API endpoints support the `mode` parameter:

1. **Website Traffic** - `/api/website-traffic`
2. **Website Authority** - `/api/website-authority` 
3. **Website Backlinks** - `/api/website-backlinks`

## Mode Parameter Values

### `subdomains`
- **Description**: Analyzes the main domain and all its subdomains
- **Use Case**: When you want comprehensive data including all subdomains
- **Example**: For `example.com`, this will include data from `blog.example.com`, `shop.example.com`, etc.

### `exact`
- **Description**: Analyzes only the exact URL specified (including paths)
- **Use Case**: When you want data for a specific URL, subdomain, or exact path match
- **Example**: For `https://www.1800gotjunk.com/us_en/locations/junk-removal-lakeland/davenport`, this will only analyze that specific URL

## API Usage Examples

### Website Traffic Analysis

```javascript
// Get traffic data for main domain and all subdomains
const response = await fetch('/api/website-traffic?url=https://example.com&mode=subdomains');

// Get traffic data for exact URL only
const response = await fetch('/api/website-traffic?url=https://www.1800gotjunk.com/us_en/locations/junk-removal-lakeland/davenport&mode=exact');
```

### Website Authority Analysis

```javascript
// Get authority data for main domain and all subdomains
const response = await fetch('/api/website-authority?url=https://example.com&mode=subdomains');

// Get authority data for exact URL only
const response = await fetch('/api/website-authority?url=https://www.1800gotjunk.com/us_en/locations/junk-removal-lakeland/davenport&mode=exact');
```

### Website Backlinks Analysis

```javascript
// Get backlinks data for main domain and all subdomains
const response = await fetch('/api/website-backlinks?url=https://example.com&mode=subdomains');

// Get backlinks data for exact URL only
const response = await fetch('/api/website-backlinks?url=https://www.1800gotjunk.com/us_en/locations/junk-removal-lakeland/davenport&mode=exact');
```

## Frontend Implementation

### React Component Example

```jsx
import React, { useState } from 'react';

const SeoAnalysis = () => {
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState('subdomains');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyzeWebsite = async (endpoint) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/${endpoint}?url=${encodeURIComponent(url)}&mode=${mode}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
             <input
         type="text"
         value={url}
         onChange={(e) => setUrl(e.target.value)}
         placeholder="Enter URL (e.g., https://example.com)"
       />
      
      <select value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="subdomains">Include Subdomains</option>
        <option value="exact">Exact Domain Only</option>
      </select>

      <div>
        <button onClick={() => analyzeWebsite('website-traffic')} disabled={loading}>
          Analyze Traffic
        </button>
        <button onClick={() => analyzeWebsite('website-authority')} disabled={loading}>
          Analyze Authority
        </button>
        <button onClick={() => analyzeWebsite('website-backlinks')} disabled={loading}>
          Analyze Backlinks
        </button>
      </div>

      {loading && <p>Analyzing...</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
};

export default SeoAnalysis;
```

### Vue.js Component Example

```vue
<template>
  <div>
         <input 
       v-model="url" 
       placeholder="Enter URL (e.g., https://example.com)"
     />
    
    <select v-model="mode">
      <option value="subdomains">Include Subdomains</option>
      <option value="exact">Exact Domain Only</option>
    </select>

    <div>
      <button @click="analyzeWebsite('website-traffic')" :disabled="loading">
        Analyze Traffic
      </button>
      <button @click="analyzeWebsite('website-authority')" :disabled="loading">
        Analyze Authority
      </button>
      <button @click="analyzeWebsite('website-backlinks')" :disabled="loading">
        Analyze Backlinks
      </button>
    </div>

    <p v-if="loading">Analyzing...</p>
    <pre v-if="data">{{ JSON.stringify(data, null, 2) }}</pre>
  </div>
</template>

<script>
export default {
  data() {
    return {
      url: '',
      mode: 'subdomains',
      data: null,
      loading: false
    };
  },
  methods: {
    async analyzeWebsite(endpoint) {
      this.loading = true;
      try {
        const response = await fetch(`/api/${endpoint}?url=${encodeURIComponent(this.url)}&mode=${this.mode}`);
        this.data = await response.json();
      } catch (error) {
        console.error('Analysis failed:', error);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
```

## Error Handling

The API will return appropriate error messages if:

- `url` parameter is missing or invalid
- `mode` parameter is not one of the allowed values (`subdomains` or `exact`)

### Example Error Response

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "mode": ["Mode must be either \"subdomains\" or \"exact\""]
  }
}
```

## Best Practices

1. **Required Parameter**: The `mode` parameter is now **required** for all SEO analysis endpoints
2. **User Experience**: Provide clear UI options to let users choose the analysis mode
3. **Validation**: Always validate the URL format before sending requests
4. **Loading States**: Show loading indicators during analysis
5. **Error Handling**: Handle validation errors when mode parameter is missing

## Migration Notes

- The `mode` parameter is now **required** - frontend must always provide either `subdomains` or `exact`
- Existing frontend code will need to be updated to include the mode parameter
- The API will return a validation error if the mode parameter is missing
