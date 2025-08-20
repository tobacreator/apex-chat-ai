"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, User } from "lucide-react"
import axios from "axios";
import { useAuth } from "../lib/auth-context";

interface TestResult {
  query: string
  response: string
  confidence: number
  matchedFAQ?: string
  timestamp: string
}

export function BotTester() {
  const [query, setQuery] = useState("");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const { token } = useAuth();

  const [testResults, setTestResults] = useState<TestResult[]>(() => {
    if (typeof window !== 'undefined') {
      const savedResults = localStorage.getItem('apexchat-bot-test-results');
      if (savedResults) {
        try {
          return JSON.parse(savedResults);
        } catch (e) {
          console.error("Failed to parse saved test results from localStorage:", e);
        }
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('apexchat-bot-test-results', JSON.stringify(testResults));
    }
  }, [testResults]);

  const handleTest = async () => {
    if (!query.trim() || !token) {
      setAiError("Please enter a query and ensure you are logged in.");
      return;
    }
    setIsLoadingAi(true);
    setAiError(null);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/ai/query`,
        { query_text: query },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const { response: aiResponseText, confidence, matchedData } = response.data;
      const newTestResult: TestResult = {
        query,
        response: aiResponseText,
        confidence,
        matchedFAQ: matchedData,
        timestamp: "Just now",
      };
      setTestResults([newTestResult, ...testResults]);
      setQuery("");
    } catch (error: unknown) {
      console.error("Error calling AI backend:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to get AI response. Please try again.";
      setAiError(errorMessage);
    } finally {
      setIsLoadingAi(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "bg-green-100 text-green-800"
    if (confidence >= 70) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Test Your Bot
          </CardTitle>
          <p className="text-sm text-gray-600">
            Test how your AI responds to customer queries and see confidence scores
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter a customer question to test..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleTest()}
              className="flex-1"
            />
            <Button onClick={handleTest} disabled={!query.trim() || isLoadingAi} className="gap-2">
              {isLoadingAi ? "Testing..." : "Test"}
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {aiError && (
            <p className="text-red-500 text-sm mt-2">{aiError}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {testResults.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No test results yet. Enter a query above to test your bot.
              </p>
            ) : (
              testResults.map((result, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{result.query}</p>
                      <span className="text-xs text-gray-500">{result.timestamp}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Bot className="h-5 w-5 text-blue-500 mt-1" />
                    <div className="flex-1 space-y-2">
                      <p className="text-gray-700">{result.response}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={getConfidenceColor(result.confidence)}>{result.confidence}% confidence</Badge>
                        {result.matchedFAQ && (
                          <Badge variant="outline" className="text-xs">
                            Matched: {result.matchedFAQ}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 