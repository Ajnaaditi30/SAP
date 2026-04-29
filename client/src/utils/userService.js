const USER_STORAGE_KEY = "sap-decoder-user";

const DEFAULT_USER = {
  id: null,
  username: "",
  email: "",
  isLoggedIn: false
};

const normalizeUser = (user = {}) => {
  const username = String(user.username || "").trim();
  const email = String(user.email || "").trim();

  return {
    id: user.id || (username ? `${Date.now()}` : null),
    username,
    email,
    isLoggedIn: Boolean(username && email)
  };
};

export const userService = {
  getUser: () => {
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      return stored ? normalizeUser(JSON.parse(stored)) : { ...DEFAULT_USER };
    } catch {
      return { ...DEFAULT_USER };
    }
  },

  setUser: (user) => {
    const normalizedUser = normalizeUser(user);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser));
    return normalizedUser;
  },

  loginUser: (username, email) => {
    return userService.setUser({ username, email });
  },

  logoutUser: () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    return { ...DEFAULT_USER };
  },

  isLoggedIn: () => {
    return userService.getUser().isLoggedIn;
  }
};
