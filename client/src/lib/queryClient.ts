import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Old signature for backward compatibility
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response>;
// New signature with options object and generic type
export async function apiRequest<T = unknown>(
  url: string,
  options: RequestInit,
): Promise<T>;
// Implementation
export async function apiRequest<T = unknown>(
  methodOrUrl: string,
  urlOrOptions: string | RequestInit,
  data?: unknown,
): Promise<T | Response> {
  let url: string;
  let options: RequestInit;

  if (typeof urlOrOptions === 'string') {
    // Old signature: apiRequest(method, url, data)
    url = urlOrOptions;
    options = {
      method: methodOrUrl,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    };
  } else {
    // New signature: apiRequest<T>(url, options)
    url = methodOrUrl;
    options = {
      ...urlOrOptions,
      credentials: "include",
    };
  }

  const res = await fetch(url, options);
  await throwIfResNotOk(res);

  // If using new signature, parse and return JSON
  if (typeof urlOrOptions === 'object') {
    // Handle 204 No Content - return undefined
    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return undefined as T;
    }
    return await res.json() as T;
  }

  // If using old signature, return Response
  return res as Response;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Separate path segments (strings/numbers) from params/cacheKey object
    const pathSegments: (string | number)[] = [];
    let paramsObject: Record<string, string> | null = null;

    for (let i = 0; i < queryKey.length; i++) {
      const part = queryKey[i];
      
      // Skip undefined/null entries
      if (part === undefined || part === null) {
        continue;
      }
      
      // If it's a string or number, add to path
      if (typeof part === 'string' || typeof part === 'number') {
        pathSegments.push(part);
      }
      // If it's the last item and it's a plain object
      else if (i === queryKey.length - 1 && typeof part === 'object' && !Array.isArray(part)) {
        const obj = part as any;
        
        // New pattern: { cacheKey: {...}, params: {...} }
        // cacheKey is for cache segmentation only (not in URL)
        // params are serialized as query parameters
        if ('cacheKey' in obj || 'params' in obj) {
          const { cacheKey, params, ...rest } = obj;
          // Use params if provided, otherwise use rest (excluding cacheKey)
          paramsObject = params ?? (Object.keys(rest).length > 0 ? rest : null);
        }
        // Legacy pattern: entire object is query params
        else {
          paramsObject = obj;
        }
      }
      // Unsupported type
      else {
        throw new Error(`Unsupported queryKey segment type at index ${i}: ${typeof part}`);
      }
    }

    // Build URL path from string/number segments
    const urlPath = pathSegments.join("/");
    
    // Add query params if present
    let finalUrl = urlPath;
    if (paramsObject) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(paramsObject)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      if (queryString) {
        finalUrl = `${urlPath}?${queryString}`;
      }
    }

    const res = await fetch(finalUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
