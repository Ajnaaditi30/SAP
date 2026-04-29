import React from "react";
import AdminPanelLayout from "../components/AdminPanelLayout";

function SettingsPage(props) {
  return (
    <AdminPanelLayout
      description="Review the operational settings that shape how SAP Error Decoder handles incoming SAP incidents and routes ownership."
      eyebrow="Configuration"
      title="Settings"
      {...props}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white dark:bg-gray-900 p-8 shadow-[0_4px_32px_rgba(27,27,35,0.04)] dark:bg-slate-900 dark:shadow-black/20">
          <h3 className="mb-6 text-xl font-bold text-black dark:text-white dark:text-slate-100">Detection Policy</h3>
          <div className="space-y-5 text-sm text-gray-600 dark:text-gray-300 dark:text-slate-400">
            <div className="flex items-center justify-between rounded-lg bg-gray-100 dark:bg-gray-800 p-4 dark:bg-slate-800">
              <span>Auto-prioritize critical dumps</span>
              <span className="font-bold text-primary">Enabled</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-100 dark:bg-gray-800 p-4 dark:bg-slate-800">
              <span>Fallback owner routing</span>
              <span className="font-bold text-primary">Basis Team</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-100 dark:bg-gray-800 p-4 dark:bg-slate-800">
              <span>Retention window</span>
              <span className="font-bold text-primary">30 days</span>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-8 dark:bg-slate-900">
          <h3 className="mb-6 text-xl font-bold text-black dark:text-white dark:text-slate-100">Environment</h3>
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300 dark:text-slate-400">
            <p>Profile: Clinical Grade Access</p>
            <p>Version: v2.4.1</p>
            <p>Mode: Production-safe review</p>
            <p>These controls are currently display-ready and now reachable from the sidebar.</p>
          </div>
        </div>
      </div>
    </AdminPanelLayout>
  );
}

export default SettingsPage;
