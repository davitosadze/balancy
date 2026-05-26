import {
  createDirectus,
  rest,
  authentication,
  readItems,
  readItem,
  createItem,
  updateItem,
  deleteItem,
  readMe,
  updateMe,
  type AuthenticationData,
} from "@directus/sdk";
import * as SecureStore from "expo-secure-store";

// ─── Schema ───────────────────────────────────────────────────────────────────

import type {
  DirectusUser,
  Contact,
  Loan,
  Repayment,
  AppTranslation,
} from "@/types";

interface Schema {
  contacts: Contact[];
  loans: Loan[];
  repayments: Repayment[];
  app_translations: AppTranslation[];
}

// ─── Client ───────────────────────────────────────────────────────────────────

const DIRECTUS_URL =
  process.env.EXPO_PUBLIC_DIRECTUS_URL ?? "http://localhost:8055";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export { DIRECTUS_URL };

export const directus = createDirectus<Schema>(DIRECTUS_URL)
  .with(
    authentication("json", {
      autoRefresh: true,
      msRefreshBeforeExpires: 30_000,
      credentials: "include",
      storage: {
        get: async (): Promise<AuthenticationData | null> => {
          const access_token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
          const refresh_token =
            await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
          if (!access_token) return null;
          return {
            access_token,
            refresh_token: refresh_token ?? null,
            expires: null,
            expires_at: null,
          };
        },
        set: async (value: AuthenticationData | null) => {
          if (!value) {
            await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
            return;
          }
          if (value.access_token) {
            await SecureStore.setItemAsync(
              ACCESS_TOKEN_KEY,
              value.access_token,
            );
          }
          if (value.refresh_token) {
            await SecureStore.setItemAsync(
              REFRESH_TOKEN_KEY,
              value.refresh_token,
            );
          }
        },
      },
    }),
  )
  .with(rest());

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function loginWithPassword(email: string, password: string) {
  return directus.login({ email, password });
}

export async function logoutDirectus() {
  try {
    await directus.logout();
  } catch {}
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export async function registerUser(payload: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}) {
  const response = await fetch(`${DIRECTUS_URL}/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.errors?.[0]?.message ?? "Registration failed");
  }
  // 204 No Content — no body to parse
  return;
}

export async function getMe(): Promise<DirectusUser> {
  const data = await directus.request(
    readMe({
      fields: ["id", "email", "first_name", "last_name", "avatar"] as any,
    }),
  );
  return data as unknown as DirectusUser;
}

export async function updateProfile(
  payload: Partial<DirectusUser>,
): Promise<DirectusUser> {
  const data = await directus.request(updateMe(payload as any));
  return data as unknown as DirectusUser;
}

export async function changePassword(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  // Verify current password by re-authenticating
  await directus.login({ email, password: currentPassword });
  // Update to new password
  await directus.request(updateMe({ password: newPassword } as any));
}

export async function deleteAccount(): Promise<void> {
  const token = await SecureStore.getItemAsync("access_token");
  const response = await fetch(`${DIRECTUS_URL}/delete-account/me`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok && response.status !== 204) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.errors?.[0]?.message ?? "Failed to delete account");
  }
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function fetchContacts(): Promise<Contact[]> {
  const data = await directus.request(
    readItems("contacts", { sort: ["name"] }),
  );
  return data as unknown as Contact[];
}

export async function createContact(data: {
  name: string;
  phone?: string;
}): Promise<Contact> {
  const result = await directus.request(createItem("contacts", data as any));
  return result as unknown as Contact;
}

// ─── Loans ────────────────────────────────────────────────────────────────────

export async function fetchLoans(): Promise<Loan[]> {
  const data = await directus.request(
    readItems("loans", { sort: ["-date_created"] }),
  );
  return data as unknown as Loan[];
}

export async function fetchLoanById(id: string): Promise<Loan> {
  const data = await directus.request(readItem("loans", id));
  return data as unknown as Loan;
}

export async function createLoan(data: Record<string, unknown>): Promise<Loan> {
  const result = await directus.request(createItem("loans", data as any));
  return result as unknown as Loan;
}

export async function updateLoan(
  id: string,
  data: Partial<Loan>,
): Promise<Loan> {
  const result = await directus.request(updateItem("loans", id, data as any));
  return result as unknown as Loan;
}

export async function deleteLoan(id: string) {
  return directus.request(deleteItem("loans", id));
}

// ─── Repayments ───────────────────────────────────────────────────────────────

export async function fetchRepaymentsByLoan(
  loanId: string,
): Promise<Repayment[]> {
  const token = (await directus.getToken()) ?? "";
  const url = `${DIRECTUS_URL}/items/repayments?filter[loan_id][_eq]=${encodeURIComponent(String(loanId))}&sort=-date`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(
      err?.errors?.[0]?.message ??
        `Failed to fetch repayments (${resp.status})`,
    );
  }
  const json = await resp.json();
  return (json.data ?? []) as Repayment[];
}

export async function fetchAllRepayments(): Promise<Repayment[]> {
  const token = (await directus.getToken()) ?? "";
  const url = `${DIRECTUS_URL}/items/repayments?filter[loan_id][loan_id][user_created][_eq]=$CURRENT_USER&sort=-date&limit=-1`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) return [];
  const json = await resp.json();
  return (json.data ?? []) as Repayment[];
}

export async function createRepayment(data: {
  loan_id: string;
  amount: number;
  date: string;
  notes?: string;
  paid_by?: string;
}): Promise<Repayment> {
  const result = await directus.request(createItem("repayments", data as any));
  return result as unknown as Repayment;
}

export async function deleteRepayment(id: string) {
  return directus.request(deleteItem("repayments", id));
}

// ─── Translations ─────────────────────────────────────────────────────────────

export async function fetchTranslations(
  languageCode: string,
): Promise<AppTranslation[]> {
  const data = await directus.request(
    readItems("app_translations", {
      filter: { language_code: { _eq: languageCode } } as any,
      limit: -1,
    }),
  );
  return data as unknown as AppTranslation[];
}

// ─── Files ────────────────────────────────────────────────────────────────────

export async function uploadFile(
  uri: string,
  fileName: string,
): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append("file", { uri, name: fileName, type: "image/jpeg" } as any);
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  const response = await fetch(`${DIRECTUS_URL}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) throw new Error("File upload failed");
  const result = await response.json();
  return result.data as { id: string };
}

export async function getFileUrl(
  fileId: string | null,
): Promise<string | null> {
  if (!fileId) return null;
  const token = (await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)) ?? "";
  return `${DIRECTUS_URL}/assets/${fileId}?access_token=${encodeURIComponent(token)}&t=${Date.now()}`;
}
