const RAW_API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const API_URL = RAW_API_URL.replace(/\/$/, '');

export type ApiRequestOptions = Omit<RequestInit, 'headers'> & {
    token?: string;
    headers?: HeadersInit;
};

export class ApiError extends Error {
    status: number;
    statusText: string;
    body: unknown;

    constructor(message: string, status: number, statusText: string, body?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.statusText = statusText;
        this.body = body;
    }
}

export function buildApiUrl(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function buildAuthHeaders(token?: string, headers?: HeadersInit): HeadersInit | undefined {
    const normalizedHeaders = new Headers(headers);

    if (token) {
        normalizedHeaders.set('Authorization', `Bearer ${token}`);
    }

    return normalizedHeaders.keys().next().done ? undefined : normalizedHeaders;
}

export async function parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const body = isJson ? await response.json().catch(() => null) : await response.text().catch(() => null);

    if (!response.ok) {
        const message =
            (body && typeof body === 'object' && 'error' in body && (body as any).error) ||
            (body && typeof body === 'object' && 'message' in body && (body as any).message) ||
            `Request failed with status ${response.status}`;

        throw new ApiError(String(message), response.status, response.statusText, body);
    }

    return body as T;
}

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const { token, headers, ...init } = options;
    const response = await fetch(buildApiUrl(path), {
        ...init,
        headers: buildAuthHeaders(token, headers),
    });

    return parseResponse<T>(response);
}
