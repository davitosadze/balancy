"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { LogOut, Trash2, Save } from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import { useLangStore } from "@/lib/i18n";
import {
  changePassword,
  deleteAccount,
  updateProfile,
} from "@/lib/api/directus";

const profileSchema = z.object({
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
});

const passwordSchema = z
  .object({
    current: z.string().min(1, "Required"),
    next: z.string().min(6, "At least 6 characters"),
    confirm: z.string().min(1, "Required"),
  })
  .refine((d) => d.next === d.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, token, logout, setUser } = useAuthStore();
  const { t } = useLangStore();
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const {
    register: regProfile,
    handleSubmit: handleProfile,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
    },
  });

  const {
    register: regPw,
    handleSubmit: handlePw,
    reset: resetPw,
    formState: { errors: pwErrors },
  } = useForm<PasswordFormData>({ resolver: zodResolver(passwordSchema) });

  useEffect(() => {
    resetProfile({
      first_name: user?.first_name ?? "",
      last_name: user?.last_name ?? "",
    });
  }, [user?.first_name, user?.last_name, resetProfile]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!token) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      const updated = await updateProfile(token, data);
      setUser({ ...data, ...updated });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (e: unknown) {
      setProfileError(getErrorMessage(e, t("profile_update_failed")));
    } finally {
      setProfileSaving(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    if (!token || !user?.email) return;
    setPwSaving(true);
    setPwError(null);
    setPwSuccess(false);
    try {
      await changePassword(token, user.email, data.current, data.next);
      resetPw();
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (e: unknown) {
      setPwError(getErrorMessage(e, t("profile_pw_failed")));
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handleDeleteAccount = async () => {
    if (!token) return;
    if (
      !confirm(
        t("profile_delete_confirm"),
      )
    )
      return;
    try {
      await deleteAccount(token);
      await logout();
      router.replace("/login");
    } catch (e: unknown) {
      alert(getErrorMessage(e, t("profile_delete_failed")));
    }
  };

  const initials =
    [user?.first_name, user?.last_name]
      .filter(Boolean)
      .map((s) => s![0].toUpperCase())
      .join("") ||
    user?.email?.[0]?.toUpperCase() ||
    "?";

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-5">
      <div className="soft-hero dashboard-hero rounded-[32px]">
        <p className="dashboard-kicker">{t("nav_profile")}</p>
        <h1 className="dashboard-title">{t("profile_title")}</h1>
      </div>

      {/* Avatar + email */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-neutral-900 flex items-center justify-center text-white font-bold text-xl">
          {initials}
        </div>
        <div>
          <p className="font-semibold text-neutral-900">
            {[user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
              "—"}
          </p>
          <p className="text-sm text-neutral-400">{user?.email}</p>
        </div>
      </div>

      {/* Edit profile */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm">
        <h2 className="font-semibold text-neutral-900 mb-4">{t("profile_edit_profile")}</h2>
        <form onSubmit={handleProfile(onProfileSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1.5">
                {t("profile_first_name")}
              </label>
              <input
                {...regProfile("first_name")}
                className="w-full h-12 px-4 rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-900 outline-none focus:border-neutral-900 transition-colors"
              />
              {profileErrors.first_name && (
                <p className="text-red-500 text-xs mt-1">
                  {profileErrors.first_name.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1.5">
                {t("profile_last_name")}
              </label>
              <input
                {...regProfile("last_name")}
                className="w-full h-12 px-4 rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-900 outline-none focus:border-neutral-900 transition-colors"
              />
              {profileErrors.last_name && (
                <p className="text-red-500 text-xs mt-1">
                  {profileErrors.last_name.message}
                </p>
              )}
            </div>
          </div>
          {profileError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
              <p className="text-sm text-red-600">{profileError}</p>
            </div>
          )}
          {profileSuccess && (
            <p className="text-stone-600 text-sm">
              {t("profile_saved")}
            </p>
          )}
          <button
            type="submit"
            disabled={profileSaving}
            className="w-full flex items-center justify-center gap-2 h-12 bg-neutral-950 text-white rounded-2xl text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors">
            <Save size={15} />
            {profileSaving ? t("profile_saving") : t("profile_save_changes")}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm">
        <h2 className="font-semibold text-neutral-900 mb-4">{t("profile_change_password")}</h2>
        <form onSubmit={handlePw(onPasswordSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1.5">
              {t("profile_current_password")}
            </label>
            <input
              {...regPw("current")}
              type="password"
              autoComplete="current-password"
              className="w-full h-12 px-4 rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-900 outline-none focus:border-neutral-900 transition-colors"
            />
            {pwErrors.current && (
              <p className="text-red-500 text-xs mt-1">
                {pwErrors.current.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1.5">
              {t("profile_new_password")}
            </label>
            <input
              {...regPw("next")}
              type="password"
              autoComplete="new-password"
              className="w-full h-12 px-4 rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-900 outline-none focus:border-neutral-900 transition-colors"
            />
            {pwErrors.next && (
              <p className="text-red-500 text-xs mt-1">
                {pwErrors.next.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1.5">
              {t("profile_confirm_new_password")}
            </label>
            <input
              {...regPw("confirm")}
              type="password"
              autoComplete="new-password"
              className="w-full h-12 px-4 rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-900 outline-none focus:border-neutral-900 transition-colors"
            />
            {pwErrors.confirm && (
              <p className="text-red-500 text-xs mt-1">
                {pwErrors.confirm.message}
              </p>
            )}
          </div>
          {pwError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
              <p className="text-sm text-red-600">{pwError}</p>
            </div>
          )}
          {pwSuccess && (
            <p className="text-stone-600 text-sm">
              {t("profile_pw_saved")}
            </p>
          )}
          <button
            type="submit"
            disabled={pwSaving}
            className="w-full flex items-center justify-center gap-2 h-12 bg-neutral-950 text-white rounded-2xl text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors">
            <Save size={15} />
            {pwSaving ? t("profile_changing_pw") : t("profile_change_pw_btn")}
          </button>
        </form>
      </div>

      {/* Logout + delete */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 shadow-sm space-y-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors">
          <LogOut size={16} />
          {t("profile_sign_out")}
        </button>
        <button
          onClick={handleDeleteAccount}
          className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl border border-red-100 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors">
          <Trash2 size={16} />
          {t("profile_delete_account")}
        </button>
      </div>
    </div>
  );
}
