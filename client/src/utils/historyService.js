const HISTORY_STORAGE_KEY = "sap-decoder-history";
const MAX_HISTORY_ITEMS = 50;

const normalizeError = (error) => String(error || "").trim();
const normalizeResult = (result) => String(result || "").trim();

const parseHistory = (stored) => {
  if (!stored) {
    return [];
  }

  const parsed = JSON.parse(stored);
  return Array.isArray(parsed) ? parsed : [];
};

export const historyService = {
  getHistory: () => {
    try {
      return parseHistory(localStorage.getItem(HISTORY_STORAGE_KEY));
    } catch {
      return [];
    }
  },

  addToHistory: (error, result) => {
    const cleanError = normalizeError(error);
    const cleanResult = normalizeResult(result);

    if (!cleanError) {
      return null;
    }

    const history = historyService.getHistory();
    const existingIndex = history.findIndex(
      (item) => normalizeError(item.error).toLowerCase() === cleanError.toLowerCase()
    );

    const newItem = {
      id: existingIndex >= 0 ? history[existingIndex].id : `${Date.now()}`,
      error: cleanError,
      result: cleanResult,
      date: new Date().toISOString()
    };

    const withoutDuplicate = existingIndex >= 0
      ? history.filter((_, index) => index !== existingIndex)
      : history;
    const updated = [newItem, ...withoutDuplicate].slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return newItem;
  },

  getHistoryById: (id) => {
    return historyService.getHistory().find((item) => item.id === id) || null;
  },

  deleteFromHistory: (id) => {
    const updated = historyService.getHistory().filter((item) => item.id !== id);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
  },

  clearHistory: () => {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  },

  formatSavedAt: (dateString) => {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "Saved recently";
    }

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }
};
