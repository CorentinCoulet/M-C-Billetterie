import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  includeAuth?: boolean;
}

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  status: number | null;
}

/**
 * Custom hook for making API requests
 * Handles authentication, loading states, and errors
 */
export function useApi() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * Make an API request
   */
  const request = useCallback(
    async <T = any>(
      endpoint: string,
      options: ApiOptions = {}
    ): Promise<ApiResponse<T>> => {
      const {
        method = 'GET',
        headers = {},
        body,
        includeAuth = true,
      } = options;

      setLoading(true);

      try {
        // Prepare headers
        const requestHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...headers,
        };

        // Add authorization header if needed
        if (includeAuth && user) {
          // You might need to adjust this based on your auth implementation
          // This assumes you're using cookies for auth, which is handled automatically
        }

        // Prepare request options
        const requestOptions: RequestInit = {
          method,
          headers: requestHeaders,
          credentials: 'include', // Include cookies
        };

        // Add body if provided
        if (body) {
          requestOptions.body = JSON.stringify(body);
        }

        // Make the request
        const response = await fetch(`/api${endpoint}`, requestOptions);
        const status = response.status;

        // Parse the response
        let data = null;
        try {
          data = await response.json();
        } catch (e) {
          // Response might not contain JSON
        }

        // Handle error responses
        if (!response.ok) {
          const errorMessage = data?.message || response.statusText || 'An error occurred';
          return {
            data: null,
            error: errorMessage,
            loading: false,
            status,
          };
        }

        // Return successful response
        return {
          data,
          error: null,
          loading: false,
          status,
        };
      } catch (error) {
        // Handle network errors
        return {
          data: null,
          error: error instanceof Error ? error.message : 'Network error',
          loading: false,
          status: null,
        };
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  /**
   * Convenience methods for common HTTP methods
   */
  const get = useCallback(
    <T = any>(endpoint: string, options: Omit<ApiOptions, 'method' | 'body'> = {}) => 
      request<T>(endpoint, { ...options, method: 'GET' }),
    [request]
  );

  const post = useCallback(
    <T = any>(endpoint: string, body: any, options: Omit<ApiOptions, 'method'> = {}) => 
      request<T>(endpoint, { ...options, method: 'POST', body }),
    [request]
  );

  const put = useCallback(
    <T = any>(endpoint: string, body: any, options: Omit<ApiOptions, 'method'> = {}) => 
      request<T>(endpoint, { ...options, method: 'PUT', body }),
    [request]
  );

  const patch = useCallback(
    <T = any>(endpoint: string, body: any, options: Omit<ApiOptions, 'method'> = {}) => 
      request<T>(endpoint, { ...options, method: 'PATCH', body }),
    [request]
  );

  const del = useCallback(
    <T = any>(endpoint: string, options: Omit<ApiOptions, 'method'> = {}) => 
      request<T>(endpoint, { ...options, method: 'DELETE' }),
    [request]
  );

  return {
    loading,
    request,
    get,
    post,
    put,
    patch,
    delete: del,
  };
}

export default useApi;