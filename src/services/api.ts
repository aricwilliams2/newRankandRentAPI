const API_BASE_URL = 'https://newrankandrentapi.onrender.com/api';

export interface ApiResponse<T> {
  data: T[];
  pagination: any;
}

export interface Website {
  id: string;
  domain: string;
  niche: string;
  status: 'active' | 'inactive' | 'suspended';
  monthly_revenue: string;
  domain_authority: number;
  backlinks: number;
  organic_keywords: number;
  organic_traffic: number;
  top_keywords?: string[];
  competitors?: string[];
  seo_last_updated?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  website_id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignee: string;
  due_date: string;
  website_domain?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  totalRevenue: {
    value: string;
    change: string;
    label: string;
  };
  activeWebsites: {
    value: string;
    change: string;
    label: string;
  };
  totalLeads: {
    value: string;
    change: string;
    label: string;
  };
  activeClients: {
    value: string;
    change: string;
    label: string;
  };
  totalPhones: {
    value: string;
    change: string;
    label: string;
  };
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  description: string;
  website: string;
  timestamp: string;
  timeAgo: string;
}

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Website API calls
  async getWebsites(params?: {
    status?: string;
    search?: string;
    sort_by?: string;
    sort_dir?: string;
  }): Promise<ApiResponse<Website>> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.sort_by) searchParams.append('sort_by', params.sort_by);
    if (params?.sort_dir) searchParams.append('sort_dir', params.sort_dir);

    const query = searchParams.toString();
    return this.request<ApiResponse<Website>>(`/websites${query ? `?${query}` : ''}`);
  }

  async getWebsite(id: string): Promise<Website> {
    return this.request<Website>(`/websites/${id}`);
  }

  async createWebsite(data: Partial<Website>): Promise<Website> {
    return this.request<Website>('/websites', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWebsite(id: string, data: Partial<Website>): Promise<Website> {
    return this.request<Website>(`/websites/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteWebsite(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/websites/${id}`, {
      method: 'DELETE',
    });
  }

  // Task API calls
  async getTasks(params?: {
    status?: string;
    website_id?: string;
    priority?: string;
    assignee?: string;
    search?: string;
    sort_by?: string;
    sort_dir?: string;
  }): Promise<ApiResponse<Task>> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.website_id) searchParams.append('website_id', params.website_id);
    if (params?.priority) searchParams.append('priority', params.priority);
    if (params?.assignee) searchParams.append('assignee', params.assignee);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.sort_by) searchParams.append('sort_by', params.sort_by);
    if (params?.sort_dir) searchParams.append('sort_dir', params.sort_dir);

    const query = searchParams.toString();
    return this.request<ApiResponse<Task>>(`/tasks${query ? `?${query}` : ''}`);
  }

  async getTask(id: string): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`);
  }

  async createTask(data: Partial<Task>): Promise<Task> {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  }

  // Dashboard API calls
  async getDashboardStats(): Promise<{ success: boolean; data: DashboardStats }> {
    return this.request<{ success: boolean; data: DashboardStats }>('/dashboard/stats');
  }

  async getRecentActivity(limit?: number): Promise<{ success: boolean; data: Activity[] }> {
    const query = limit ? `?limit=${limit}` : '';
    return this.request<{ success: boolean; data: Activity[] }>(`/dashboard/activity${query}`);
  }
}

export const apiService = new ApiService();