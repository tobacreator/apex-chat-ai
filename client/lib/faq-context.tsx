"use client"

import React, { createContext, useState, useEffect, useContext, useCallback, ReactNode } from 'react';
import axios from 'axios';
import { FAQ, getFAQs, createFAQ, updateFAQ, deleteFAQ } from '../services/faqService';
import { useAuth } from './auth-context';

interface FaqContextType {
  faqs: FAQ[];
  isLoading: boolean;
  error: string | null;
  fetchFaqs: () => Promise<void>;
  addFaq: (faq: Omit<FAQ, 'id' | 'updated_at'>) => Promise<void>;
  editFaq: (id: string, faq: Partial<Omit<FAQ, 'id' | 'updated_at'>>) => Promise<void>;
  removeFaq: (id: string) => Promise<void>;
}

const FaqContext = createContext<FaqContextType | undefined>(undefined);

export const FaqProvider = ({ children }: { children: ReactNode }) => {
  const { token, isLoading: authLoading } = useAuth();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  console.log('FaqProvider: Initializing with token:', token ? 'present' : 'missing', 'authLoading:', authLoading);

  const fetchFaqs = useCallback(async () => {
    console.log('FaqContext: fetchFaqs called.');
    console.log('FaqContext: Token available for fetchFAQs:', token ? 'YES' : 'NO');
    
    if (!token) return;
    setIsLoading(true);
    setError(null);
    
    console.log('FaqContext: Sending GET request to /api/faqs with token.');
    
    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/faqs`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // --- CRUCIAL DEBUG: Verify raw response and data ---
      console.log('FaqContext: Raw Axios response object:', response); // Log the full response object
      console.log('FaqContext: Raw Axios response.data:', response.data); // Log just the data
      // --- END CRUCIAL DEBUG ---

      // Ensure response.data is treated as an array.
      // It's likely that response.data is an empty array but the log displayed undefined, or it needs explicit Array.isArray check.
      if (Array.isArray(response.data)) {
        setFaqs(response.data); // This line should work correctly if data is an array
        console.log('FaqContext: Successfully set FAQs. Count:', response.data.length);
      } else {
        console.error('FaqContext: Backend response.data is not an array:', response.data);
        setFaqs([]); // Fallback to empty array
        setError("Backend returned unexpected data format for FAQs.");
      }
    } catch (err: any) {
      console.error('FaqContext: Error fetching FAQs:', err.message, err.response?.status, err.response?.data);
      setFaqs([]); // CRUCIAL: Ensure faqs is set to an empty array on error
      setError(err.response?.data?.message || "Failed to load FAQs."); // Update error state
      // Optionally, if 401, you might want to trigger logout:
      // if (err.response?.status === 401) { logout(); }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const addFaq = useCallback(async (faq: Omit<FAQ, 'id' | 'updated_at'>) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const newFaq = await createFAQ(faq, token);
      setFaqs((prev) => [newFaq, ...prev]);
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'Failed to create FAQ');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const editFaq = useCallback(async (id: string, faq: Partial<Omit<FAQ, 'id' | 'updated_at'>>) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const updated = await updateFAQ(id, faq, token);
      setFaqs((prev) => prev.map((f) => (f.id === id ? updated : f)));
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'Failed to update FAQ');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const removeFaq = useCallback(async (id: string) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      await deleteFAQ(id, token);
      setFaqs((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err.message || 'Failed to delete FAQ');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Only fetch FAQs when auth is not loading and token is available
  useEffect(() => {
    if (!authLoading && token) {
      console.log('FaqContext: Token available, fetching FAQs...');
      fetchFaqs();
    } else if (!authLoading && !token) {
      console.log('FaqContext: No token available, not fetching FAQs.');
      setFaqs([]);
      setIsLoading(false);
    }
  }, [token, authLoading, fetchFaqs]);

  // Ensure faqs is always an array for safety
  const safeFaqs = Array.isArray(faqs) ? faqs : [];
  
  console.log('FaqProvider: Providing context with safeFaqs length:', safeFaqs.length);
  
  return (
    <FaqContext.Provider value={{ faqs: safeFaqs, isLoading, error, fetchFaqs, addFaq, editFaq, removeFaq }}>
      {children}
    </FaqContext.Provider>
  );
};

export const useFaq = () => {
  const context = useContext(FaqContext);
  if (context === undefined) {
    throw new Error('useFaq must be used within a FaqProvider');
  }
  return context;
}; 