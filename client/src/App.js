import React, { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { userService } from "./utils/userService";
import DashboardPage from "./pages/DashboardPage";
import HelpPage from "./pages/HelpPage";
import MainAppPage from "./pages/MainAppPage";
import NavigationPage from "./pages/NavigationPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import SystemSyncPage from "./pages/SystemSyncPage";

const THEME_STORAGE_KEY = "sap-decoder-theme";

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);

  // Initialize theme from localStorage
  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = storedTheme ? storedTheme === "dark" : prefersDark;
    setDarkMode(isDark);
    applyTheme(isDark);
  }, []);

  // Initialize user from localStorage
  useEffect(() => {
    const storedUser = userService.getUser();
    setUser(storedUser);
  }, []);

  // Update theme when darkMode changes
  useEffect(() => {
    applyTheme(darkMode);
    localStorage.setItem(THEME_STORAGE_KEY, darkMode ? "dark" : "light");
  }, [darkMode]);

  const applyTheme = (isDark) => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleToggleTheme = () => {
    setDarkMode(prev => !prev);
  };

  const handleLoginUser = (username, email) => {
    const newUser = userService.loginUser(username, email);
    setUser(newUser);
  };

  const handleLogoutUser = () => {
    setUser(userService.logoutUser());
  };

  const sharedProps = {
    darkMode,
    onToggleTheme: handleToggleTheme,
    user,
    onLogin: handleLoginUser,
    onLogout: handleLogoutUser
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/main-app" replace />} />
        <Route path="/dashboard" element={<DashboardPage {...sharedProps} />} />
        <Route path="/help" element={<HelpPage {...sharedProps} />} />
        <Route path="/main-app" element={<MainAppPage {...sharedProps} />} />
        <Route path="/navigation" element={<NavigationPage {...sharedProps} />} />
        <Route path="/profile" element={<ProfilePage {...sharedProps} />} />
        <Route path="/settings" element={<SettingsPage {...sharedProps} />} />
        <Route path="/system-sync" element={<SystemSyncPage {...sharedProps} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
