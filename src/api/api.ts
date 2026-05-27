import axios from 'axios';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000';

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Note {
  id: string;
  title: string;
  content: string;
  folderName?: string;
  sharedWithEmail?: string;
  createdAt: string;
}

export interface NoteData {
  title: string;
  content: string;
  folderName?: string;
  sharedWithEmail?: string;
}

export const loginUser = (email: string, password: string) =>
  api.post<{ access_token: string }>('/auth/login', { email, password });

export const registerUser = (email: string, password: string, name?: string) =>
  api.post('/auth/register', name ? { name, email, password } : { email, password });

export const getNotes = (search?: string) =>
  api.get<Note[]>('/notes', { params: search ? { search } : undefined });

export const getNoteById = (id: string) => api.get<Note>(`/notes/${id}`);

export const createNote = (data: NoteData) => api.post<Note>('/notes', data);

export const updateNote = (id: string, data: NoteData) =>
  api.patch<Note>(`/notes/${id}`, data);

export const deleteNote = (id: string) => api.delete(`/notes/${id}`);
