export interface Website {
  id: string;
  domain: string;
  niche: string;
  status: 'active' | 'inactive' | 'suspended';
  monthlyRevenue: number;
  phoneNumbers: any[];
  leads: any[];
  seoMetrics: {
    domainAuthority: number;
    backlinks: number;
    organicKeywords: number;
    organicTraffic: number;
    topKeywords: string[];
    competitors: string[];
    lastUpdated: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  websiteId: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignee: string;
  dueDate: Date;
  websiteDomain?: string;
  createdAt: Date;
  updatedAt: Date;
}