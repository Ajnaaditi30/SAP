import React from "react";
import { Link } from "react-router-dom";
import AdminPanelLayout from "../components/AdminPanelLayout";

function SystemSyncPage(props) {
  return (
    <AdminPanelLayout
      description="Track the health of your SAP Error Decoder nodes, review the last successful replication window, and jump back into diagnostics when intervention is needed."
      eyebrow="Operations"
      title="System Sync"
      {...props}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white dark:bg-gray-900 p-8 shadow-[0_4px_32px_rgba(27,27,35,0.04)] dark:bg-slate-900 dark:shadow-black/20 lg:col-span-2">
          <div className="mb-8 flex items-start justify-between gap-6">
            <div>
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-primary">Replication Status</p>
              <h3 className="text-2xl font-bold text-black dark:text-white dark:text-slate-100">Landscape sync is healthy</h3>
            </div>
            <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">94% synced</span>
          </div>
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300 dark:text-slate-400">Central ECC node</span>
                <span className="font-bold text-black dark:text-white dark:text-slate-100">Live</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 dark:bg-slate-800">
                <div className="h-full w-[96%] bg-primary" />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300 dark:text-slate-400">RFC bridge</span>
                <span className="font-bold text-black dark:text-white dark:text-slate-100">Recovering</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 dark:bg-slate-800">
                <div className="h-full w-[78%] bg-[#ff9800]" />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300 dark:text-slate-400">Archive writer</span>
                <span className="font-bold text-black dark:text-white dark:text-slate-100">Stable</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 dark:bg-slate-800">
                <div className="h-full w-[91%] bg-primary" />
              </div>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-8 dark:bg-slate-900">
          <h3 className="mb-6 text-lg font-bold text-black dark:text-white dark:text-slate-100">Next Actions</h3>
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 dark:text-slate-400">
            <p>Last completed sync: 2 minutes ago</p>
            <p>Pending queue: 3 diagnostic packets</p>
            <p>Suggested action: re-open the active error stream and validate the newest RFC issue.</p>
          </div>
          <Link
            className="mt-8 inline-flex rounded-lg bg-primary px-6 py-3 font-bold text-white transition-all hover:shadow-md"
            to="/main-app"
          >
            Open Diagnostics
          </Link>
        </div>
      </div>
    </AdminPanelLayout>
  );
}

export default SystemSyncPage;
