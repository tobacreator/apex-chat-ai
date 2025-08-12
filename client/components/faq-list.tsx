"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, Save, X } from "lucide-react"
import { useFaq } from "@/lib/faq-context"
import { FAQ } from "@/services/faqService"

export function FAQList() {
  const { faqs, isLoading, error, editFaq, removeFaq } = useFaq();
  console.log('FAQList: Received FAQs prop:', faqs);
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ question: "", answer: "", category: "" })
  const [formError, setFormError] = useState<string | null>(null);

  const handleEdit = (faq: FAQ) => {
    setEditingId(faq.id)
    setEditForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || '',
    })
    setFormError(null);
  }

  const handleSave = async (id: string) => {
    setFormError(null);
    if (!editForm.question.trim() || !editForm.answer.trim()) {
      setFormError("Question and answer are required.");
      return;
    }
    try {
      await editFaq(id, editForm);
      setEditingId(null);
    } catch (err: any) {
      setFormError(typeof err === 'string' ? err : err.message || 'Failed to update FAQ');
    }
  }

  const handleDelete = async (id: string) => {
    setFormError(null);
    try {
      await removeFaq(id);
    } catch (err: any) {
      setFormError(typeof err === 'string' ? err : err.message || 'Failed to delete FAQ');
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Shipping: "bg-blue-100 text-blue-800",
      Orders: "bg-green-100 text-green-800",
      Returns: "bg-yellow-100 text-yellow-800",
      Products: "bg-purple-100 text-purple-800",
    }
    return colors[category] || "bg-gray-100 text-gray-800"
  }

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading FAQs...</div>;
  }
  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {faqs.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No FAQs found.</div>
      ) : (
        faqs.map((faq: FAQ) => (
          <div key={faq.id} className="border border-gray-200 rounded-lg p-4">
            {editingId === faq.id ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
                  <Input
                    value={editForm.question}
                    onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Answer</label>
                  <Textarea
                    value={editForm.answer}
                    onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <Input
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  />
                </div>
                {formError && <div className="text-red-600 text-sm">{formError}</div>}
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleSave(faq.id)} className="gap-1">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="gap-1">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-2">{faq.question}</h3>
                    <p className="text-gray-600 text-sm mb-3">{faq.answer}</p>
                    <div className="flex items-center gap-3">
                      <Badge className={getCategoryColor(faq.category || '')}>{faq.category || 'Uncategorized'}</Badge>
                      <span className="text-xs text-gray-500">Updated {faq.updated_at ? new Date(faq.updated_at).toLocaleString() : "-"}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(faq)} className="gap-1">
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(faq.id)}
                      className="gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
} 