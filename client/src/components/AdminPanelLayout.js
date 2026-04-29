import React from "react";
import { Link, NavLink } from "react-router-dom";

const PANEL_ITEMS = [
  { icon: "clinical_notes", label: "Diagnostics", to: "/main-app" },
  { icon: "terminal", label: "Error Logs", to: "/dashboard" },
  { icon: "sync", label: "System Sync", to: "/system-sync" },
  { icon: "settings", label: "Settings", to: "/settings" },
  { icon: "person", label: "Profile", to: "/profile" },
  { icon: "help", label: "Help", to: "/help" }
];

const MOBILE_ITEMS = [
  { icon: "clinical_notes", label: "Diagnostics", to: "/main-app" },
  { icon: "terminal", label: "Logs", to: "/dashboard" },
  { icon: "settings", label: "Settings", to: "/settings" },
  { icon: "person", label: "Profile", to: "/profile" }
];

function AdminPanelLayout({ title, eyebrow, description, children, darkMode, onToggleTheme }) {
  return (
    <div className="min-h-screen flex-col bg-background text-on-background transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100 md:flex md:flex-row font-['Inter']">
      <aside className="fixed left-0 top-0 hidden h-screen w-80 flex-col gap-2 rounded-r-2xl bg-white dark:bg-gray-900 p-4 shadow-2xl shadow-black/5 transition-colors duration-300 dark:bg-slate-900 dark:shadow-black/20 md:flex">
        <div className="mb-4 flex flex-col gap-1 px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 dark:bg-slate-800">
              <img
                alt="System Operator"
                className="h-full w-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDOklHR0bBbiLJxWZJ_34xiT5aHe_kES8cfi3R8bMaEAQ_uZkY9n5Z84bdWcWZb55_C5tmcdpRkdXiyUYKvTAqbx9mGX5dWqSZAfzdnVvDtroR-wvgbHkK6EZ-KtY-5WGSHsj4jNA2ljBTqY6M27i0sdMFC6DP3LDOS4dnqKs-HKxaNdkv1DWTrDyjOOGWn8yN-HxxobxYIeD5RdqhrkhNZ7TCFrd83LRkHCvY-b1AzfC5oljzqaBObeUqh8fdhlCfFHK4Z2QUYtOY"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-medium leading-tight text-black dark:text-white dark:text-slate-100">SAP Admin</span>
              <span className="text-xs font-bold uppercase tracking-[0.05em] text-primary">Clinical Grade Access</span>
            </div>
          </div>
          <span className="mt-2 text-[0.6875rem] font-bold text-gray-500 dark:text-gray-400 dark:text-slate-400">v2.4.1</span>
        </div>
        <nav className="flex flex-col gap-2">
          {PANEL_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                [
                  "flex items-center gap-4 rounded-lg px-4 py-3 transition-all duration-300",
                  isActive
                    ? "border-r-4 border-primary bg-gray-100 dark:bg-gray-800 font-bold text-primary dark:bg-primary/20 dark:text-indigo-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-slate-400 dark:hover:bg-slate-800"
                ].join(" ")
              }
              to={item.to}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto rounded-xl bg-gray-100 dark:bg-gray-800 p-4 dark:bg-slate-800">
          <p className="text-xs font-medium leading-relaxed text-gray-600 dark:text-gray-300 dark:text-slate-300">
            SAP Error Decoder is currently monitoring <span className="font-bold text-primary">14 active nodes</span> for SAP
            inconsistencies.
          </p>
        </div>
      </aside>
      <main className="relative flex min-h-screen flex-1 flex-col pb-20 md:ml-80 md:pb-0">
        <header className="docked full-width top-0 z-30 flex w-full items-center justify-between bg-white dark:bg-gray-900 px-6 py-4 transition-colors duration-300 dark:bg-slate-950">
          <div className="flex items-center gap-4">
            <button className="scale-95 p-2 text-primary transition-transform active:scale-90 dark:text-indigo-300 md:hidden" type="button">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="text-2xl font-black tracking-[-0.02em] text-primary dark:text-indigo-300">SAP Error Decoder</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-6 px-4 sm:flex">
              <Link
                className="cursor-pointer rounded-full px-3 py-1 font-bold text-primary transition-colors duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-indigo-300 dark:hover:bg-slate-800"
                to="/main-app"
              >
                New Decoder
              </Link>
              <Link className="cursor-pointer text-black dark:text-white transition-colors duration-300 hover:text-primary dark:text-slate-300 dark:hover:text-indigo-300" to="/help">
                Documentation
              </Link>
            </div>
            <button
              className="material-symbols-outlined rounded-full p-2 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
              onClick={onToggleTheme}
              type="button"
            >
              {darkMode ? "light_mode" : "dark_mode"}
            </button>
            <Link className="h-10 w-10 overflow-hidden rounded-full border-2 border-primary/20" to="/profile">
              <img
                alt="User profile avatar"
                className="h-full w-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAgBu7-qr18wrdpOlCCX6EeUn_iv4R47xB4n_g5PACHNgBFWis9coDWmiJ-7E8g-B7uuXt6Otb-wZaLWmO6P9BSDkK35LknI4GbfLcvYEVKvf5dNzWAzfFJW-l9SjXSNoW-OoH8x0NSYqpWg5tubSX6zd04wJBpsxForDB_wSyeOBSN0Q4Sc1uzxeFpdAk_kGQMy1NCv6W7uhAOePefvV3FtXjN_UaJyzU5GR4BmjFLMak9pv6CprEZ4p6c_JMRRE0j87HllEAFhGk"
              />
            </Link>
          </div>
        </header>
        <div className="mx-auto flex-1 w-full max-w-7xl px-6 py-8 md:px-12">
          <section className="mb-10">
            <p className="mb-3 text-[0.6875rem] font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
            <h2 className="mb-4 text-[3rem] font-extrabold leading-tight tracking-[-0.02em] text-black dark:text-white dark:text-slate-100">{title}</h2>
            <p className="max-w-2xl text-lg text-gray-600 dark:text-gray-300 dark:text-slate-400">{description}</p>
          </section>
          {children}
        </div>
      </main>
      <footer className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-2xl bg-white dark:bg-gray-900 pb-safe pt-2 shadow-[0_-4px_32px_rgba(27,27,35,0.04)] transition-colors duration-300 dark:bg-slate-950 md:hidden">
        {MOBILE_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            className={({ isActive }) =>
              [
                "flex flex-col items-center justify-center px-5 py-2 transition-all",
                isActive
                  ? "rounded-2xl bg-primary-fixed text-primary dark:bg-primary/20 dark:text-indigo-300"
                  : "text-gray-600 dark:text-gray-400 hover:text-primary dark:text-slate-400 dark:hover:text-indigo-300"
              ].join(" ")
            }
            to={item.to}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="mt-1 text-[0.6875rem] font-bold uppercase tracking-[0.05em]">{item.label}</span>
          </NavLink>
        ))}
      </footer>
    </div>
  );
}

export default AdminPanelLayout;
