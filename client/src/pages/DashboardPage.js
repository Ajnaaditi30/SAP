import React from "react";
import { Link } from "react-router-dom";

function DashboardPage({ darkMode, onToggleTheme }) {
  return (
    <div className="min-h-screen bg-background font-['Inter'] text-black dark:text-white selection:bg-primary-fixed selection:text-on-primary-fixed dark:bg-slate-950 dark:text-slate-100">
        <header className="flex w-full items-center justify-between bg-white dark:bg-gray-900 px-6 py-4 transition-colors duration-300 dark:bg-slate-950">
        <div className="flex items-center gap-4">
          <button
            className="rounded-full p-2 text-primary transition-colors duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-indigo-300 dark:hover:bg-slate-800"
            type="button"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="text-2xl font-black tracking-[-0.02em] text-primary dark:text-indigo-300">SAP Error Decoder</span>
        </div>
        <div className="hidden items-center gap-8 md:flex">
          <nav className="flex gap-6">
            <Link className="font-bold tracking-tight text-primary" to="/main-app">
              Decode
            </Link>
            <Link
              className="font-bold tracking-tight text-black dark:text-white transition-colors duration-300 hover:text-primary dark:text-slate-300 dark:hover:text-indigo-300"
              to="/dashboard"
            >
              Dashboard
            </Link>
            <Link
              className="font-bold tracking-tight text-black dark:text-white transition-colors duration-300 hover:text-primary dark:text-slate-300 dark:hover:text-indigo-300"
              to="/navigation"
            >
              Navigation
            </Link>
            <Link
              className="font-bold tracking-tight text-black dark:text-white transition-colors duration-300 hover:text-primary dark:text-slate-300 dark:hover:text-indigo-300"
              to="/profile"
            >
              Profile
            </Link>
          </nav>
          <button
            className="material-symbols-outlined rounded-full p-2 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-300"
            onClick={onToggleTheme}
            type="button"
          >
            {darkMode ? "light_mode" : "dark_mode"}
          </button>
          <Link className="h-10 w-10 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800" to="/profile">
            <img
              alt="User profile avatar"
              className="h-full w-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDgmyv7KO0dU-sjDAYvFoG04G9ciybfzHDPB5VgIYNnJ9pS7dxqZ508KAdAKQEiWnE9T0bliQ6032ZqGem7kt7OoxUGCkV2mck00qV6ocMLvis4ZzvkQiuCH4PUJfl_WhM9GZFLztKywaCJ8X2PpdjeOb7GG9zK6_lNT99spEZEPDmibN6OoJEnPtIxP6RttFG237CeNYew3UK4_aM29n0NoV4TfUJJW9ZvaRxBVjdJrXJUusgSsVlVnq0dD7Hz33zh8zMdm5Jg9uk"
            />
          </Link>
        </div>
      </header>
      <main className="relative overflow-hidden pt-12">
        <section className="px-6 md:flex md:px-0">
          <div className="hidden px-12 py-24 md:block md:w-[30%]">
            <div className="sticky top-24 space-y-4">
              <span className="block text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-primary">
                Diagnostic Terminal
              </span>
              <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300 dark:text-slate-400">
                System Status: Active
                <br />
                Node: sentinel-01
                <br />
                Ready for input...
              </p>
            </div>
          </div>
          <div className="py-12 md:w-[70%] md:px-0 md:py-24 md:pr-24">
            <h1 className="mb-6 text-[3.5rem] font-black leading-[1.1] tracking-[-0.02em] text-black dark:text-white">
              Understand SAP Errors
              <br />
              in Seconds
            </h1>
            <p className="mb-12 max-w-xl text-xl text-gray-600 dark:text-gray-300">
              No consultants. No confusion. Just solutions. SAP Error Decoder turns technical jargon into
              actionable diagnostic steps.
            </p>
            <div className="relative mb-16 max-w-3xl">
              <div className="flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-8 py-6 shadow-sm transition-all group-focus-within:ring-2 group-focus-within:ring-primary/10 dark:bg-slate-800">
                <span className="material-symbols-outlined mr-4 text-3xl text-primary">search</span>
                <input
                  className="w-full border-none bg-transparent text-xl font-medium placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-0"
                  placeholder="Paste SAP Error Code (e.g., M7001 or RFC_ERROR_COMMUNICATION)"
                  type="text"
                />
                <Link
                  className="ml-4 rounded-full bg-gradient-to-br from-primary to-primary-container px-8 py-3 font-bold text-white shadow-lg transition-all hover:shadow-primary/20"
                  to="/main-app"
                >
                  Decode an Error
                </Link>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-gray-500 dark:text-gray-400">
                Used by SAP users worldwide
              </span>
              <div className="flex flex-wrap gap-12 opacity-40 grayscale contrast-125">
                <div className="h-8 w-24 rounded-md bg-on-surface/20" />
                <div className="h-8 w-32 rounded-md bg-on-surface/20" />
                <div className="h-8 w-28 rounded-md bg-on-surface/20" />
                <div className="h-8 w-20 rounded-md bg-on-surface/20" />
              </div>
            </div>
          </div>
        </section>
        <section className="bg-gray-100 dark:bg-gray-800 px-6 py-24 dark:bg-slate-900 md:px-24">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-12">
            <div className="flex min-h-[400px] flex-col justify-between rounded-lg bg-white dark:bg-gray-900 p-10 shadow-sm dark:bg-slate-800 md:col-span-8">
              <div>
                <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-container">
                  <span className="material-symbols-outlined text-white">psychology</span>
                </div>
                <h3 className="mb-4 text-2xl font-bold">Instant AI Decoding</h3>
                <p className="max-w-md text-lg leading-relaxed text-gray-600 dark:text-gray-300 dark:text-slate-400">
                  Our engine analyzes SAP dumps and ST22 short dumps instantly, extracting the likely root cause from
                  noisy logs.
                </p>
              </div>
              <div className="mt-8 overflow-hidden rounded-lg">
                <img
                  alt="Data visualization interface"
                  className="w-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAojD9fajMA0vJVhQhGn_NNEAIfThm1-zQT28y37PR6bpEpi4F4cjtKE3wllVMTbp_yoEHbuppqKMrqFMy1lsTyymtynwskQInQwMa3wQB6rF8U97a1rdswHQwy79--jLcV1fOksb3yjJdbx8e368AZyx_D6UKEH9AGY3KPQ3LVD4CEAVc6TMUK3dOF9iMdvZrb2v1-m-A05dVGSmWnm3whliYqZZKF_53xmiFx9UBmFutaB-fbd_xccJ2bu4yfd3TGSog2ko7yqoA"
                />
              </div>
            </div>
            <div className="flex flex-col rounded-lg bg-primary p-10 text-white shadow-sm md:col-span-4">
              <span className="material-symbols-outlined mb-8 text-4xl">format_list_numbered</span>
              <h3 className="mb-4 text-2xl font-bold text-white">Step-by-step Fixes</h3>
              <p className="mb-auto text-lg leading-relaxed text-primary-fixed/80">
                We do not stop at diagnosis. You get a practical guide to the next transactions, settings, and likely
                owners.
              </p>
              <div className="mt-8 flex justify-end">
                <span className="material-symbols-outlined text-6xl opacity-20">healing</span>
              </div>
            </div>
            <div className="rounded-lg bg-gray-100 dark:bg-gray-800 p-10 shadow-sm dark:bg-slate-800 md:col-span-4">
              <span className="material-symbols-outlined mb-6 text-3xl text-primary">database</span>
              <h3 className="mb-3 text-xl font-bold">Transaction Guidance</h3>
              <p className="leading-relaxed text-gray-600 dark:text-gray-300 dark:text-slate-400">
                Navigate to the right T-Code every time. Whether it is SPRO, SE11, or BD87, we point you at the right
                starting place.
              </p>
            </div>
            <div className="relative flex flex-col overflow-hidden rounded-lg border border-white/20 bg-white/80 p-1 backdrop-blur dark:border-slate-700 dark:bg-slate-800/80 md:col-span-8 md:flex-row">
              <div className="p-10 md:w-1/2">
                <h3 className="mb-3 text-xl font-bold">Historical Analysis</h3>
                <p className="mb-6 leading-relaxed text-gray-600 dark:text-gray-300 dark:text-slate-400">
                  See how often a failure appears across your landscape and track how quickly teams are resolving it.
                </p>
                <Link className="flex items-center gap-2 font-bold text-primary transition-all hover:gap-3" to="/navigation">
                  Explore Archive <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
              </div>
              <div className="h-64 md:h-auto md:w-1/2">
                <img
                  alt="Code analysis"
                  className="h-full w-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAru3lEaYrwSBYH2Ux9kXIlRLL88_MttS1bRxMdyCR76_h4KC3jLksgwDakQQCNnIsrS-O70xs2RDRe2lyO1Om9Z0_m7qMOiqAlsn1NNfOdPox54iHayc3lVw_Jqf1EvfQtOLaGhYJHE7alPRhf5erIYMlkb1SwzM9NXib0Jz6YKnMa9ulTOvNedAC2GhEflU69HVqyHF-Z5VTnV8qEjC_bwRSquRLMTykOjEt9ohVWOcEjLR7NlQdTnQ7MlaWCaGpijdpXSQ7gqYg"
                />
              </div>
            </div>
          </div>
        </section>
        <section className="flex flex-col items-center px-6 py-32 text-center">
          <h2 className="mb-8 text-4xl font-black tracking-tight md:text-5xl">Stop Guessing. Start Solving.</h2>
          <p className="mb-12 max-w-2xl text-xl text-gray-600 dark:text-gray-300 dark:text-slate-400">
            Join Basis consultants and functional leads who want quicker answers without digging through raw dumps.
          </p>
          <div className="flex flex-col gap-4 md:flex-row">
            <Link
              className="rounded-lg bg-gradient-to-br from-primary to-primary-container px-12 py-5 text-lg font-bold text-white shadow-2xl transition-all hover:scale-105"
              to="/main-app"
            >
              Decode My First Error
            </Link>
            <Link
              className="rounded-lg bg-gray-100 dark:bg-gray-800 px-12 py-5 text-center text-lg font-bold text-gray-600 dark:text-gray-300 transition-all hover:bg-gray-200 dark:hover:bg-gray-700"
              to="/help"
            >
              Watch Demo
            </Link>
          </div>
        </section>
      </main>
      <footer className="md:hidden">
        <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-2xl bg-white dark:bg-gray-900 pb-safe pt-2 shadow-[0_-4px_32px_rgba(27,27,35,0.04)] dark:bg-slate-950">
              <Link className="flex flex-col items-center justify-center rounded-2xl bg-primary-fixed px-5 py-2 text-primary" to="/main-app">
            <span className="material-symbols-outlined">search</span>
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05em]">Decode</span>
          </Link>
          <Link
            className="flex flex-col items-center justify-center px-5 py-2 text-gray-600 dark:text-gray-400 transition-all hover:text-primary dark:text-slate-400 dark:hover:text-indigo-300"
            to="/dashboard"
          >
            <span className="material-symbols-outlined">history</span>
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05em]">History</span>
          </Link>
          <Link
            className="flex flex-col items-center justify-center px-5 py-2 text-gray-600 dark:text-gray-400 transition-all hover:text-primary dark:text-slate-400 dark:hover:text-indigo-300"
            to="/navigation"
          >
            <span className="material-symbols-outlined">menu_book</span>
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05em]">Library</span>
          </Link>
          <Link
            className="flex flex-col items-center justify-center px-5 py-2 text-gray-600 dark:text-gray-400 transition-all hover:text-primary dark:text-slate-400 dark:hover:text-indigo-300"
            to="/help"
          >
            <span className="material-symbols-outlined">bookmark</span>
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05em]">Saved</span>
          </Link>
          <Link
            className="flex flex-col items-center justify-center px-5 py-2 text-[#1b1b23]/60 transition-all hover:text-[#4648d4] dark:text-slate-400 dark:hover:text-[#818cf8]"
            to="/profile"
          >
            <span className="material-symbols-outlined">person</span>
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.05em]">Profile</span>
          </Link>
        </nav>
      </footer>
      <footer className="hidden border-t border-outline-variant/10 bg-gray-100 dark:bg-gray-800 px-24 py-16 dark:border-slate-800 dark:bg-slate-900 md:block">
        <div className="mx-auto flex max-w-7xl items-start justify-between">
          <div className="space-y-4">
            <span className="text-xl font-black tracking-[-0.02em] text-[#4648d4]">SAP Error Decoder</span>
            <p className="max-w-xs text-sm text-gray-600 dark:text-gray-300 dark:text-slate-400">
              High-end diagnostic precision for the SAP enterprise ecosystem. Built for professionals.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-24">
            <div className="flex flex-col gap-4">
              <span className="font-bold uppercase text-primary">Tool</span>
              <Link className="text-sm transition-colors hover:text-primary" to="/main-app">
                Decoder
              </Link>
              <Link className="text-sm transition-colors hover:text-primary" to="/navigation">
                Transaction Map
              </Link>
              <Link className="text-sm transition-colors hover:text-primary" to="/help">
                IDoc Inspector
              </Link>
            </div>
            <div className="flex flex-col gap-4">
              <span className="font-bold uppercase text-primary">Resources</span>
              <Link className="text-sm transition-colors hover:text-primary" to="/dashboard">
                Library
              </Link>
              <Link className="text-sm transition-colors hover:text-primary" to="/navigation">
                Documentation
              </Link>
              <Link className="text-sm transition-colors hover:text-primary" to="/system-sync">
                API
              </Link>
            </div>
            <div className="flex flex-col gap-4">
              <span className="font-bold uppercase text-primary">Company</span>
              <Link className="text-sm transition-colors hover:text-primary" to="/help">
                About
              </Link>
              <Link className="text-sm transition-colors hover:text-primary" to="/settings">
                Security
              </Link>
              <span className="text-sm">v2.4.1</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default DashboardPage;
