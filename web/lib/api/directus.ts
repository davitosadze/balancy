const DIRECTUS_URL =
  process.env.NEXT_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";
const USER_FIELDS =
  "id,email,first_name,last_name,avatar,locale,push_token,premium_active,premium_plan,premium_until";

function noCacheHeaders(headers: HeadersInit = {}) {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    ...headers,
  };
}

function withCacheBust(path: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}_=${Date.now()}`;
}

// Token storage (browser localStorage)
const TOKEN_KEY = "directus_token";
const REFRESH_KEY = "directus_refresh";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// Core client (used for direct fetch calls with token)
export const DIRECTUS_BASE = DIRECTUS_URL;

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function loginWithPassword(email: string, password: string) {
  const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.errors?.[0]?.message ?? "Login failed");
  }
  const json = await res.json();
  return json.data as {
    access_token: string;
    refresh_token: string;
    expires: number;
  };
}

export async function logoutApi(refreshToken: string) {
  await fetch(`${DIRECTUS_URL}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  }).catch(() => {});
}

export async function registerUser(payload: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}) {
  const res = await fetch(`${DIRECTUS_URL}/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, role: undefined }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.errors?.[0]?.message ?? "Registration failed");
  }
}

export async function getMe(token: string) {
  const profileRes = await fetch(withCacheBust(`${DIRECTUS_URL}/account-profile/me`), {
    cache: "no-store",
    headers: noCacheHeaders({ Authorization: `Bearer ${token}` }),
  }).catch(() => null);
  if (profileRes?.ok) {
    const profileJson = await profileRes.json();
    return profileJson.data;
  }

  const fieldsRes = await fetch(withCacheBust(`${DIRECTUS_URL}/users/me?fields=${USER_FIELDS}`), {
    cache: "no-store",
    headers: noCacheHeaders({ Authorization: `Bearer ${token}` }),
  });
  if (fieldsRes.ok) {
    const fieldsJson = await fieldsRes.json();
    return fieldsJson.data;
  }

  const baseRes = await fetch(withCacheBust(`${DIRECTUS_URL}/users/me`), {
    cache: "no-store",
    headers: noCacheHeaders({ Authorization: `Bearer ${token}` }),
  });
  if (!baseRes.ok) throw new Error("Failed to fetch user");

  const baseJson = await baseRes.json();
  return baseJson.data;
}

export async function updateProfile(
  token: string,
  payload: Record<string, unknown>,
) {
  const res = await fetch(`${DIRECTUS_URL}/users/me`, {
    method: "PATCH",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...noCacheHeaders({ Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  const json = await res.json();

  const fresh = await getMe(token).catch(() => null);
  return mergeDefined(payload, fresh ?? json.data);
}

export async function updatePremiumActive(token: string, active: boolean) {
  const res = await fetch(
    `${DIRECTUS_URL}/premium-status/me?fields=${USER_FIELDS}`,
    {
      method: "PATCH",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...noCacheHeaders({ Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ premium_active: active }),
    },
  );
  if (res.ok) {
    const fresh = await getMe(token).catch(() => null);
    if (fresh) return fresh;
    const json = await res.json();
    if (typeof json.data === "object" && json.data !== null) {
      return {
        ...json.data,
        premium_active: json.data?.premium_active ?? active,
        premium_plan: json.data?.premium_plan ?? (active ? "trial" : null),
        premium_until: json.data?.premium_until ?? null,
      };
    }
    return {
      premium_active: active,
      premium_plan: active ? "trial" : null,
      premium_until: active
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null,
    };
  }

  return updateProfile(token, {
    premium_active: active,
    premium_plan: active ? "trial" : null,
    premium_until: active
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null,
  });
}

function mergeDefined<T extends Record<string, unknown>>(
  base: T,
  patch: Record<string, unknown> | null | undefined,
) {
  const merged = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch ?? {})) {
    if (value !== undefined) merged[key] = value;
  }
  return merged as T;
}

export async function changePassword(
  token: string,
  email: string,
  currentPassword: string,
  newPassword: string,
) {
  // Verify current password
  await loginWithPassword(email, currentPassword);
  // Set new password
  const res = await fetch(`${DIRECTUS_URL}/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ password: newPassword }),
  });
  if (!res.ok) throw new Error("Failed to change password");
}

export async function deleteAccount(token: string) {
  const res = await fetch(`${DIRECTUS_URL}/delete-account/me`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete account");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function apiFetch(
  path: string,
  token: string,
  options: RequestInit = {},
) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.errors?.[0]?.message ?? `Request failed (${res.status})`,
    );
  }
  if (res.status === 204) return null;
  const json = await res.json();
  return json.data;
}

// ─── Loans ───────────────────────────────────────────────────────────────────

export async function fetchLoans(token: string) {
  return apiFetch("/items/loans?sort=-date_created&limit=-1", token);
}

export async function fetchLoanById(token: string, id: string) {
  return apiFetch(`/items/loans/${id}`, token);
}

export async function createLoan(token: string, data: Record<string, unknown>) {
  return apiFetch("/items/loans", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateLoan(
  token: string,
  id: string,
  data: Record<string, unknown>,
) {
  return apiFetch(`/items/loans/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteLoan(token: string, id: string) {
  return apiFetch(`/items/loans/${id}`, token, { method: "DELETE" });
}

// ─── Repayments ──────────────────────────────────────────────────────────────

export async function fetchRepaymentsByLoan(token: string, loanId: string) {
  return apiFetch(
    `/items/repayments?filter[loan_id][_eq]=${encodeURIComponent(loanId)}&sort=-date&limit=-1`,
    token,
  );
}

export async function fetchAllRepayments(token: string) {
  return apiFetch(`/items/repayments?sort=-date&limit=-1`, token);
}

export async function createRepayment(
  token: string,
  data: {
    loan_id: string;
    amount: number;
    date: string;
    notes?: string;
    paid_by?: string;
  },
) {
  return apiFetch("/items/repayments", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteRepayment(token: string, id: string) {
  return apiFetch(`/items/repayments/${id}`, token, { method: "DELETE" });
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export async function fetchContacts(token: string) {
  return apiFetch("/items/contacts?sort=name&limit=-1", token);
}

export async function createContact(
  token: string,
  data: { name: string; phone?: string },
) {
  return apiFetch("/items/contacts", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── Files ───────────────────────────────────────────────────────────────────

export function getFileUrl(
  fileId: string | null,
  token: string,
): string | null {
  if (!fileId) return null;
  return `${DIRECTUS_URL}/assets/${fileId}?access_token=${token}&t=${Date.now()}`;
}

export async function uploadFile(
  token: string,
  file: File,
): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${DIRECTUS_URL}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  const json = await res.json();
  return json.data;
}

// ─── Rates ───────────────────────────────────────────────────────────────────

export async function fetchExchangeRates(base: string) {
  const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
  if (!res.ok) throw new Error("Failed to fetch rates");
  return res.json();
}
