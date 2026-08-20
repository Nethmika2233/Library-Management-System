import axios from "axios";

export const API_BASE = "http://localhost:5000/api";

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// A 401 means the session token is missing/expired — force back to login
// rather than leaving the UI in a half-authenticated state.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

export default api;
