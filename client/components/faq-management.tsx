"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FAQList } from "@/components/faq-list"
import { BotTester } from "@/components/bot-tester"
import { useFaq } from "@/lib/faq-context"
import StaticFaqContent from "./static-faq-content"; // Import server component
import { Suspense } from 'react';

export function FAQManagement() {
  const [isAddingFAQ, setIsAddingFAQ] = useState(false)
  const [newFAQ, setNewFAQ] = useState({ question: "", answer: "", category: "" })
  const { addFaq, isLoading, error } = useFaq();
  const [formError, setFormError] = useState<string | null>(null);

  const handleAddFAQ = async () => {
    setFormError(null);
    if (!newFAQ.question.trim() || !newFAQ.answer.trim()) {
      setFormError("Question and answer are required.");
      return;
    }
    try {
      await addFaq({ question: newFAQ.question, answer: newFAQ.answer, category: newFAQ.category });
      setNewFAQ({ question: "", answer: "", category: "" });
      setIsAddingFAQ(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add FAQ';
      setFormError(errorMessage);
    }
  }

  return (
    <Suspense fallback={<div>Loading FAQ Management...</div>}>
      <StaticFaqContent />
      {/* Overlay client interactive elements */}
      {isAddingFAQ && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-lg font-medium mb-4">Add New FAQ</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
              <Input
                placeholder="Enter the question customers might ask..."
                value={newFAQ.question}
                onChange={(e) => setNewFAQ({ ...newFAQ, question: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Answer</label>
              <Textarea
                placeholder="Enter the AI response..."
                rows={4}
                value={newFAQ.answer}
                onChange={(e) => setNewFAQ({ ...newFAQ, answer: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <Input
                placeholder="e.g., Shipping, Returns, Products..."
                value={newFAQ.category}
                onChange={(e) => setNewFAQ({ ...newFAQ, category: e.target.value })}
              />
            </div>
            {formError && <div className="text-red-600 text-sm">{formError}</div>}
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div className="flex gap-2">
              <Button onClick={handleAddFAQ} disabled={isLoading}>{isLoading ? "Adding..." : "Add FAQ"}</Button>
              <Button variant="outline" onClick={() => setIsAddingFAQ(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      <FAQList />
      <BotTester />
    </Suspense>
  );
}

// Note: Interactive parts (state, hooks) remain client-side; static layout offloaded to server. 