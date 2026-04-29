import React, { useEffect, useState } from "react";
import { historyService } from "../utils/historyService";

const HistoryPanel = ({ onSelectItem }) => {
  const [history, setHistory] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    setHistory(historyService.getHistory());
  };

  const handleDelete = (id) => {
    historyService.deleteFromHistory(id);
    loadHistory();
    setShowDeleteConfirm(null);
  };

  const handleClearAll = () => {
    if (window.confirm("Clear all history?")) {
      historyService.clearHistory();
      loadHistory();
    }
  };

  if (history.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-600 dark:bg-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">No history yet. Decode an error to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Recent History ({history.length})
        </h3>
        <button
          onClick={handleClearAll}
          className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          Clear All
        </button>
      </div>

      <div className="max-h-96 space-y-2 overflow-y-auto">
        {history.map((item) => (
          <div
            key={item.id}
            className={`relative cursor-pointer rounded-lg border p-3 transition-all ${
              showDeleteConfirm === item.id
                ? "border-red-400 bg-red-50 dark:bg-red-900/20"
                : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
            }`}
          >
            {showDeleteConfirm === item.id ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Delete this item?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="flex-1 rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1 rounded bg-gray-300 px-2 py-1 text-xs font-medium hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div onClick={() => onSelectItem(item)}>
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {item.error.length > 50 ? `${item.error.substring(0, 50)}...` : item.error}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {historyService.formatSavedAt(item.date)}
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(item.id);
                  }}
                  className="mt-2 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryPanel;
