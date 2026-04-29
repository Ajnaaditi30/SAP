import React from "react";
import { Link } from "react-router-dom";
import AdminPanelLayout from "../components/AdminPanelLayout";

function HelpPage(props) {
  return (
    <AdminPanelLayout
      description="Quick guidance for operators using SAP Error Decoder to decode SAP failures, review history, and verify sync health."
      eyebrow="Support"
      title="Help"
      {...props}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white dark:bg-gray-900 p-8 shadow-[0_4px_32px_rgba(27,27,35,0.04)] dark:bg-slate-900 dark:shadow-black/20 lg:col-span-2">
          <h3 className="mb-6 text-xl font-bold text-black dark:text-white dark:text-slate-100">Getting Started</h3>
          <div className="space-y-4 text-sm leading-7 text-gray-600 dark:text-gray-300 dark:text-slate-400">
            <p>Use Diagnostics to paste a dump, transaction code, or raw SAP error message and generate a structured analysis.</p>
            <p>Use Error Logs to review the landing/dashboard view and jump into recent diagnostic flows.</p>
            <p>Use System Sync to confirm replication health before escalating backend connectivity issues.</p>
          </div>
        </div>
        <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-8 dark:bg-slate-900">
          <h3 className="mb-6 text-xl font-bold text-black dark:text-white dark:text-slate-100">Shortcuts</h3>
          <div className="flex flex-col gap-3">
            <Link className="rounded-lg bg-primary px-5 py-3 text-center font-bold text-white transition-all hover:shadow-md" to="/main-app">
              Open Diagnostics
            </Link>
            <Link className="rounded-lg bg-gray-100 dark:bg-gray-800 px-5 py-3 text-center font-bold text-black dark:text-white transition-all hover:bg-gray-200 dark:hover:bg-gray-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700" to="/dashboard">
              View Error Logs
            </Link>
          </div>
        </div>
      </div>
    </AdminPanelLayout>
  );
}

export default HelpPage;
