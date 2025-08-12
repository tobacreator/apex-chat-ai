import axios from 'axios';

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
  updated_at?: string; // ISO string from backend
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function getFAQs(token: string, category?: string): Promise<FAQ[]> {
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
    };
    const res = await axios.get(`${API_BASE_URL}/faqs`, {
      headers,
      params: category ? { category } : undefined,
    });
    return res.data.faqs;
  } catch (error: any) {
    throw error.response?.data?.error || error.message || 'Failed to fetch FAQs';
  }
}

export async function createFAQ(faq: Omit<FAQ, 'id' | 'updated_at'>, token: string): Promise<FAQ> {
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
    };
    const res = await axios.post(`${API_BASE_URL}/faqs`, faq, {
      headers,
    });
    return res.data.faq;
  } catch (error: any) {
    throw error.response?.data?.error || error.message || 'Failed to create FAQ';
  }
}

export async function updateFAQ(id: string, faq: Partial<Omit<FAQ, 'id' | 'updated_at'>>, token: string): Promise<FAQ> {
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
    };
    const res = await axios.put(`${API_BASE_URL}/faqs/${id}`, faq, {
      headers,
    });
    return res.data.faq;
  } catch (error: any) {
    throw error.response?.data?.error || error.message || 'Failed to update FAQ';
  }
}

export async function deleteFAQ(id: string, token: string): Promise<void> {
  try {
    const headers = {
      Authorization: `Bearer ${token}`,
    };
    await axios.delete(`${API_BASE_URL}/faqs/${id}`, {
      headers,
    });
  } catch (error: any) {
    throw error.response?.data?.error || error.message || 'Failed to delete FAQ';
  }
} 