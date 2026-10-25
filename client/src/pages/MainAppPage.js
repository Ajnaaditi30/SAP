import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ErrorOutputFormatter from "../components/ErrorOutputFormatter";
import HistoryPanel from "../components/HistoryPanel";
import { decodeService } from "../utils/decodeService";
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

function renderInlineMarkdown(text, keyPrefix) {
  return text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*)/g).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (/^(\*\*|__)/.test(part)) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (/^\*/.test(part)) return <em key={key}>{part.slice(1, -1)}</em>;
    if (/^`/.test(part)) return <code key={key} className="rounded bg-gray-100 px-1 dark:bg-gray-700">{part.slice(1, -1)}</code>;
    return part;
  });
}

function FollowUpMarkdown({ text }) {
  const lines = String(text || "").split(/\r?\n/);
  const blocks = [];
  let paragraph = [];
  let list = [];
  let listType = "";

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "p", lines: paragraph });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: listType, lines: list });
      list = [];
      listType = "";
    }
  };

  lines.forEach((line) => {
    const value = line.trim();
    const heading = value.match(/^#{1,3}\s+(.+)|^([A-Z][^:\n]{2,50}):$/);
    const ordered = value.match(/^\d+[.)]\s+(.+)/);
    const unordered = value.match(/^[-*]\s+(.+)/);

    if (!value) {
      flushParagraph();
      flushList();
    } else if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "h", lines: [heading[1] || heading[2]] });
    } else if (ordered || unordered) {
      flushParagraph();
      const type = ordered ? "ol" : "ul";
      if (listType && listType !== type) flushList();
      listType = type;
      list.push((ordered || unordered)[1]);
    } else {
      flushList();
      paragraph.push(value);
    }
  });
  flushParagraph();
  flushList();

  return (
    <div className="mt-1 space-y-2 text-sm">
      {blocks.map((block, index) => {
        if (block.type === "h") {
          return <h5 key={index} className="font-semibold">{renderInlineMarkdown(block.lines[0], `h-${index}`)}</h5>;
        }
        if (block.type === "ol" || block.type === "ul") {
          const List = block.type;
          return (
            <List key={index} className={`${block.type === "ol" ? "list-decimal" : "list-disc"} space-y-1 pl-5`}>
              {block.lines.map((item, itemIndex) => <li key={itemIndex}>{renderInlineMarkdown(item, `l-${index}-${itemIndex}`)}</li>)}
            </List>
          );
        }
        return <p key={index}>{renderInlineMarkdown(block.lines.join(" "), `p-${index}`)}</p>;
      })}
    </div>
  );
}

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
  const [decodedData, setDecodedData] = useState(null);
  const [relatedErrors, setRelatedErrors] = useState([]);
  const [confidenceDetails, setConfidenceDetails] = useState(null);
  const [followUpQuestion, setFollowUpQuestion] = useState("");
  const [followUpConversation, setFollowUpConversation] = useState([]);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpError, setFollowUpError] = useState("");

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
      setErrorMessage("Please enter an error");
      setResult(DEFAULT_RESULT);
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setConfidence(null);
    setHasSensitiveData(false);
    setFromCache(false);
    setSaveSuccess(false);
    setRelatedErrors([]);
    setConfidenceDetails(null);
    setFollowUpConversation([]);
    setFollowUpError("");

    try {
      const data = await decodeService.decodeWithFallback(trimmedError);
      const decodedResult = data.result || "Unable to confidently decode this error.";

      setResult(decodedResult);
      setConfidence(data.confidence || "Low");
      setHasSensitiveData(Boolean(data.hasSensitiveData));
      setFromCache(Boolean(data.fromCache));
      setDecodedData(data);
      setRelatedErrors(Array.isArray(data.relatedErrors) ? data.relatedErrors : []);
      setConfidenceDetails(data.confidenceDetails || null);

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
    setDecodedData(null);
    setRelatedErrors([]);
    setConfidenceDetails(null);
    setFollowUpConversation([]);
    setFollowUpError("");
  };

  const handleFollowUpSubmit = async () => {
    const trimmedQuestion = followUpQuestion.trim();

    if (!trimmedQuestion || !decodedData) {
      setFollowUpError("Ask a follow-up question after decoding an SAP error.");
      return;
    }

    setFollowUpLoading(true);
    setFollowUpError("");

    try {
      const response = await fetch("http://localhost:5000/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmedQuestion,
          context: decodedData?.context || {},
          history: followUpConversation.slice(-8)
        })
      });
      const payload = await response.json();

      setFollowUpConversation((current) => [
        ...current,
        { role: "user", text: trimmedQuestion },
        { role: "assistant", text: payload.answer || "The retrieved SAP knowledge base does not contain enough information to answer this question." }
      ]);
      setFollowUpQuestion("");
    } catch (error) {
      console.error("Follow-up failed:", error);
      setFollowUpError("Unable to answer the follow-up question right now.");
    } finally {
      setFollowUpLoading(false);
    }
  };

  const handleClearFollowUp = () => {
    setFollowUpConversation([]);
    setFollowUpQuestion("");
    setFollowUpError("");
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
              <ErrorOutputFormatter result={result} decodedData={decodedData} />

              {confidenceDetails && (
                <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                    Confidence
                  </h4>
                  <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                    {confidenceDetails.percent}%
                  </div>
                  <div className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                    Reason
                  </div>
                  <ul className="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    {confidenceDetails.reasons.map((reason, index) => (
                      <li key={`${reason.label}-${index}`} className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-600 dark:text-green-400">
                          {reason.passed ? "check_circle" : "radio_button_unchecked"}
                        </span>
                        <span>{reason.label}</span>
                      </li>
                    ))}
                  </ul>
                  {confidenceDetails.low_confidence_message && (
                    <p className="mt-3 text-sm font-medium text-orange-700 dark:text-orange-300">
                      {confidenceDetails.low_confidence_message}
                    </p>
                  )}
                </div>
              )}

              {relatedErrors.length > 0 && (
                <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <h4 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                    Related SAP Errors
                  </h4>
                  <div className="space-y-3">
                    {relatedErrors.map((item) => (
                      <div key={item.id || item.error_code} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{item.error_code || item.id}</div>
                          <div className="text-sm text-gray-700 dark:text-gray-300">{item.title}</div>
                          <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Module: {item.module || "N/A"}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium text-blue-600 dark:text-blue-400">Similarity: {item.similarity_percent}%</div>
                          <button
                            type="button"
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                            onClick={() => {
                              setErrorInput(item.error_code || item.title || "");
                              setResult(DEFAULT_RESULT);
                              setLoading(true);
                              decodeService.decodeWithFallback(item.error_code || item.title || "").then((data) => {
                                const decoded = data.result || "Unable to confidently decode this error.";
                                setResult(decoded);
                                setConfidence(data.confidence || "Low");
                                setHasSensitiveData(Boolean(data.hasSensitiveData));
                                setFromCache(Boolean(data.fromCache));
                                setDecodedData(data.decodedData || null);
                                setRelatedErrors(Array.isArray(data.relatedErrors) ? data.relatedErrors : []);
                                setConfidenceDetails(data.confidenceDetails || null);
                                setFollowUpConversation([]);
                                setFollowUpError("");
                                setLoading(false);
                              }).catch(() => {
                                setLoading(false);
                              });
                            }}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {decodedData && (
                <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Follow-up Assistant</h4>
                    <button type="button" onClick={handleClearFollowUp} className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Clear Conversation
                    </button>
                  </div>

                  <div className="mb-3 space-y-2">
                    {followUpConversation.length === 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">Ask a question about this SAP error using the retrieved knowledge base.</p>
                    )}
                    {followUpConversation.map((entry, index) => (
                      <div key={`${entry.role}-${index}`} className={`rounded-lg p-3 ${entry.role === "user" ? "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-200" : "bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200"}`}>
                        <div className="text-xs font-semibold uppercase tracking-wide opacity-70">{entry.role === "user" ? "You" : "Assistant"}</div>
                        {entry.role === "assistant"
                          ? <FollowUpMarkdown text={entry.text} />
                          : <div className="mt-1 text-sm">{entry.text}</div>}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2 md:flex-row">
                    <input
                      type="text"
                      value={followUpQuestion}
                      onChange={(event) => setFollowUpQuestion(event.target.value)}
                      placeholder="Ask a follow-up question..."
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleFollowUpSubmit}
                      disabled={followUpLoading}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {followUpLoading ? "Asking..." : "Ask"}
                    </button>
                  </div>

                  {followUpError && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{followUpError}</p>
                  )}
                </div>
              )}
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
