// Lớp gọi API: giữ accessToken trong bộ nhớ, tự refresh bằng cookie httpOnly khi hết hạn.
let accessToken = null;
export const setToken = (t) => { accessToken = t; };

export class ApiError extends Error {
  constructor(status, body) { super(body?.error || `HTTP ${status}`); this.status = status; this.body = body; }
}

async function raw(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

export async function api(path, opts) {
  try {
    return await raw(path, opts);
  } catch (e) {
    if (e.status === 401 && accessToken && !path.startsWith('/api/auth/')) {
      const r = await raw('/api/auth/refresh', { method: 'POST' }); // hết hạn → thử refresh một lần
      accessToken = r.accessToken;
      return raw(path, opts);
    }
    throw e;
  }
}

export const auth = {
  async login(email, password) {
    const r = await raw('/api/auth/login', { method: 'POST', body: { email, password } });
    accessToken = r.accessToken;
    return r;
  },
  async restore() {
    try { const r = await raw('/api/auth/refresh', { method: 'POST' }); accessToken = r.accessToken; return r; }
    catch { return null; }
  },
  async logout() { try { await raw('/api/auth/logout', { method: 'POST' }); } finally { accessToken = null; } },
};

// Tải file nhị phân có kèm Bearer token (link <a> thường không gửi được header).
export async function download(path, filename) {
  const doFetch = () => fetch(path, { credentials: 'same-origin', headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} });
  let res = await doFetch();
  if (res.status === 401) { const r = await raw('/api/auth/refresh', { method: 'POST' }); accessToken = r.accessToken; res = await doFetch(); }
  if (!res.ok) throw new ApiError(res.status, null);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
