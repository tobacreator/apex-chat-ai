"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MetricCard } from "@/components/metric-card"
import { ChartContainer } from "@/components/chart-container"
import { MessageSquare, TrendingUp, Zap, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react" // Ensure this import is correct

export function Dashboard() {
  const metrics = [
    {
      title: "Total Conversations",
      value: "2,847",
      change: "+12.5%",
      trend: "up" as const,
      icon: MessageSquare,
    },
    {
      title: "AI Resolution Rate",
      value: "87.3%",
      change: "+5.2%",
      trend: "up" as const,
      icon: Zap,
    },
    {
      title: "Active Users",
      value: "1,234",
      change: "+8.1%",
      trend: "up" as const,
      icon: Users,
    },
    {
      title: "Response Time",
      value: "1.2s",
      change: "-0.3s",
      trend: "up" as const,
      icon: TrendingUp,
    },
  ]

  const topIntents = [
    { intent: "Product Inquiry", count: 456, percentage: 32 },
    { intent: "Order Status", count: 324, percentage: 23 },
    { intent: "Technical Support", count: 287, percentage: 20 },
    { intent: "Pricing Information", count: 198, percentage: 14 },
    { intent: "General Questions", count: 156, percentage: 11 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Monitor your WhatsApp AI automation performance</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Charts and Analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Conversation Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              title="Daily Conversations"
              data={[
                { name: "Mon", value: 120 },
                { name: "Tue", value: 150 },
                { name: "Wed", value: 180 },
                { name: "Thu", value: 165 },
                { name: "Fri", value: 200 },
                { name: "Sat", value: 140 },
                { name: "Sun", value: 110 },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Customer Intents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topIntents.map((intent, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{intent.intent}</span>
                      <span className="text-sm text-gray-500">{intent.count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${intent.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { time: "2 minutes ago", action: 'New FAQ added: "Shipping Policy"', type: "success" },
              { time: "15 minutes ago", action: "AI resolved customer inquiry about pricing", type: "info" },
              { time: "1 hour ago", action: "Integration with Shopify updated", type: "warning" },
              { time: "3 hours ago", action: "Bot training completed successfully", type: "success" },
            ].map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div
                  className={`w-2 h-2 rounded-full ${
                    activity.type === "success"
                      ? "bg-green-500"
                      : activity.type === "warning"
                        ? "bg-yellow-500"
                        : "bg-blue-500"
                  }`}
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 