import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://reachinbox-email-scheduler-7-afgl.onrender.com/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("reachinbox_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (userData: { email?: string; name?: string; avatar?: string; googleId?: string }) =>
    api.post("/auth/login", userData),
  getMe: () => api.get("/auth/me"),
};

export const sendersApi = {
  getAll: () => api.get("/senders"),
  create: (data: { name: string; email: string; hourlyLimit?: number }) =>
    api.post("/senders", data),
  update: (id: string, data: { name?: string; hourlyLimit?: number; isActive?: boolean }) =>
    api.put(`/senders/${id}`, data),
};

export const emailsApi = {
  schedule: (data: {
    senderId: string;
    recipients: string[];
    subject: string;
    body: string;
    scheduledAt: string;
    delaySeconds: number;
    hourlyLimit: number;
  }) => api.post("/emails/schedule", data),

  parseCsv: (formData: FormData) =>
    api.post("/emails/parse-csv", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  getScheduled: (params?: { query?: string; page?: number; limit?: number }) =>
    api.get("/emails/scheduled", { params }),

  getSent: (params?: { query?: string; page?: number; limit?: number }) =>
    api.get("/emails/sent", { params }),

  cancel: (id: string) => api.delete(`/emails/${id}`),
};

export const slackApi = {
  getStatus: () => api.get("/slack/status"),
  connect: (data: { webhookUrl: string; channel?: string; teamName?: string }) =>
    api.post("/slack/connect", data),
  disconnect: () => api.post("/slack/disconnect"),
  test: () => api.post("/slack/test"),
};

export const analyticsApi = {
  getStats: () => api.get("/analytics/stats"),
};
