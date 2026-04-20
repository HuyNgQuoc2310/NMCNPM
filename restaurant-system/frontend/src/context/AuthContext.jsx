import React, { useEffect, useState } from "react";
import { AuthContext } from "./authContext";
import { apiFetch } from "../services/apiClient";

const AUTH_STORAGE_KEY = "restaurant_system_token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_STORAGE_KEY) || "");
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  async function refreshProfile(nextToken = token) {
    if (!nextToken) {
      setUser(null);
      return null;
    }

    const profile = await apiFetch("/auth/me", { token: nextToken });
    setUser(profile);
    return profile;
  }

  useEffect(() => {
    let ignore = false;

    async function bootstrapAuth() {
      if (!token) {
        if (!ignore) {
          setUser(null);
          setIsInitializing(false);
        }
        return;
      }

      try {
        const profile = await apiFetch("/auth/me", { token });
        if (!ignore) {
          setUser(profile);
        }
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        if (!ignore) {
          setToken("");
          setUser(null);
        }
      } finally {
        if (!ignore) {
          setIsInitializing(false);
        }
      }
    }

    bootstrapAuth();

    return () => {
      ignore = true;
    };
  }, [token]);

  async function login(credentials) {
    const response = await apiFetch("/auth/login", {
      method: "POST",
      body: credentials
    });

    localStorage.setItem(AUTH_STORAGE_KEY, response.token);
    setToken(response.token);
    setUser(response.user);

    return response.user;
  }

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setToken("");
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role: user?.role || null,
        isInitializing,
        isAuthenticated: Boolean(token && user),
        login,
        logout,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
