const apiUrl = import.meta.env.VITE_API_URL?.trim();

export const VITE_API_URL = apiUrl && apiUrl.length > 0 ? apiUrl : '/api/v1';