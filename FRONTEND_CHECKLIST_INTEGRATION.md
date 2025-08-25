# Frontend Checklist Integration Guide

This guide explains how to integrate the checklist API with your frontend to allow users to check off checklist items for their client sites.

## Overview

The checklist system allows users to track completion of SEO and marketing tasks for each client. The checklist items are **static and never change** - they are defined in your frontend code. The frontend sends the corresponding checklist item ID (like `gmb-1`, `website-2`, etc.) to the API, and the database tracks which items are completed for each user and client combination.

## API Endpoints

### Base URL
```
http://localhost:3000/api/checklist
```

### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/client/:clientId` | Get all checklist completion status for a client |
| PUT | `/client/:clientId/item/:itemId/toggle` | Toggle completion status of a checklist item |
| PUT | `/client/:clientId/item/:itemId/complete` | Mark a checklist item as completed |
| PUT | `/client/:clientId/item/:itemId/incomplete` | Mark a checklist item as incomplete |
| GET | `/client/:clientId/stats` | Get completion statistics for a client |
| GET | `/client/:clientId/completed` | Get all completed items for a client |
| GET | `/client/:clientId/incomplete` | Get all incomplete items for a client |
| DELETE | `/client/:clientId/reset` | Reset all checklist items for a client |

## Authentication

All endpoints require authentication. Include the JWT token in the Authorization header:

```javascript
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

## Frontend Integration

### 1. API Service Functions

Create a service file to handle API calls:

```typescript
// services/checklistService.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/checklist';

