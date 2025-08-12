"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

export interface User {
  id: string;
  email: string;
  businessName: string;
  google_access_token?: string | null;
  google_refresh_token?: string | null;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (businessName: string, email: string, password: string, whatsappPhoneNumber: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider useEffect: Running initial auth check...');
    setIsLoading(true);
    console.log('AuthProvider useEffect: Attempting to read token from localStorage...');
    const savedToken = typeof window !== "undefined" ? localStorage.getItem("apexchat_jwt") : null;
    if (savedToken) {
      console.log('AuthProvider useEffect: Token found in localStorage:', savedToken ? 'YES' : 'NO');
      try {
        const decodedToken: any = jwtDecode(savedToken);
        console.log('AuthProvider useEffect: Decoded token:', decodedToken);
        if (decodedToken.exp * 1000 < Date.now()) {
          console.log('AuthProvider useEffect: Token EXPIRED.');
        } else {
          console.log('AuthProvider useEffect: Token VALID and set to state.');
        }
      } catch (error) {
        console.error('AuthProvider useEffect: Error decoding token:', error);
      }
      
      // Add retry mechanism for server unavailability
      const attemptAuth = async (retryCount = 0) => {
        try {
          const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/profile`, {
            headers: {
                Authorization: `Bearer ${savedToken}`,
            },
          });

          // --- CRUCIAL FIX: Extract user from response.data.user ---
          const { user: fetchedUser } = response.data; // Assuming response.data is { user: {...} }
          if (fetchedUser) {
            console.log('AuthProvider useEffect: Fetched user profile:', fetchedUser);
            setToken(savedToken);
            // Ensure the setUser structure matches your User interface in auth-context.tsx
            setUser({
              id: fetchedUser.id,
              email: fetchedUser.email,
              businessName: fetchedUser.name || fetchedUser.email, // Use 'name' from backend businessData
              // Include google tokens if present, ensuring type safety
              google_access_token: fetchedUser.google_access_token || null,
              google_refresh_token: fetchedUser.google_refresh_token || null,
            });
            console.log('AuthProvider useEffect: User and token states updated from profile fetch.');
          } else {
            console.error('AuthProvider useEffect: Profile fetch succeeded but user data was missing in response:', response.data);
            throw new Error('Profile data missing from response.'); // Force error handling path
          }
          setIsLoading(false);
        } catch (err: any) {
          console.log('AuthProvider useEffect: Profile fetch failed (attempt', retryCount + 1, '):', err.response?.status, err.message);
          
          // Retry up to 3 times for network/server errors
          if (retryCount < 3 && (err.response?.status === 404 || err.response?.status === 0 || !err.response)) {
            console.log('AuthProvider useEffect: Retrying in 2 seconds...');
            setTimeout(() => attemptAuth(retryCount + 1), 2000);
            return;
          }
          
          // Only logout if it's an authentication error (401, 403) or server error (5xx)
          if (err.response?.status === 401 || err.response?.status === 403 || 
              (err.response?.status >= 500 && err.response?.status < 600)) {
            console.log('AuthProvider useEffect: Authentication error, logging out');
            localStorage.removeItem("apexchat_jwt");
            setUser(null);
            setToken(null);
          } else {
            console.log('AuthProvider useEffect: Network/server error, keeping token for retry');
            // Keep the token but don't set user (will retry on next mount)
            setToken(savedToken);
          }
          setIsLoading(false);
        }
      };
      
      attemptAuth();
    } else {
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  }, []);

  // Login
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      const { session, user } = response.data;
      if (typeof window !== "undefined") {
        localStorage.setItem("apexchat_jwt", session.access_token);
        console.log('Login: Token saved to localStorage:', session.access_token);
      }
      setToken(session.access_token);
      setUser({
        id: user.id,
        email: user.email,
        businessName: user.user_metadata?.business_name || user.email,
      });
      console.log('Login: AuthContext state set - user:', user ? user.email : 'null', 'token present:', !!session.access_token);
      setIsLoading(false);
      return true;
    } catch (err) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return false;
    }
  };

  // Signup
  const signup = async (businessName: string, email: string, password: string, whatsappPhoneNumber: string) => {
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/auth/signup`, {
        business_name: businessName,
        email,
        password,
        whatsapp_phone_number: whatsappPhoneNumber,
      });
      setIsLoading(false);
      return true;
    } catch (err: any) {
      setIsLoading(false);
      if (err.response?.data?.message?.includes("already been registered")) {
        throw new Error("Email already registered");
      }
      return false;
    }
  };

  // Logout
  const logout = () => {
    setUser(null);
    setToken(null);
    if (typeof window !== "undefined") localStorage.removeItem("apexchat_jwt");
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}; 