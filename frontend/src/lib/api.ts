export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function fileUrl(path?: string | null) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    let message = 'Erro na requisição';
    if (text) {
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data?.message)) {
          message = data.message.join(', ');
        } else if (data?.message) {
          message = data.message;
        } else if (data?.error) {
          message = data.error;
        } else {
          message = text;
        }
      } catch {
        message = text;
      }
    }
    throw new Error(message);
  }

  return res.json();
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  token?: string | null
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    body: formData,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    let message = 'Erro na requisição';
    if (text) {
      try {
        const data = JSON.parse(text);
        if (Array.isArray(data?.message)) {
          message = data.message.join(', ');
        } else if (data?.message) {
          message = data.message;
        } else if (data?.error) {
          message = data.error;
        } else {
          message = text;
        }
      } catch {
        message = text;
      }
    }
    throw new Error(message);
  }

  return res.json();
}
