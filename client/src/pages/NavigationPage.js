import React from "react";
import { Link } from "react-router-dom";
import AdminPanelLayout from "../components/AdminPanelLayout";

function NavigationPage(props) {
  return (
    <AdminPanelLayout
      description="Browse the SAP Error Decoder knowledge canvas, inspect active diagnostic stories, and move directly into the tools you need from the admin panel."
      eyebrow="Operations Library"
      title="Clinical Navigation"
      {...props}
    >
          <section className="mb-12">
            <h3 className="mb-4 text-[3.5rem] font-extrabold leading-tight tracking-[-0.02em] text-black dark:text-white">
              Decode <span className="text-primary">Instability.</span>
            </h3>
            <p className="mb-8 max-w-2xl text-lg text-gray-600 dark:text-gray-300">
              Enter any SAP transaction, message ID, or raw log segment to receive a clinical-grade diagnostic report
              and resolution path.
            </p>
            <div className="group relative max-w-3xl">
              <div className="pointer-events-none absolute inset-y-0 left-6 flex items-center">
                <span className="material-symbols-outlined text-2xl text-primary">search</span>
              </div>
              <input
                className="w-full rounded-full border-none bg-gray-100 dark:bg-gray-800 py-6 pl-16 pr-6 text-xl placeholder:text-gray-500 dark:placeholder:text-gray-400 outline-none transition-all focus:ring-2 focus:ring-primary/10"
                placeholder="Ex: ABAP_RUNTIME_ERROR or Message No. 0001..."
                type="text"
              />
              <Link
                className="absolute inset-y-3 right-3 rounded-full bg-gradient-to-br from-primary to-primary-container px-8 py-3 font-bold text-white shadow-lg transition-all hover:shadow-primary/20"
                to="/main-app"
              >
                Decode
              </Link>
            </div>
          </section>
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
            <div className="rounded-xl bg-white dark:bg-gray-900 p-8 shadow-[0_4px_32px_rgba(27,27,35,0.04)] dark:bg-slate-900 dark:shadow-black/20 lg:col-span-8">
              <div className="mb-12 flex items-start justify-between">
                <div>
                  <span className="rounded-full bg-error-container px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-on-error-container">
                    Critical Priority
                  </span>
                  <h3 className="mt-4 text-2xl font-bold leading-tight text-black dark:text-white">
                    SAP_TSV_TNEW_PAGE_ALLOC_FAILED
                  </h3>
                </div>
                <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-gray-500 dark:text-gray-400">
                  Detected 4m ago
                </span>
              </div>
              <div className="space-y-6">
                <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-6 dark:bg-slate-800">
                  <p className="font-mono text-sm leading-relaxed text-gray-600 dark:text-gray-300 dark:text-slate-300">
                    <span className="font-bold text-primary">SY-SUBRC:</span> 4 |{" "}
                    <span className="font-bold text-primary">PROGRAM:</span> SAPLSTRD |{" "}
                    <span className="font-bold text-primary">TABLE:</span> T100
                  </p>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <h4 className="mb-2 text-sm font-bold uppercase tracking-[0.05em] text-primary">Diagnosis</h4>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 dark:text-slate-400">
                      Memory allocation limit exceeded during large data set processing in a background task. The system
                      reached its work process threshold.
                    </p>
                  </div>
                  <div className="flex-1">
                    <h4 className="mb-2 text-sm font-bold uppercase tracking-[0.05em] text-tertiary">Prescription</h4>
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 dark:text-slate-400">
                      Adjust parameter <code className="rounded bg-gray-100 dark:bg-gray-800 px-1 dark:bg-slate-700">zetta/roll_extension</code> or
                      implement paging logic for mass data extraction.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-4 border-t border-surface-container-high pt-8 dark:border-slate-700">
                <button className="rounded-lg px-6 py-2 font-bold text-primary transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:bg-slate-800" type="button">
                  Export Log
                </button>
                <Link
                  className="rounded-lg bg-primary px-6 py-2 font-bold text-white transition-all hover:shadow-md"
                  to="/main-app"
                >
                  Fix Guide
                </Link>
              </div>
            </div>
            <div className="flex flex-col gap-6 lg:col-span-4">
              <div className="rounded-xl bg-gray-100 dark:bg-gray-800 p-6 dark:bg-slate-900">
                <h4 className="mb-6 text-sm font-bold uppercase tracking-[0.05em] text-black dark:text-white dark:text-slate-100">Decoder Health</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300 dark:text-slate-400">System Sync</span>
                    <span className="text-sm font-bold text-primary">Active</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 dark:bg-slate-800">
                    <div className="h-full w-[94%] bg-primary" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300 dark:text-slate-400">API Latency</span>
                    <span className="text-sm font-bold text-black dark:text-white dark:text-slate-100">12ms</span>
                  </div>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-xl bg-[#1b1b23] p-6 text-white">
                <div className="relative z-10">
                  <h4 className="mb-2 text-sm font-bold uppercase tracking-[0.05em] text-primary-fixed">History Total</h4>
                  <p className="mb-4 text-4xl font-black">1,402</p>
                  <p className="text-xs leading-relaxed text-white/50">
                    Clinical decodes processed since last system synchronization.
                  </p>
                </div>
                <div className="absolute -bottom-4 -right-4 opacity-20">
                  <span className="material-symbols-outlined text-[120px]">history</span>
                </div>
              </div>
            </div>
          </div>
    </AdminPanelLayout>
  );
}

export default NavigationPage;
