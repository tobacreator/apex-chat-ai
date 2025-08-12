"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const { signup, isLoading } = useAuth();
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [whatsappPhoneNumber, setWhatsappPhoneNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!whatsappPhoneNumber) {
      setError("WhatsApp phone number is required.");
      return;
    }
    try {
      const ok = await signup(businessName, email, password, whatsappPhoneNumber);
      if (ok) {
        setSuccess(true);
        setTimeout(() => router.push("/login"), 1000);
      } else {
        setError("Signup failed. Please check your details and try again.");
      }
    } catch (err: any) {
      if (err.message === "Email already registered") {
        setError("Email already registered");
      } else {
        setError("Signup failed. Please check your details and try again.");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-md space-y-6"
      >
        <h1 className="text-2xl font-bold text-center">Sign Up for ApexChat AI</h1>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Phone Number</label>
          <input
            type="tel"
            value={whatsappPhoneNumber}
            onChange={(e) => setWhatsappPhoneNumber(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            placeholder="e.g., +12345678901 (E.164 format)"
            required
          />
          <p className="text-sm text-gray-500 mt-1">Include country code, e.g., +1 for USA. Must be in E.164 format.</p>
        </div>
        {error && <div className="text-red-600 text-sm text-center">{error}</div>}
        {success && <div className="text-green-600 text-sm text-center">Signup successful! Redirecting to login...</div>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 transition"
          disabled={isLoading}
        >
          {isLoading ? "Signing up..." : "Sign Up"}
        </button>
        <div className="text-center text-sm mt-2">
          Already have an account? <a href="/login" className="text-blue-600 hover:underline">Login</a>
        </div>
      </form>
    </div>
  );
} 