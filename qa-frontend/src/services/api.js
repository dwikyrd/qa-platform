import axios from "axios";

// Create axios instance with base config
const api = axios.create({
  baseURL: "", // Sesuaikan dengan port Flask Anda
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Untuk session cookies
});

// Request interceptor untuk add token jika ada
api.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem("user");
    if (user) {
      const userData = JSON.parse(user);
      if (userData.token) {
        config.headers.Authorization = `Bearer ${userData.token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor untuk handle error global
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear session dan redirect ke login
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// ============================================================
// AUTH API
// ============================================================
export const authAPI = {
  login: (username, password) =>
    api.post("/auth/login", { username, password }),

  logout: () => {
    localStorage.removeItem("user");
    return api.post("/auth/logout");
  },

  getCurrentUser: () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  changePassword: (oldPassword, newPassword) =>
    api.post("/auth/change-password", {
      old_password: oldPassword,
      new_password: newPassword,
    }),
};

// ============================================================
// PROJECT API
// ============================================================
export const projectAPI = {
  getAll: () => api.get("/projects"),

  create: (name, link = "") => api.post("/add_project", { name, link }),

  update: (id, name, link) => api.post("/update_project", { id, name, link }),

  archive: (id) => api.post(`/archive_project/${id}`),

  restore: (id) => api.post(`/restore_project/${id}`),

  deletePermanent: (id, confirmName) =>
    api.post(`/permanent_delete_project/${id}`, { confirm_name: confirmName }),
};

// ============================================================
// SCENARIO API
// ============================================================
export const scenarioAPI = {
  getAll: (pid, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/scenarios/${pid}${query ? "?" + query : ""}`);
  },

  getById: (sid) => api.get(`/scenario/${sid}`),

  create: (pid, title) =>
    api.post(
      `/add_scenario/${pid}`,
      { title },
      {
        headers: { "Content-Type": "application/json" },
      },
    ),

  rename: (sid, title) => api.post(`/rename_scenario/${sid}`, { title }),

  updateMeta: (sid, meta) => api.post(`/update_scenario_meta/${sid}`, meta),

  archive: (sid) => api.post(`/archive_scenario/${sid}`),

  restore: (sid) => api.post(`/restore_scenario/${sid}`),

  deletePermanent: (sid) => api.post(`/hard_delete_scenario/${sid}`),
};

// ============================================================
// TEST CASE API
// ============================================================
export const testCaseAPI = {
  add: (sid) => api.post(`/add_row/${sid}`),

  update: (sid, tcId, field, value) =>
    api.post(`/update_cell/${sid}`, {
      tc_id: tcId,
      field,
      value,
    }),

  delete: (sid, tcId) => api.post(`/delete_tc/${sid}`, { tc_id: tcId }),

  bulkDelete: (sid, tcIds) =>
    api.post(`/bulk_delete_tc/${sid}`, { tc_ids: tcIds }),

  copy: (sid, sourceTcId) =>
    api.post(`/copy_tc/${sid}`, { source_tc_id: sourceTcId }),

  reorder: (sid, order) => api.post(`/reorder_tc/${sid}`, { order }),

  getSummary: (sid) => api.get(`/summary/${sid}`),

  toggleReview: (sid, tcId) =>
    api.post(`/toggle_review/${sid}`, { tc_id: tcId }),

  getReviewStats: (sid) => api.get(`/review_stats/${sid}`),
};

// ============================================================
// ATTACHMENT API
// ============================================================
export const attachmentAPI = {
  get: (sid, tcId) => api.get(`/get_attachments/${sid}/${tcId}`),

  uploadImage: (sid, tcId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("tc_id", tcId);

    return api.post(`/upload_screenshot/${sid}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  saveLog: (sid, tcId, content, customName = "") =>
    api.post(`/save_log/${sid}`, {
      tc_id: tcId,
      content,
      custom_name: customName,
    }),

  deleteImage: (sid, id) => api.post(`/delete_screenshot/${sid}`, { id }),

  deleteLog: (sid, id) => api.post(`/delete_log/${sid}`, { id }),

  rename: (sid, id, type, name) =>
    api.post(`/rename_attachment/${sid}`, {
      id,
      type,
      name,
    }),

  reorder: (sid, tcId, type, order) =>
    api.post(`/reorder_attachments/${sid}`, {
      tc_id: tcId,
      type,
      order,
    }),

  getCounts: (sid) => api.get(`/attachment_counts/${sid}`),
};

// ============================================================
// DASHBOARD API (NEW - Untuk charts & stats)
// ============================================================
export const dashboardAPI = {
  getGlobalStats: () => api.get("/global_stats"),

  getProjectTicketCounts: () => api.get("/project_ticket_counts"),

  getTicketStatsByPeriod: (year, month) => {
    const params = new URLSearchParams();
    if (year) params.append("year", year);
    if (month) params.append("month", month);
    return api.get(`/ticket_stats_by_period?${params.toString()}`);
  },

  getAvailableMonths: () => api.get("/available_months"),

  getTicketsByTester: () => api.get("/tickets_by_tester"),

  getUsersList: () => api.get("/users_list"),
};

// ============================================================
// ADMIN API
// ============================================================
export const adminAPI = {
  getUsers: () => api.get("/admin/users"),

  createUser: (userData) => api.post("/admin/users", userData),

  updateUser: (userId, userData) => api.put(`/admin/users/${userId}`, userData),

  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),

  getActivityLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/admin/activity-logs?${query}`);
  },
};

// ============================================================
// AI API
// ============================================================
export const aiAPI = {
  generate: (sid, prompt) => api.post(`/ai_generate/${sid}`, { prompt }),
};

// ============================================================
// IMPORT API
// ============================================================
export const importAPI = {
  excel: (sid, file) => {
    const formData = new FormData();
    formData.append("file", file);

    return api.post(`/import_excel/${sid}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  importExcel: (sid, file) => {
    const formData = new FormData();
    formData.append("file", file);

    return api.post(`/import_excel/${sid}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};

// ✅ TAMBAHKAN: Response interceptor untuk handle error
api.interceptors.response.use(
  (response) => {
    // Jika response.data adalah object dengan property 'error', return array kosong
    if (
      response.data &&
      typeof response.data === "object" &&
      response.data.error
    ) {
      console.warn("API returned error:", response.data.error);
      response.data = []; // Return array kosong agar tidak crash
    }
    return response;
  },
  (error) => {
    console.error("API Error:", error);

    // Jika 401 Unauthorized, redirect ke login
    if (error.response?.status === 401) {
      if (!window.location.pathname.includes("/login")) {
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

// Request interceptor - tambah token jika ada
api.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.token) {
          config.headers.Authorization = `Bearer ${userData.token}`;
        }
      } catch (e) {
        console.error("Error parsing user:", e);
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default api;
