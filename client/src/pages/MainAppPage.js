import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ErrorOutputFormatter from "../components/ErrorOutputFormatter";
import HistoryPanel from "../components/HistoryPanel";
import { historyService } from "../utils/historyService";

const DEFAULT_RESULT = `Meaning:
Paste an SAP error above and click "Decode Error" to generate a diagnosis.

Cause:
The backend will analyze the submitted SAP error and return a structured explanation.

Fix Steps:
Add the error text, run the decoder, and review the response here.

Time to Fix:
Depends on the issue.

Who Can Fix:
Basis / Functional / ABAP team, depending on the error.

Risk Level:
Unknown until analyzed.`;

function MainAppPage({ darkMode, onToggleTheme, user, onLogin }) {
  const location = useLocation();
  const [errorInput, setErrorInput] = useState("");
  const [result, setResult] = useState(DEFAULT_RESULT);
  const [loading, setLoading] = useState(false);
  const [confidence, setConfidence] = useState(null);
  const [hasSensitiveData, setHasSensitiveData] = useState(false);
  const [doNotSave, setDoNotSave] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: "", email: "" });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [historyVersion, setHistoryVersion] = useState(0);

  useEffect(() => {
    if (location.state?.prefillError) {
      setErrorInput(location.state.prefillError);
      setResult(DEFAULT_RESULT);
      setErrorMessage("");
    }
  }, [location.state]);

  const handleDecode = async () => {
    const trimmedError = errorInput.trim();

    if (!trimmedError) {
      setErrorMessage("Please enter an SAP error before decoding.");
      setResult(DEFAULT_RESULT);
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setConfidence(null);
    setHasSensitiveData(false);
    setFromCache(false);
    setSaveSuccess(false);

    try {
      const response = await fetch("/api/decode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: trimmedError })
      });

      if (!response.ok) {
        throw new Error(`Decode request failed with status ${response.status}`);
      }

      const data = await response.json();
      const decodedResult = data.result || "Unable to confidently decode this error.";

      setResult(decodedResult);
      setConfidence(data.confidence || "Low");
      setHasSensitiveData(Boolean(data.hasSensitiveData));
      setFromCache(Boolean(data.fromCache));

      if (!doNotSave) {
        historyService.addToHistory(trimmedError, decodedResult);
        setHistoryVersion((current) => current + 1);
      }
    } catch (error) {
      console.error("Decode failed:", error);
      setErrorMessage("Unable to decode error. Please try again.");
      setResult(DEFAULT_RESULT);
      setConfidence("Low");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveError = () => {
    const trimmedError = errorInput.trim();

    if (!trimmedError) {
      setErrorMessage("Please enter an SAP error before saving.");
      return;
    }

    if (!user?.username) {
      setShowLoginModal(true);
      return;
    }

    historyService.addToHistory(trimmedError, result === DEFAULT_RESULT ? "" : result);
    setHistoryVersion((current) => current + 1);
    setErrorMessage("");
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleLoginSubmit = (event) => {
    event.preventDefault();
    const username = loginForm.username.trim();
    const email = loginForm.email.trim();

    if (username && email) {
      onLogin(username, email);
      setLoginForm({ username: "", email: "" });
      setShowLoginModal(false);
    }
  };

  const handleHistorySelect = (item) => {
    setErrorInput(item.error);
    setResult(item.result || DEFAULT_RESULT);
    setErrorMessage("");
  };

  const errorId = errorInput.trim().split(/\s+/)[0] || "Awaiting input";

  const confidenceColor = {
    High: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    Medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    Low: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
  };

  return (
    <div className="min-h-screen bg-white text-black transition-colors duration-300 dark:bg-gray-900 dark:text-white">
      <header className="fixed top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur transition-colors duration-300 dark:border-gray-700 dark:bg-gray-900/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-gray-100 dark:text-blue-400 dark:hover:bg-gray-800" type="button">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              SAP Error Decoder
            </h1>
          </div>

          <nav className="hidden gap-8 md:flex">
            <Link className="font-semibold text-blue-600 dark:text-blue-400" to="/main-app">
              Decode
            </Link>
            <Link className="font-semibold text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400" to="/dashboard">
              Dashboard
            </Link>
            <Link className="font-semibold text-gray-700 transition-colors hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400" to="/profile">
              Profile
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <button
              className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              onClick={onToggleTheme}
              type="button"
            >
              <span className="material-symbols-outlined">
                {darkMode ? "light_mode" : "dark_mode"}
              </span>
            </button>

            {user?.username ? (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-1 dark:bg-blue-900/30">
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {user.username}
                </span>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                type="button"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              Login to Save Errors
            </h2>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Username"
                value={loginForm.username}
                onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-black placeholder-gray-500 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
              <input
                type="email"
                placeholder="Email"
                value={loginForm.email}
                onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-black placeholder-gray-500 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Login
                </button>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-6 pb-32 pt-24">
        <section className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <h2 className="mb-8 text-4xl font-bold leading-tight text-gray-900 dark:text-white">
              Precision <span className="text-blue-600 dark:text-blue-400">Diagnostics</span> for SAP Systems.
            </h2>
            <div className="relative">
              <textarea
                className="h-48 w-full resize-none rounded-lg border border-gray-300 bg-white p-4 pb-16 font-mono text-base text-black placeholder-gray-500 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
                placeholder="Paste your SAP error here..."
                value={errorInput}
                onChange={(event) => {
                  setErrorInput(event.target.value);
                  setErrorMessage("");
                }}
              />
              <button
                className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-blue-500 dark:hover:bg-blue-600"
                disabled={loading}
                onClick={handleDecode}
                type="button"
              >
                <span className={`material-symbols-outlined ${loading ? "animate-spin" : ""}`}>
                  {loading ? "progress_activity" : "auto_fix_high"}
                </span>
                {loading ? "Decoding..." : "Decode Error"}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                Decoder Status
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-green-600 dark:text-green-400">
                    check_circle
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    System Ready
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-green-600 dark:text-green-400">
                    check_circle
                  </span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Connection Stable
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {errorMessage && (
          <div className="mb-6 rounded-lg border-l-4 border-red-500 bg-red-50 p-4 dark:border-red-600 dark:bg-red-900/20">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-red-600 dark:text-red-400">
                error
              </span>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {errorMessage}
              </p>
            </div>
          </div>
        )}

        {hasSensitiveData && (
          <div className="mb-6 rounded-lg border-l-4 border-orange-500 bg-orange-50 p-4 dark:border-orange-600 dark:bg-orange-900/20">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">
                warning
              </span>
              <div>
                <h4 className="font-semibold text-orange-900 dark:text-orange-200">
                  Sensitive Data Detected
                </h4>
                <p className="mt-1 text-sm text-orange-800 dark:text-orange-300">
                  This error may contain sensitive data. Numbers have been masked before analysis.
                </p>
              </div>
            </div>
          </div>
        )}

        {saveSuccess && (
          <div className="mb-6 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400">
                check_circle
              </span>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Error saved to history.
              </p>
            </div>
          </div>
        )}

        {result !== DEFAULT_RESULT && (
          <div className="mb-6 rounded-lg border-l-4 border-yellow-500 bg-yellow-50 p-4 dark:border-yellow-600 dark:bg-yellow-900/20">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">
                verified_user
              </span>
              <div>
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-200">
                  Before Applying in Production
                </h4>
                <p className="mt-1 text-sm text-yellow-800 dark:text-yellow-300">
                  Always verify with your SAP team before applying to production systems.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
                  Metadata
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                      Error ID
                    </p>
                    <p className="break-all font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {errorId}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                      Confidence
                    </p>
                    {confidence ? (
                      <div className={`mt-1 inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${confidenceColor[confidence] || confidenceColor.Low}`}>
                        {confidence}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Pending</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                      Status
                    </p>
                    <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                      <span className="material-symbols-outlined text-sm">
                        report
                      </span>
                      {loading ? "Processing" : fromCache ? "Cached" : "Ready"}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={doNotSave}
                        onChange={(event) => setDoNotSave(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Do not save this error
                      </span>
                    </label>
                  </div>

                  <button
                    onClick={handleSaveError}
                    className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                    type="button"
                  >
                    Save Error
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <HistoryPanel
                  key={historyVersion}
                  onSelectItem={handleHistorySelect}
                  darkMode={darkMode}
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-3">
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Decoded Result
              </h3>
              <ErrorOutputFormatter result={result} />
            </div>
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 z-40 flex w-full border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 md:hidden">
        <Link
          className="flex flex-1 flex-col items-center justify-center gap-1 border-b-2 border-blue-600 bg-blue-50 py-3 text-blue-600 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-400"
          to="/main-app"
        >
          <span className="material-symbols-outlined">search</span>
          <span className="text-xs font-semibold">Decode</span>
        </Link>
        <Link
          className="flex flex-1 flex-col items-center justify-center gap-1 py-3 text-gray-600 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
          to="/dashboard"
        >
          <span className="material-symbols-outlined">history</span>
          <span className="text-xs font-semibold">History</span>
        </Link>
        <Link
          className="flex flex-1 flex-col items-center justify-center gap-1 py-3 text-gray-600 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
          to="/profile"
        >
          <span className="material-symbols-outlined">person</span>
          <span className="text-xs font-semibold">Profile</span>
        </Link>
      </nav>
    </div>
  );
}

export default MainAppPage;
