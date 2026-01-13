// src/services/api.ts

// =================================================================
// ESTE ARCHIVO CENTRALIZA TODAS LAS LLAMADAS AL BACKEND
// =================================================================

const API_BASE_URL = 'http://localhost:8000';

// Función helper para obtener headers automáticamente
const getHeaders = (isMultipart: boolean = false): HeadersInit => {
    const headers: HeadersInit = {};
    const token = localStorage.getItem('jwt_token');

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Si NO es multipart (subida de archivos), decimos que enviamos JSON.
    // Si ES multipart, el navegador pone el Content-Type automáticamente con el boundary.
    if (!isMultipart) {
        headers['Content-Type'] = 'application/json';
    }

    return headers;
};

// Manejador central de respuestas
const handleResponse = async (response: Response) => {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        let message = 'Error desconocido';

        switch (response.status) {
            case 401:
                message = response.url.includes('/login')
                    ? 'El correo o la contraseña no son correctos.Verifica tus datos e inténtalo de nuevo.'
                    : 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente para continuar.';
                break;
            case 404:
                message = 'Recurso no encontrado.';
                break;
            case 409:
                message = data?.message || 'Conflicto: ya existe la cita o estás en la cola.';
                break;
            case 500:
                message = 'Error interno del servidor.';
                break;
            default:
                message = data?.message || `Error ${response.status}`;
        }

        const error: any = new Error(message);
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
};


// Objeto API principal
export const api = {
    // GET
    get: async <T>(endpoint: string): Promise<T> => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    // POST (JSON)
    post: async <T>(endpoint: string, body: any): Promise<T> => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(body),
        });
        return handleResponse(response);
    },

    // PATCH (JSON)
    patch: async <T>(endpoint: string, body: any): Promise<T> => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(body),
        });
        return handleResponse(response);
    },

    // DELETE
    delete: async <T>(endpoint: string): Promise<T> => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        return handleResponse(response);
    },

    // SUBIDA DE ARCHIVOS (Multipart)
    // Nota: Usamos POST o un método específico que soporte FormData
    upload: async <T>(endpoint: string, formData: FormData, method: 'POST' | 'PATCH' = 'POST'): Promise<T> => {
        // Truco Symfony/PHP para PATCH con archivos: Usar POST y añadir _method
        if (method === 'PATCH') {
            formData.append('_method', 'PATCH');
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST', // Siempre POST para archivos
            headers: getHeaders(true), // true = es multipart, no poner Content-Type manual
            body: formData,
        });
        return handleResponse(response);
    }
};

// Endpoints constantes para usar en la app
export const ENDPOINTS = {
    LOGIN: '/login',
    REGISTER: '/registro',
    PROFILE: '/api/profile',
    CHANGE_PASSWORD: '/api/profile/change-password',
    PETS: '/mascotas',
    ADD_PET: '/api/add',
    CITAS: '/api/citas',
    CITAS_USER: '/api/citas/usuario',
    CITAS_SHELTER: '/api/citas/protectora',
    QUEUE: '/api/citas/queue'
};