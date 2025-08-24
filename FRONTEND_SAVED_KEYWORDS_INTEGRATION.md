# Frontend Saved Keywords Integration Guide

## Overview

This guide explains how to integrate the saved keywords functionality into your existing React frontend. The integration will allow users to save keyword suggestions to their profile and manage their saved keywords library.

## Prerequisites

- User authentication system (JWT tokens)
- Existing keyword research component
- Material-UI components
- API base URL configuration

## Step 1: Add Authentication Context

First, ensure you have an authentication context to manage user tokens:

```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  token: string | null;
  user: any | null;
  login: (token: string, user: any) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<any | null>(null);

  const login = (newToken: string, userData: any) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

## Step 2: Create Saved Keywords Hook

Create a custom hook to manage saved keywords operations:

```typescript
// src/hooks/useSavedKeywords.ts
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

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

interface SavedKeywordsResponse {
  data: SavedKeyword[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export const useSavedKeywords = () => {
  const { token, isAuthenticated } = useAuth();
  const [savedKeywords, setSavedKeywords] = useState<SavedKeyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedKeywords = async (options: {
    category?: string;
    limit?: number;
    offset?: number;
    search?: string;
  } = {}) => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.category) params.append('category', options.category);
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.search) params.append('search', options.search);

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'https://newrankandrentapi.onrender.com'}/api/saved-keywords?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch saved keywords');
      }

      const data: SavedKeywordsResponse = await response.json();
      setSavedKeywords(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const saveKeyword = async (keywordData: {
    keyword: string;
    difficulty: string;
    volume: string;
    last_updated: string;
    search_engine: string;
    country: string;
    category: 'idea' | 'question';
    notes?: string;
  }) => {
    if (!isAuthenticated) {
      throw new Error('You must be logged in to save keywords');
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'https://newrankandrentapi.onrender.com'}/api/saved-keywords`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(keywordData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save keyword');
      }

      const data = await response.json();
      setSavedKeywords(prev => [data.data, ...prev]);
      return data.data;
    } catch (err) {
      throw err;
    }
  };

  const deleteKeyword = async (id: number) => {
    if (!isAuthenticated) {
      throw new Error('You must be logged in to delete keywords');
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'https://newrankandrentapi.onrender.com'}/api/saved-keywords/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete keyword');
      }

      setSavedKeywords(prev => prev.filter(kw => kw.id !== id));
    } catch (err) {
      throw err;
    }
  };

  const checkIfSaved = async (keyword: string, category: string = 'idea') => {
    if (!isAuthenticated) return false;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'https://newrankandrentapi.onrender.com'}/api/saved-keywords/check?keyword=${encodeURIComponent(keyword)}&category=${category}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        return false;
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
    checkIfSaved,
  };
};
```

## Step 3: Update Your KeywordResearch Component

Here's how to modify your existing component to add save functionality:

```typescript
// Updated KeywordResearch.tsx
import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Card,
    CardContent,
    Grid,
    Chip,
    CircularProgress,
    Alert,
    Container,
    Paper,
    Divider,
    Tabs,
    Tab,
    IconButton,
    Snackbar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextareaAutosize,
} from '@mui/material';
import { Search, TrendingUp, Target, Calendar, Bookmark, BookmarkBorder, Save, Close } from 'lucide-react';
import posthog from 'posthog-js';
import { useAuth } from '../contexts/AuthContext';
import { useSavedKeywords } from '../hooks/useSavedKeywords';

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

const KeywordResearch: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const { saveKeyword, checkIfSaved } = useSavedKeywords();
    
    const [keyword, setKeyword] = useState('');
    const [country, setCountry] = useState('us');
    const [searchEngine, setSearchEngine] = useState('google');
    const [ideas, setIdeas] = useState<KeywordSuggestion[]>([]);
    const [questions, setQuestions] = useState<KeywordSuggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState(0);
    
    // New state for save functionality
    const [savedStatus, setSavedStatus] = useState<Record<string, boolean>>({});
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState<KeywordSuggestion | null>(null);
    const [saveNotes, setSaveNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        severity: 'success' | 'error';
    }>({ open: false, message: '', severity: 'success' });

    // ... existing countries and searchEngines arrays ...

    const fetchSuggestions = async () => {
        if (!keyword.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                keyword: keyword.trim(),
                country,
                se: searchEngine,
            });

            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://newrankandrentapi.onrender.com'}/api/keyword-suggestions?${params}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch suggestions');
            }

            const data: KeywordSuggestionsResponse = await response.json();
            setIdeas(data.Ideas || []);
            setQuestions(data.Questions || []);

            // Check saved status for all suggestions
            if (isAuthenticated) {
                const allSuggestions = [...(data.Ideas || []), ...(data.Questions || [])];
                const savedStatusMap: Record<string, boolean> = {};
                
                for (const suggestion of allSuggestions) {
                    const isSaved = await checkIfSaved(suggestion.keyword, 'idea');
                    savedStatusMap[suggestion.keyword] = isSaved;
                }
                
                setSavedStatus(savedStatusMap);
            }

            // Track keyword research event
            posthog.capture('keyword_research_performed', {
                keyword: keyword.trim(),
                country,
                search_engine: searchEngine,
                ideas_count: data.Ideas?.length || 0,
                questions_count: data.Questions?.length || 0,
                total_results: (data.Ideas?.length || 0) + (data.Questions?.length || 0),
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');

            // Track error event
            posthog.capture('keyword_research_error', {
                keyword: keyword.trim(),
                country,
                search_engine: searchEngine,
                error: err instanceof Error ? err.message : 'Unknown error',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveKeyword = (suggestion: KeywordSuggestion, category: 'idea' | 'question') => {
        if (!isAuthenticated) {
            setSnackbar({
                open: true,
                message: 'Please log in to save keywords',
                severity: 'error',
            });
            return;
        }

        setSelectedSuggestion(suggestion);
        setSaveNotes('');
        setSaveDialogOpen(true);
    };

    const confirmSaveKeyword = async () => {
        if (!selectedSuggestion) return;

        setSaving(true);
        try {
            const category = activeTab === 0 ? 'idea' : 'question';
            
            await saveKeyword({
                keyword: selectedSuggestion.keyword,
                difficulty: selectedSuggestion.difficulty,
                volume: selectedSuggestion.volume || '',
                last_updated: selectedSuggestion.lastUpdated,
                search_engine: searchEngine,
                country,
                category,
                notes: saveNotes.trim() || undefined,
            });

            // Update saved status
            setSavedStatus(prev => ({
                ...prev,
                [selectedSuggestion.keyword]: true,
            }));

            setSnackbar({
                open: true,
                message: 'Keyword saved successfully!',
                severity: 'success',
            });

            // Track save event
            posthog.capture('keyword_saved', {
                keyword: selectedSuggestion.keyword,
                category,
                has_notes: !!saveNotes.trim(),
            });

        } catch (err) {
            setSnackbar({
                open: true,
                message: err instanceof Error ? err.message : 'Failed to save keyword',
                severity: 'error',
            });
        } finally {
            setSaving(false);
            setSaveDialogOpen(false);
        }
    };

    // ... existing helper functions (getDifficultyColor, formatDate, handleTabChange) ...

    const renderSuggestionCard = (suggestion: KeywordSuggestion, index: number, category: 'idea' | 'question') => (
        <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
                elevation={2}
                sx={{
                    height: '100%',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4,
                    }
                }}
            >
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography
                            variant="h6"
                            component="h3"
                            sx={{
                                fontWeight: 'bold',
                                color: 'primary.main',
                                wordBreak: 'break-word',
                                flex: 1,
                                mr: 1
                            }}
                        >
                            {suggestion.keyword}
                        </Typography>
                        
                        <IconButton
                            onClick={() => handleSaveKeyword(suggestion, category)}
                            color={savedStatus[suggestion.keyword] ? 'primary' : 'default'}
                            size="small"
                            title={savedStatus[suggestion.keyword] ? 'Already saved' : 'Save keyword'}
                        >
                            {savedStatus[suggestion.keyword] ? <Bookmark size={16} /> : <BookmarkBorder size={16} />}
                        </IconButton>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TrendingUp size={16} color="#666" />
                            <Typography variant="body2" color="text.secondary">
                                Volume:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {suggestion.volume || 'N/A'}
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Target size={16} color="#666" />
                            <Typography variant="body2" color="text.secondary">
                                Difficulty:
                            </Typography>
                            <Chip
                                label={suggestion.difficulty || 'N/A'}
                                color={getDifficultyColor(suggestion.difficulty) as any}
                                size="small"
                                variant="outlined"
                            />
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Calendar size={16} color="#666" />
                            <Typography variant="body2" color="text.secondary">
                                Updated:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {formatDate(suggestion.lastUpdated)}
                            </Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Grid>
    );

    const totalResults = ideas.length + questions.length;

    return (
        <Container maxWidth="xl">
            <Box sx={{ py: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                    Keyword Research
                </Typography>

                {/* ... existing form JSX ... */}

                {totalResults > 0 && (
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
                                Keyword Suggestions
                            </Typography>
                            <Chip
                                label={`${totalResults} total results`}
                                color="primary"
                                size="small"
                                sx={{ ml: 2 }}
                            />
                        </Box>

                        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                            <Tabs value={activeTab} onChange={handleTabChange} aria-label="keyword suggestions tabs">
                                <Tab
                                    label={`Keyword Ideas (${ideas.length})`}
                                    id="tab-0"
                                    aria-controls="tabpanel-0"
                                />
                                <Tab
                                    label={`Question Keywords (${questions.length})`}
                                    id="tab-1"
                                    aria-controls="tabpanel-1"
                                />
                            </Tabs>
                        </Box>

                        <div
                            role="tabpanel"
                            hidden={activeTab !== 0}
                            id="tabpanel-0"
                            aria-labelledby="tab-0"
                        >
                            {activeTab === 0 && ideas.length > 0 && (
                                <Grid container spacing={3}>
                                    {ideas.map((idea, index) => renderSuggestionCard(idea, index, 'idea'))}
                                </Grid>
                            )}
                            {activeTab === 0 && ideas.length === 0 && (
                                <Box sx={{ textAlign: 'center', py: 8 }}>
                                    <Typography variant="h6" color="text.secondary">
                                        No keyword ideas found
                                    </Typography>
                                </Box>
                            )}
                        </div>

                        <div
                            role="tabpanel"
                            hidden={activeTab !== 1}
                            id="tabpanel-1"
                            aria-labelledby="tab-1"
                        >
                            {activeTab === 1 && questions.length > 0 && (
                                <Grid container spacing={3}>
                                    {questions.map((question, index) => renderSuggestionCard(question, index, 'question'))}
                                </Grid>
                            )}
                            {activeTab === 1 && questions.length === 0 && (
                                <Box sx={{ textAlign: 'center', py: 8 }}>
                                    <Typography variant="h6" color="text.secondary">
                                        No question keywords found
                                    </Typography>
                                </Box>
                            )}
                        </div>
                    </Box>
                )}

                {/* Save Keyword Dialog */}
                <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
                    <DialogTitle>
                        Save Keyword
                        <IconButton
                            aria-label="close"
                            onClick={() => setSaveDialogOpen(false)}
                            sx={{
                                position: 'absolute',
                                right: 8,
                                top: 8,
                            }}
                        >
                            <Close />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="h6" color="primary">
                                {selectedSuggestion?.keyword}
                            </Typography>
                        </Box>
                        <TextField
                            fullWidth
                            label="Notes (optional)"
                            multiline
                            rows={4}
                            value={saveNotes}
                            onChange={(e) => setSaveNotes(e.target.value)}
                            placeholder="Add notes about this keyword..."
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setSaveDialogOpen(false)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button
                            onClick={confirmSaveKeyword}
                            variant="contained"
                            disabled={saving}
                            startIcon={saving ? <CircularProgress size={16} /> : <Save />}
                        >
                            {saving ? 'Saving...' : 'Save Keyword'}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Snackbar for notifications */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                >
                    <Alert
                        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                        severity={snackbar.severity}
                        sx={{ width: '100%' }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box>
        </Container>
    );
};

export default KeywordResearch;
```

## Step 4: Create Saved Keywords Management Page

Create a new page to manage saved keywords:

```typescript
// src/pages/SavedKeywords.tsx
import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Container,
    Grid,
    Card,
    CardContent,
    Chip,
    IconButton,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    CircularProgress,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextareaAutosize,
    Pagination,
} from '@mui/material';
import { Delete, Edit, Search, FilterList } from 'lucide-react';
import { useSavedKeywords } from '../hooks/useSavedKeywords';
import { useAuth } from '../contexts/AuthContext';

const SavedKeywords: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const { savedKeywords, loading, error, fetchSavedKeywords, deleteKeyword } = useSavedKeywords();
    
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<string>('');
    const [page, setPage] = useState(1);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedKeyword, setSelectedKeyword] = useState<any>(null);
    const [editNotes, setEditNotes] = useState('');

    useEffect(() => {
        if (isAuthenticated) {
            fetchSavedKeywords({
                search: search.trim() || undefined,
                category: category || undefined,
                limit: 20,
                offset: (page - 1) * 20,
            });
        }
    }, [isAuthenticated, search, category, page]);

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this keyword?')) {
            try {
                await deleteKeyword(id);
            } catch (error) {
                console.error('Failed to delete keyword:', error);
            }
        }
    };

    const handleEdit = (keyword: any) => {
        setSelectedKeyword(keyword);
        setEditNotes(keyword.notes || '');
        setEditDialogOpen(true);
    };

    if (!isAuthenticated) {
        return (
            <Container maxWidth="lg">
                <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography variant="h5" color="text.secondary">
                        Please log in to view your saved keywords
                    </Typography>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg">
            <Box sx={{ py: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                    My Saved Keywords
                </Typography>

                {/* Filters */}
                <Box sx={{ mb: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Search keywords"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                InputProps={{
                                    startAdornment: <Search size={20} style={{ marginRight: 8 }} />,
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <FormControl fullWidth>
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={category}
                                    label="Category"
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    <MenuItem value="">All Categories</MenuItem>
                                    <MenuItem value="idea">Ideas</MenuItem>
                                    <MenuItem value="question">Questions</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<FilterList />}
                                onClick={() => {
                                    setSearch('');
                                    setCategory('');
                                    setPage(1);
                                }}
                            >
                                Clear Filters
                            </Button>
                        </Grid>
                    </Grid>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : savedKeywords.length > 0 ? (
                    <>
                        <Grid container spacing={3}>
                            {savedKeywords.map((keyword) => (
                                <Grid item xs={12} sm={6} md={4} key={keyword.id}>
                                    <Card elevation={2}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                                <Typography variant="h6" component="h3" sx={{ fontWeight: 'bold', flex: 1, mr: 1 }}>
                                                    {keyword.keyword}
                                                </Typography>
                                                <Box>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleEdit(keyword)}
                                                        title="Edit notes"
                                                    >
                                                        <Edit size={16} />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleDelete(keyword.id)}
                                                        title="Delete keyword"
                                                    >
                                                        <Delete size={16} />
                                                    </IconButton>
                                                </Box>
                                            </Box>

                                            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                                <Chip
                                                    label={keyword.category}
                                                    color={keyword.category === 'idea' ? 'primary' : 'secondary'}
                                                    size="small"
                                                />
                                                <Chip
                                                    label={keyword.difficulty}
                                                    color={keyword.difficulty === 'Easy' ? 'success' : keyword.difficulty === 'Medium' ? 'warning' : 'error'}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </Box>

                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="body2" color="text.secondary">
                                                    Volume: {keyword.volume}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Updated: {new Date(keyword.last_updated).toLocaleDateString()}
                                                </Typography>
                                            </Box>

                                            {keyword.notes && (
                                                <Box sx={{ mt: 2 }}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Notes: {keyword.notes}
                                                    </Typography>
                                                </Box>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>

                        {/* Pagination would go here if needed */}
                    </>
                ) : (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                        <Typography variant="h6" color="text.secondary">
                            No saved keywords found
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Start by saving keywords from your keyword research
                        </Typography>
                    </Box>
                )}
            </Box>
        </Container>
    );
};

export default SavedKeywords;
```

## Step 5: Update App Routing

Add the saved keywords page to your routing:

```typescript
// src/App.tsx or your routing configuration
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import KeywordResearch from './pages/KeywordResearch';
import SavedKeywords from './pages/SavedKeywords';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/keyword-research" element={<KeywordResearch />} />
                    <Route path="/saved-keywords" element={<SavedKeywords />} />
                    {/* ... other routes ... */}
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
```

## Step 6: Add Navigation

Update your navigation to include the saved keywords page:

```typescript
// In your navigation component
<Button
    component={Link}
    to="/saved-keywords"
    startIcon={<Bookmark />}
>
    Saved Keywords
</Button>
```

## Key Features Added

1. **Save Button**: Each keyword suggestion now has a save button (bookmark icon)
2. **Save Dialog**: Users can add optional notes when saving keywords
3. **Saved Status**: Visual indication of which keywords are already saved
4. **Saved Keywords Page**: Dedicated page to manage saved keywords
5. **Search & Filter**: Filter saved keywords by category and search text
6. **Edit & Delete**: Manage saved keywords with edit and delete functionality
7. **Authentication Check**: Ensures users are logged in before saving
8. **Error Handling**: Proper error messages and loading states
9. **Analytics**: Tracks save events for analytics

## Environment Variables

Ensure your `.env` file includes:

```env
VITE_API_BASE_URL=https://newrankandrentapi.onrender.com
```

## Testing the Integration

1. **Test Authentication**: Ensure users must be logged in to save keywords
2. **Test Save Functionality**: Try saving keywords with and without notes
3. **Test Duplicate Prevention**: Try saving the same keyword twice
4. **Test Saved Keywords Page**: Navigate to the saved keywords page and verify functionality
5. **Test Search & Filter**: Use the search and filter features on the saved keywords page

## Error Handling

The integration includes comprehensive error handling:
- Network errors
- Authentication errors
- Validation errors
- Duplicate keyword errors

All errors are displayed to users via snackbar notifications.

## Performance Considerations

1. **Debounced Search**: Consider debouncing the search input to reduce API calls
2. **Pagination**: Implement pagination for large lists of saved keywords
3. **Caching**: Consider caching saved keywords locally for better performance
4. **Optimistic Updates**: Update UI immediately before API confirmation for better UX

This integration provides a complete saved keywords system that seamlessly integrates with your existing keyword research functionality.