export interface ChecklistCompletion {
  id: number;
  user_id: number;
  client_id: number;
  checklist_item_id: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompletionStats {
  total_items: number;
  completed_items: number;
  incomplete_items: number;
}

class ChecklistService {
  private getHeaders() {
    const token = localStorage.getItem('token'); // or however you store your auth token
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  // Get all checklist completion status for a client
  async getClientChecklist(clientId: number): Promise<Record<string, ChecklistCompletion>> {
    const response = await axios.get(`${API_BASE_URL}/client/${clientId}`, {
      headers: this.getHeaders()
    });
    return response.data.data;
  }

  // Toggle completion status of a checklist item
  async toggleChecklistItem(clientId: number, itemId: string, isCompleted?: boolean): Promise<ChecklistCompletion> {
    const response = await axios.put(`${API_BASE_URL}/client/${clientId}/item/${itemId}/toggle`, 
      { isCompleted }, 
      { headers: this.getHeaders() }
    );
    return response.data.data;
  }

  // Mark a checklist item as completed
  async markAsCompleted(clientId: number, itemId: string): Promise<ChecklistCompletion> {
    const response = await axios.put(`${API_BASE_URL}/client/${clientId}/item/${itemId}/complete`, {}, {
      headers: this.getHeaders()
    });
    return response.data.data;
  }

  // Mark a checklist item as incomplete
  async markAsIncomplete(clientId: number, itemId: string): Promise<ChecklistCompletion> {
    const response = await axios.put(`${API_BASE_URL}/client/${clientId}/item/${itemId}/incomplete`, {}, {
      headers: this.getHeaders()
    });
    return response.data.data;
  }

  // Get completion statistics for a client
  async getCompletionStats(clientId: number): Promise<CompletionStats> {
    const response = await axios.get(`${API_BASE_URL}/client/${clientId}/stats`, {
      headers: this.getHeaders()
    });
    return response.data.data;
  }

  // Get completed items for a client
  async getCompletedItems(clientId: number): Promise<ChecklistCompletion[]> {
    const response = await axios.get(`${API_BASE_URL}/client/${clientId}/completed`, {
      headers: this.getHeaders()
    });
    return response.data.data;
  }

  // Get incomplete items for a client
  async getIncompleteItems(clientId: number): Promise<ChecklistCompletion[]> {
    const response = await axios.get(`${API_BASE_URL}/client/${clientId}/incomplete`, {
      headers: this.getHeaders()
    });
    return response.data.data;
  }

  // Reset all checklist items for a client
  async resetClientChecklist(clientId: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/client/${clientId}/reset`, {
      headers: this.getHeaders()
    });
  }
}

export const checklistService = new ChecklistService();
```

### 2. React Hook for Checklist Management

Create a custom hook to manage checklist state:

```typescript
// hooks/useChecklist.ts
import { useState, useEffect, useCallback } from 'react';
import { checklistService, ChecklistCompletion, CompletionStats } from '../services/checklistService';

export const useChecklist = (clientId: number) => {
  const [completions, setCompletions] = useState<Record<string, ChecklistCompletion>>({});
  const [stats, setStats] = useState<CompletionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load checklist data
  const loadChecklist = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [completionsData, statsData] = await Promise.all([
        checklistService.getClientChecklist(clientId),
        checklistService.getCompletionStats(clientId)
      ]);
      
      setCompletions(completionsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load checklist');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  // Toggle checklist item
  const toggleItem = useCallback(async (itemId: string, isCompleted?: boolean) => {
    try {
      const updatedCompletion = await checklistService.toggleChecklistItem(clientId, itemId, isCompleted);
      
      setCompletions(prev => ({
        ...prev,
        [itemId]: updatedCompletion
      }));

      // Refresh stats
      const newStats = await checklistService.getCompletionStats(clientId);
      setStats(newStats);

      return updatedCompletion;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update checklist item');
      throw err;
    }
  }, [clientId]);

  // Mark item as completed
  const markAsCompleted = useCallback(async (itemId: string) => {
    return await toggleItem(itemId, true);
  }, [toggleItem]);

  // Mark item as incomplete
  const markAsIncomplete = useCallback(async (itemId: string) => {
    return await toggleItem(itemId, false);
  }, [toggleItem]);

  // Reset checklist
  const resetChecklist = useCallback(async () => {
    try {
      await checklistService.resetClientChecklist(clientId);
      setCompletions({});
      setStats({ total_items: 0, completed_items: 0, incomplete_items: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset checklist');
      throw err;
    }
  }, [clientId]);

  // Check if item is completed
  const isItemCompleted = useCallback((itemId: string): boolean => {
    return completions[itemId]?.is_completed || false;
  }, [completions]);

  // Load data on mount
  useEffect(() => {
    loadChecklist();
  }, [loadChecklist]);

  return {
    completions,
    stats,
    loading,
    error,
    toggleItem,
    markAsCompleted,
    markAsIncomplete,
    resetChecklist,
    isItemCompleted,
    refresh: loadChecklist
  };
};
```

### 3. Checklist Component

Create a reusable checklist component that uses your static checklist data:

```tsx
// components/ChecklistItem.tsx
import React from 'react';
import { Checkbox } from './ui/Checkbox'; // Your UI component library
import { ChecklistItem as ChecklistItemType } from '../types';

interface ChecklistItemProps {
  item: ChecklistItemType; // Use your existing checklist item type
  isCompleted: boolean;
  onToggle: (itemId: string) => void;
  disabled?: boolean;
}

export const ChecklistItem: React.FC<ChecklistItemProps> = ({
  item,
  isCompleted,
  onToggle,
  disabled = false
}) => {
  const priorityColors = {
    critical: 'text-red-600',
    high: 'text-orange-600',
    medium: 'text-yellow-600',
    low: 'text-green-600'
  };

  const handleToggle = () => {
    if (!disabled) {
      onToggle(item.id);
    }
  };

  return (
    <div className={`p-4 border rounded-lg ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
      <div className="flex items-start space-x-3">
        <Checkbox
          checked={isCompleted}
          onChange={handleToggle}
          disabled={disabled}
          className="mt-1"
        />
        
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className={`font-medium ${isCompleted ? 'line-through text-gray-600' : 'text-gray-900'}`}>
              {item.title}
            </h3>
            <span className={`text-xs px-2 py-1 rounded ${priorityColors[item.priority]}`}>
              {item.priority}
            </span>
            <span className="text-xs text-gray-500">
              {item.estimatedTime}min
            </span>
          </div>
          
          <p className={`text-sm ${isCompleted ? 'text-gray-500' : 'text-gray-600'}`}>
            {item.description}
          </p>
          
          <div className="mt-2">
            <span className="text-xs text-gray-400">
              Category: {item.category}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 4. Checklist Category Component

```tsx
// components/ChecklistCategory.tsx
import React from 'react';
import { ChecklistItem } from './ChecklistItem';
import { ChecklistCategory as ChecklistCategoryType } from '../types';

interface ChecklistCategoryProps {
  category: ChecklistCategoryType; // Use your existing category type
  completions: Record<string, any>;
  onToggleItem: (itemId: string) => void;
  disabled?: boolean;
}

export const ChecklistCategory: React.FC<ChecklistCategoryProps> = ({
  category,
  completions,
  onToggleItem,
  disabled = false
}) => {
  const completedCount = category.items.filter(item => 
    completions[item.id]?.is_completed
  ).length;

  const progressPercentage = category.items.length > 0 
    ? (completedCount / category.items.length) * 100 
    : 0;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: category.color }}
          >
            <span className="text-white text-sm">
              {/* You can use an icon library here */}
              {category.icon}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {category.name}
            </h2>
            <p className="text-sm text-gray-600">
              {category.description}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">
            {completedCount} / {category.items.length}
          </div>
          <div className="text-xs text-gray-500">
            {Math.round(progressPercentage)}% complete
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {category.items.map((item) => (
          <ChecklistItem
            key={item.id}
            item={item}
            isCompleted={completions[item.id]?.is_completed || false}
            onToggle={onToggleItem}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};
```

### 5. Main Checklist Page Component

```tsx
// pages/ClientChecklist.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { useChecklist } from '../hooks/useChecklist';
import { ChecklistCategory } from '../components/ChecklistCategory';
import { checklistCategories } from '../data/checklist'; // Import your static checklist data
import { Button } from './ui/Button';
import { Alert } from './ui/Alert';

export const ClientChecklist: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const {
    completions,
    stats,
    loading,
    error,
    toggleItem,
    resetChecklist,
    refresh
  } = useChecklist(parseInt(clientId!));

  const handleToggleItem = async (itemId: string) => {
    try {
      await toggleItem(itemId);
    } catch (err) {
      console.error('Failed to toggle item:', err);
      // Show error toast/notification
    }
  };

  const handleReset = async () => {
    if (window.confirm('Are you sure you want to reset all checklist items? This action cannot be undone.')) {
      try {
        await resetChecklist();
        // Show success toast/notification
      } catch (err) {
        console.error('Failed to reset checklist:', err);
        // Show error toast/notification
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading checklist...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert type="error" title="Error" message={error} />
        <Button onClick={refresh} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Client Checklist
          </h1>
          <Button onClick={handleReset} variant="outline" size="sm">
            Reset All
          </Button>
        </div>

        {/* Progress Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.completed_items}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.incomplete_items}
              </div>
              <div className="text-sm text-gray-600">Remaining</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.total_items > 0 ? Math.round((stats.completed_items / stats.total_items) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
          </div>
        )}
      </div>

      {/* Checklist Categories */}
      <div className="space-y-8">
        {checklistCategories.map((category) => (
          <ChecklistCategory
            key={category.id}
            category={category}
            completions={completions}
            onToggleItem={handleToggleItem}
            disabled={loading}
          />
        ))}
      </div>
    </div>
  );
};
```

### 6. Route Configuration

Add the checklist page to your routing:

```tsx
// App.tsx or your router configuration
import { ClientChecklist } from './pages/ClientChecklist';

// In your router
<Route path="/clients/:clientId/checklist" element={<ClientChecklist />} />
```

## Usage Examples

### Basic Usage

```tsx
import { useChecklist } from '../hooks/useChecklist';
import { checklistItems } from '../data/checklist'; // Import your static checklist data

const MyComponent = () => {
  const { completions, toggleItem, isItemCompleted } = useChecklist(clientId);

  const handleCheckboxChange = (itemId: string) => {
    toggleItem(itemId);
  };

  return (
    <div>
      {checklistItems.map(item => (
        <label key={item.id}>
          <input
            type="checkbox"
            checked={isItemCompleted(item.id)}
            onChange={() => handleCheckboxChange(item.id)}
          />
          {item.title}
        </label>
      ))}
    </div>
  );
};
```

### With Loading States

```tsx
const ChecklistWithLoading = () => {
  const { completions, loading, error, toggleItem } = useChecklist(clientId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {/* Your checklist UI */}
    </div>
  );
};
```

## Error Handling

The API returns standard HTTP status codes:

- `200` - Success
- `401` - Unauthorized (invalid/missing token)
- `404` - Client not found
- `500` - Internal server error

Handle errors appropriately in your UI:

```tsx
const handleToggle = async (itemId: string) => {
  try {
    await toggleItem(itemId);
    // Show success notification
  } catch (error) {
    // Show error notification
    console.error('Failed to toggle item:', error);
  }
};
```

## Best Practices

1. **Optimistic Updates**: Consider updating the UI immediately and reverting on error for better UX
2. **Debouncing**: If users can click rapidly, consider debouncing the API calls
3. **Caching**: Cache checklist data to avoid unnecessary API calls
4. **Offline Support**: Consider storing checklist state locally for offline functionality
5. **Real-time Updates**: If multiple users can edit the same checklist, consider WebSocket updates

## Testing

Use the provided test file to verify API functionality:

```bash
node test-checklist-api.js
```

Make sure to update the test credentials and client ID in the test file before running.

## How It Works

### Static Checklist Data
Your checklist items are **static and defined in your frontend code**. They never change and include:

- **GMB Basic Setup**: `gmb-1` through `gmb-15` (15 items)
- **Website & SEO**: `website-1` through `website-9` (9 items)  
- **Content & Marketing**: `content-1` through `content-30` (30 items)
- **Local SEO**: `local-1` through `local-20` (20 items)
- **Social Media**: `social-1` through `social-10` (10 items)
- **Advanced Optimization**: `advanced-1` through `advanced-41` (41 items)

**Total: 125 checklist items**

### Database Storage
The database only stores **completion status**, not the checklist items themselves:

```sql
-- Example database records
user_id: 1, client_id: 11, checklist_item_id: 'gmb-1', is_completed: true
user_id: 1, client_id: 11, checklist_item_id: 'website-2', is_completed: false
user_id: 1, client_id: 11, checklist_item_id: 'content-5', is_completed: true
```

### Frontend Flow
1. **Load**: Frontend loads static checklist data + completion status from API
2. **Display**: Shows all 125 items with their completion status
3. **Toggle**: When user clicks checkbox, sends item ID to API
4. **Update**: API updates completion status in database
5. **Refresh**: Frontend updates UI to reflect new status

### API Communication
The frontend sends only the checklist item ID to the API:

```javascript
// When user clicks checkbox for "GMB Basic Audit Checklist Completed"
PUT /api/checklist/client/11/item/gmb-1/toggle

// API response
{
  "success": true,
  "data": {
    "id": 123,
    "user_id": 1,
    "client_id": 11,
    "checklist_item_id": "gmb-1",
    "is_completed": true,
    "completed_at": "2024-01-21T10:30:00Z"
  }
}
```

This approach ensures:
- ✅ Checklist items never change (static frontend data)
- ✅ Completion status is persisted per user/client
- ✅ Minimal database storage (only completion records)
- ✅ Fast API responses (no need to fetch checklist items)
- ✅ Easy to maintain (checklist changes only require frontend updates)
