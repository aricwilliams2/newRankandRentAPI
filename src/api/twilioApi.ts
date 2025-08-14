import axios from 'axios';

// ---- Env (Vite) ----
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
if (!API_BASE_URL) {
  console.error('VITE_API_BASE_URL is not set. Mode:', import.meta.env.MODE);
  throw new Error('Missing VITE_API_BASE_URL');
}

// ---- Axios instance with auth ----
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

console.log("sss",API_BASE_URL);

// ===============================
// Twilio API (all under API_BASE_URL)
// ===============================
export const twilioApi = {
  // === AUTH ===
  getAccessToken: async (identity?: string) => {
    const effectiveIdentity = identity ?? `user_${Date.now()}`;
    const { data } = await apiClient.post('/api/twilio/access-token', {
      identity: effectiveIdentity
    });
    return data as { success: boolean; token: string; identity: string; availableNumbers?: any[] };
  },

  // === NUMBERS ===
  getMyNumbers: async () => (await apiClient.get('/api/twilio/my-numbers')).data,
  getAvailableNumbers: async (params: { areaCode?: string; country?: string; limit?: number }) =>
    (await apiClient.get('/api/twilio/available-numbers', { params })).data,
  buyNumber: async (data: { phoneNumber: string; country?: string; areaCode?: string; websiteId?: string }) =>
    (await apiClient.post('/api/twilio/buy-number', data)).data,
  updatePhoneNumber: async (id: string, updates: { websiteId?: string; status?: 'active' | 'inactive' }) =>
    (await apiClient.put(`/api/twilio/my-numbers/${id}`, updates)).data,
  releasePhoneNumber: async (id: string) =>
    (await apiClient.delete(`/api/twilio/my-numbers/${id}`)).data,

  // === CALL LOGS ===
  getCallLogs: async (params: { page?: number; limit?: number; status?: string; phoneNumberId?: string } = {}) =>
    (await apiClient.get('/api/twilio/call-logs', { params })).data,
  getCallLog: async (callSid: string) =>
    (await apiClient.get(`/api/twilio/call-logs/${callSid}`)).data,

  // === RECORDINGS ===
  getRecordings: async (params: { page?: number; limit?: number; callSid?: string; phoneNumberId?: string } = {}) =>
    (await apiClient.get('/api/twilio/recordings', { params })).data,
  getCallRecordings: async (callSid: string) =>
    (await apiClient.get(`/api/twilio/recordings/${callSid}`)).data,
  deleteRecording: async (recordingSid: string) =>
    (await apiClient.delete(`/api/twilio/recordings/${recordingSid}`)).data,

  // If you need a direct URL for audio streaming (no axios, just a URL)
  getRecordingStreamUrl: (recordingSid: string) => {
    const token = localStorage.getItem('token');
    return `${API_BASE_URL}/api/twilio/recording/${recordingSid}?token=${token}`;
  },

  // Fetch a Blob URL with Authorization header
  getRecordingStreamWithAuth: async (recordingSid: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/api/twilio/recording/${recordingSid}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch recording: ${res.status}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  // === LEGACY ===
  getPhoneNumbers: async () => (await apiClient.get('/api/twilio/phone-numbers')).data,
  deletePhoneNumber: async (phoneNumberId: string) =>
    (await apiClient.delete(`/api/twilio/phone-numbers/${phoneNumberId}`)).data,

  // === CALL FORWARDING ===
  getCallForwardings: async () => (await apiClient.get('/api/call-forwarding')).data,
  createCallForwarding: async (data: {
    phone_number_id: number; // Fixed: backend expects number, not string
    forward_to_number: string;
    forwarding_type: 'always' | 'busy' | 'no_answer' | 'unavailable';
    ring_timeout?: number;
    is_active?: boolean; // Added: backend supports this field
  }) => (await apiClient.post('/api/call-forwarding', data)).data,
  updateCallForwarding: async (id: string, updates: {
    forward_to_number?: string;
    forwarding_type?: 'always' | 'busy' | 'no_answer' | 'unavailable';
    ring_timeout?: number;
    is_active?: boolean;
  }) => (await apiClient.put(`/api/call-forwarding/${id}`, updates)).data,
  toggleCallForwarding: async (id: string, isActive: boolean) =>
    (await apiClient.patch(`/api/call-forwarding/${id}/toggle`, { is_active: isActive })).data,
  deleteCallForwarding: async (id: string) =>
    (await apiClient.delete(`/api/call-forwarding/${id}`)).data,
  getCallForwardingByPhoneNumber: async (phoneNumberId: string) =>
    (await apiClient.get(`/api/call-forwarding/phone-number/${phoneNumberId}`)).data,
};

// ===============================
// BuddyBoss Moderation API (same base, /wp-json prefix)
// ===============================
export const moderationApi = {
  // Report an activity (user action)
  reportActivity: async (payload: { object_id: number; reason: string }) =>
    (await apiClient.post('/wp-json/custom/v1/report', payload)).data,
  // View activity (by BuddyBoss activity_id)
  fetchActivity: async (activityId: number) =>
    (await apiClient.get(`/wp-json/custom/v1/activity/${activityId}`)).data,
  // Delete activity (by activity_id)
  deleteActivity: async (activityId: number) =>
    (await apiClient.delete(`/wp-json/custom/v1/activity/${activityId}`)).data,
  // Fetch all flagged reports (returns activity_id)
  fetchFlaggedReports: async () =>
    (await apiClient.get('/wp-json/custom/v1/flagged')).data,
  // Resolve flagged report (by activity_id)
  resolveFlaggedByActivity: async (activityId: number) =>
    (await apiClient.post(`/wp-json/custom/v1/flagged/${activityId}/resolve`)).data,
};

export default { twilioApi, moderationApi, apiClient };
