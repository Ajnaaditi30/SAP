import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { historyService } from "../utils/historyService";
import { userService } from "../utils/userService";

const PROFILE_STORAGE_KEY = "sap-decoder-profile-settings";

const DEFAULT_PROFILE_SETTINGS = {
  apiKey: "",
  model: "GPT-4o (Default)",
  plan: "Pro Plan",
  usageLimit: 50,
  preferences: {
    maskSensitiveData: true,
    saveHistory: true
  }
};

function readStoredProfile() {
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};

    return {
      ...DEFAULT_PROFILE_SETTINGS,
      ...parsed,
      preferences: {
        ...DEFAULT_PROFILE_SETTINGS.preferences,
        ...(parsed.preferences || {})
      }
    };
  } catch {
    return {
      ...DEFAULT_PROFILE_SETTINGS,
      preferences: { ...DEFAULT_PROFILE_SETTINGS.preferences }
    };
  }
}

function ProfilePage({ darkMode, onToggleTheme, user, onLogout }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => readStoredProfile());
  const [accountForm, setAccountForm] = useState({ username: "", email: "" });
  const [savedErrors, setSavedErrors] = useState([]);
  const [showApiKey, setShowApiKey] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [passwordSent, setPasswordSent] = useState(false);

  const activeUser = user?.isLoggedIn ? user : userService.getUser();

  useEffect(() => {
    if (activeUser?.isLoggedIn) {
      setAccountForm({
        username: activeUser.username || "",
        email: activeUser.email || ""
      });
    } else {
      setAccountForm({ username: "", email: "" });
    }
  }, [activeUser?.email, activeUser?.isLoggedIn, activeUser?.username]);

  useEffect(() => {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    setSavedErrors(historyService.getHistory());
  }, []);

  const visibleErrors = showArchive ? savedErrors : savedErrors.slice(0, 3);
  const monthlyDecodes = savedErrors.length;
  const totalDecoded = savedErrors.length;
  const usagePercent = useMemo(
    () => Math.min(100, Math.round((monthlyDecodes / profile.usageLimit) * 100)),
    [monthlyDecodes, profile.usageLimit]
  );

  const updateAccountField = (field) => (event) => {
    setAccountForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const updateProfileField = (field) => (event) => {
    setProfile((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSaveAccount = () => {
    const username = accountForm.username.trim();
    const email = accountForm.email.trim();

    if (!username || !email) {
      setFeedback("Username and email are required.");
      return;
    }

    userService.setUser({
      ...activeUser,
      username,
      email,
      isLoggedIn: true
    });
    setFeedback("Account details saved.");
  };

  const handleUpgradePlan = () => {
    setProfile((current) => ({
      ...current,
      plan: current.plan === "Enterprise Pilot" ? "Pro Plan" : "Enterprise Pilot",
      usageLimit: current.plan === "Enterprise Pilot" ? 50 : 200
    }));
    setFeedback("Plan updated.");
  };

  const handleOpenSavedError = (savedError) => {
    navigate("/main-app", { state: { prefillError: savedError.error } });
  };

  const handleChangePassword = () => {
    setPasswordSent(true);
    setFeedback(`Password reset instructions sent to ${accountForm.email || "your email"}.`);
  };

  const handleLogout = () => {
    onLogout?.();
    setAccountForm({ username: "", email: "" });
    navigate("/dashboard");
  };

  const handleSaveApiPreferences = () => {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    setFeedback(`Saved API preferences for ${profile.model}.`);
  };

  const handleDeleteAccount = () => {
    if (!deleteArmed) {
      setDeleteArmed(true);
      setFeedback("Press delete again to confirm account removal.");
      return;
    }

    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    onLogout?.();
    navigate("/dashboard");
  };

  const displayName = accountForm.username || "Guest User";
  const displayEmail = accountForm.email || "Not signed in";

  return (
    <div className="min-h-screen bg-white pb-24 font-['Inter'] text-black selection:bg-blue-100 selection:text-blue-900 dark:bg-gray-900 dark:text-white md:pb-0">
      <header className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">clinical_notes</span>
          <span className="text-lg font-bold tracking-tight text-black dark:text-white">SAP Error Decoder</span>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-8 font-medium md:flex">
            <Link className="rounded-lg px-3 py-1 text-gray-600 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-blue-400" to="/dashboard">
              Home
            </Link>
            <Link className="rounded-lg px-3 py-1 text-gray-600 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-blue-400" to="/main-app">
              Decode
            </Link>
            <a className="rounded-lg px-3 py-1 text-gray-600 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-blue-400" href="#saved">
              Saved
            </a>
            <Link className="rounded-lg px-3 py-1 font-bold text-blue-600 dark:text-blue-400" to="/profile">
              Profile
            </Link>
          </nav>
          <button
            className="material-symbols-outlined rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-blue-400"
            onClick={onToggleTheme}
            type="button"
          >
            {darkMode ? "light_mode" : "dark_mode"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12 md:py-16 lg:grid lg:grid-cols-12 lg:gap-12">
        <aside className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-xl bg-gray-100 p-6 dark:bg-gray-800">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Account</p>
              <nav className="space-y-2">
                <a className="flex items-center gap-3 rounded-lg bg-white px-4 py-2.5 font-semibold text-blue-600 dark:bg-gray-900 dark:text-blue-400" href="#profile">
                  <span className="material-symbols-outlined text-[20px]">person</span>
                  Profile
                </a>
                <a className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-gray-700 transition-colors hover:bg-white dark:text-gray-300 dark:hover:bg-gray-900" href="#usage">
                  <span className="material-symbols-outlined text-[20px]">analytics</span>
                  Usage Stats
                </a>
                <a className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-gray-700 transition-colors hover:bg-white dark:text-gray-300 dark:hover:bg-gray-900" href="#saved">
                  <span className="material-symbols-outlined text-[20px]">bookmark</span>
                  Saved Errors
                </a>
                <a className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-gray-700 transition-colors hover:bg-white dark:text-gray-300 dark:hover:bg-gray-900" href="#settings">
                  <span className="material-symbols-outlined text-[20px]">settings</span>
                  Settings
                </a>
              </nav>
            </div>
          </div>
        </aside>

        <div className="space-y-10 lg:col-span-9">
          {feedback ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-medium text-blue-800 dark:border-blue-900/60 dark:bg-blue-900/30 dark:text-blue-200">
              {feedback}
            </div>
          ) : null}

          <section className="flex flex-col items-center gap-8 overflow-hidden rounded-xl bg-gray-100 p-8 dark:bg-gray-800 md:flex-row md:items-start" id="profile">
            <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full border-4 border-white bg-blue-100 text-5xl font-black text-blue-700 shadow-sm dark:border-gray-900 dark:bg-blue-900/40 dark:text-blue-200">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="mb-2 flex flex-col gap-3 md:flex-row md:items-center">
                <h1 className="text-3xl font-extrabold tracking-tight text-black dark:text-white">{displayName}</h1>
                <span className="mx-auto inline-flex w-fit items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 md:mx-0">
                  {profile.plan}
                </span>
              </div>
              <p className="mb-6 font-medium text-gray-600 dark:text-gray-300">{displayEmail}</p>
              <button
                className="mx-auto flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-transform hover:scale-[1.02] hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 md:mx-0"
                onClick={handleUpgradePlan}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">bolt</span>
                Upgrade Plan
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 md:grid-cols-3" id="usage">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Errors Decoded</span>
              <div className="flex items-end justify-between">
                <span className="text-4xl font-extrabold text-black dark:text-white">
                  {monthlyDecodes}
                  <span className="ml-1 text-lg font-normal text-gray-500 dark:text-gray-400">/{profile.usageLimit}</span>
                </span>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                  <span className="material-symbols-outlined">terminal</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Total Decoded</span>
              <div className="flex items-end justify-between">
                <span className="text-4xl font-extrabold text-black dark:text-white">{totalDecoded.toLocaleString()}</span>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <span className="material-symbols-outlined">history</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Usage Progress</span>
              <div className="space-y-3">
                <div className="flex items-end justify-between">
                  <span className="text-4xl font-extrabold text-black dark:text-white">{usagePercent}%</span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-300">Active</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className="h-full rounded-full bg-blue-600 dark:bg-blue-500" style={{ width: `${usagePercent}%` }} />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6" id="saved">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-black dark:text-white">
                <span className="material-symbols-outlined">bookmark</span>
                Saved Errors
              </h2>
              <button className="text-sm font-bold text-blue-600 hover:underline dark:text-blue-400" onClick={() => setShowArchive((current) => !current)} type="button">
                {showArchive ? "Show Recent" : "View Archive"}
              </button>
            </div>
            <div className="space-y-3">
              {visibleErrors.length ? (
                visibleErrors.map((savedError) => (
                  <button
                    key={savedError.id}
                    className="group flex w-full items-center justify-between rounded-xl bg-gray-100 p-5 text-left transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                    onClick={() => handleOpenSavedError(savedError)}
                    type="button"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 transition-transform group-hover:scale-110 dark:bg-gray-900 dark:text-blue-400">
                        <span className="material-symbols-outlined">code</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-black dark:text-white">{savedError.error}</h3>
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {historyService.formatSavedAt(savedError.date)}
                        </p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-gray-500 transition-colors group-hover:text-blue-600 dark:text-gray-400 dark:group-hover:text-blue-400">chevron_right</span>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  No saved errors yet.
                </div>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <section className="space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800" id="settings">
              <h2 className="text-xl font-extrabold tracking-tight text-black dark:text-white">Account Settings</h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Username</label>
                  <input
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 font-medium text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    onChange={updateAccountField("username")}
                    type="text"
                    value={accountForm.username}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Email Address</label>
                  <input
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 font-medium text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    onChange={updateAccountField("email")}
                    type="email"
                    value={accountForm.email}
                  />
                </div>
                <button
                  className="w-full rounded-lg bg-blue-600 py-3 font-bold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  onClick={handleSaveAccount}
                  type="button"
                >
                  Save Account
                </button>
                <div className="flex flex-col gap-3 pt-2">
                  <button
                    className="w-full rounded-lg bg-gray-100 py-3 font-bold text-black transition-colors hover:bg-gray-200 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-700"
                    onClick={handleChangePassword}
                    type="button"
                  >
                    Change Password
                  </button>
                  <button
                    className="w-full rounded-lg py-3 font-bold text-gray-500 transition-colors hover:bg-red-50 hover:text-red-700 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                    onClick={handleLogout}
                    type="button"
                  >
                    Logout
                  </button>
                </div>
                {passwordSent ? (
                  <p className="rounded-lg bg-gray-100 p-3 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                    Reset email queued for {accountForm.email || "your account"}.
                  </p>
                ) : null}
              </div>
            </section>

            <section className="space-y-6 rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800" id="api">
              <h2 className="flex items-center justify-between text-xl font-extrabold tracking-tight text-black dark:text-white">
                API Settings
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">api</span>
              </h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">API Key</label>
                  <div className="relative">
                    <input
                      className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 pr-12 font-medium text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      onChange={updateProfileField("apiKey")}
                      type={showApiKey ? "text" : "password"}
                      value={profile.apiKey}
                    />
                    <button
                      aria-label={showApiKey ? "Hide API key" : "Show API key"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-200 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-blue-400"
                      onClick={() => setShowApiKey((current) => !current)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showApiKey ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">Decoding Model</label>
                  <select
                    className="w-full appearance-none rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 font-medium text-black focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    onChange={updateProfileField("model")}
                    value={profile.model}
                  >
                    <option>GPT-4o (Default)</option>
                    <option>Claude 3.5 Sonnet</option>
                    <option>Llama 3 (On-Prem)</option>
                  </select>
                </div>
                <div className="pt-4">
                  <button
                    className="w-full rounded-lg bg-blue-600 py-3 font-bold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                    onClick={handleSaveApiPreferences}
                    type="button"
                  >
                    Save API Preferences
                  </button>
                </div>
              </div>
            </section>
          </div>

          <section className="flex flex-col items-center justify-between gap-6 rounded-xl border border-red-200 bg-red-50 p-8 dark:border-red-900/60 dark:bg-red-900/20 md:flex-row">
            <div className="text-center md:text-left">
              <h2 className="mb-1 text-lg font-extrabold text-red-900 dark:text-red-200">Danger Zone</h2>
              <p className="max-w-md text-sm text-red-800 dark:text-red-300">
                Deleting your account clears local auth and profile preferences on this device.
              </p>
            </div>
            <button
              className="whitespace-nowrap rounded-lg bg-red-600 px-8 py-3 font-bold text-white shadow-lg shadow-red-600/20 transition-colors hover:bg-red-700"
              onClick={handleDeleteAccount}
              type="button"
            >
              {deleteArmed ? "Confirm Delete" : "Delete Account"}
            </button>
          </section>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:border-gray-700 dark:bg-gray-900 md:hidden">
        <Link className="flex flex-col items-center justify-center px-4 py-1.5 text-gray-600 transition-all active:scale-95 dark:text-gray-400" to="/dashboard">
          <span className="material-symbols-outlined">grid_view</span>
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider">Home</span>
        </Link>
        <Link className="flex flex-col items-center justify-center px-4 py-1.5 text-gray-600 transition-all active:scale-95 dark:text-gray-400" to="/main-app">
          <span className="material-symbols-outlined">terminal</span>
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider">Decode</span>
        </Link>
        <a className="flex flex-col items-center justify-center px-4 py-1.5 text-gray-600 transition-all active:scale-95 dark:text-gray-400" href="#saved">
          <span className="material-symbols-outlined">bookmark</span>
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider">Saved</span>
        </a>
        <Link className="flex flex-col items-center justify-center rounded-xl bg-blue-50 px-4 py-1.5 text-blue-600 transition-all active:scale-95 dark:bg-blue-900/30 dark:text-blue-400" to="/profile">
          <span className="material-symbols-outlined">person</span>
          <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider">Profile</span>
        </Link>
      </nav>
    </div>
  );
}

export default ProfilePage;
