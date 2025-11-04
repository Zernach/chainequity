/**
 * Base HTTP client with common request logic
 * All handlers extend this base client
 */

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface RequestOptions extends RequestInit {
    includeAuth?: boolean;
}

export class BaseClient {
    protected baseURL: string;
    protected accessToken: string | null = null;

    constructor(baseURL: string = API_BASE_URL) {
        this.baseURL = baseURL;
    }

    /**
     * Set the access token for authenticated requests
     */
    setAccessToken(token: string | null) {
        this.accessToken = token;
    }

    /**
     * Get the current access token
     */
    getAccessToken(): string | null {
        return this.accessToken;
    }

    /**
     * Get headers for requests
     */
    protected getHeaders(includeAuth: boolean = false): HeadersInit {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (includeAuth && this.accessToken) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        return headers;
    }

    /**
     * Make an HTTP request
     */
    protected async request<T>(
        endpoint: string,
        options?: RequestOptions
    ): Promise<T> {
        try {
            const { includeAuth = false, ...fetchOptions } = options || {};

            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...fetchOptions,
                headers: {
                    ...this.getHeaders(includeAuth),
                    ...fetchOptions?.headers,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    /**
     * GET request
     */
    protected async get<T>(endpoint: string, includeAuth: boolean = false): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET', includeAuth });
    }

    /**
     * POST request
     */
    protected async post<T>(
        endpoint: string,
        body?: any,
        includeAuth: boolean = false
    ): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
            includeAuth,
        });
    }

    /**
     * PUT request
     */
    protected async put<T>(
        endpoint: string,
        body?: any,
        includeAuth: boolean = false
    ): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
            includeAuth,
        });
    }

    /**
     * DELETE request
     */
    protected async delete<T>(endpoint: string, includeAuth: boolean = false): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE', includeAuth });
    }
}

