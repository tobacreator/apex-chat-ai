"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Settings, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react"

interface Integration {
  id: string
  name: string
  description: string
  status: "connected" | "disconnected" | "error"
  icon: string // This will be a string representation of an emoji or similar
  lastSync: string
  error?: string
}

interface IntegrationCardProps {
  integration: Integration
  onConnectClick?: () => void
  children?: React.ReactNode
}

export function IntegrationCard({ integration, onConnectClick, children }: IntegrationCardProps) {
  const getStatusIcon = () => {
    switch (integration.status) {
      case "connected":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <XCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = () => {
    switch (integration.status) {
      case "connected":
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>
      case "error":
        return <Badge className="bg-red-100 text-red-800">Error</Badge>
      default:
        return <Badge variant="outline">Disconnected</Badge>
    }
  }

  const getActionButton = () => {
    switch (integration.status) {
      case "connected":
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1 bg-transparent">
              <RefreshCw className="h-4 w-4" />
              Sync
            </Button>
            <Button size="sm" variant="outline" className="gap-1 bg-transparent">
              <Settings className="h-4 w-4" />
              Configure
            </Button>
          </div>
        )
      case "error":
        return (
          <Button size="sm" className="gap-1">
            <Settings className="h-4 w-4" />
            Fix Connection
          </Button>
        )
      default:
        return (
          <Button size="sm" className="gap-1" onClick={onConnectClick}>
            Connect {integration.name}
          </Button>
        )
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{integration.icon}</div>
            <div>
              <CardTitle className="text-lg">{integration.name}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{integration.description}</p>
            </div>
          </div>
          {getStatusIcon()}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {getStatusBadge()}
            <span className="text-xs text-gray-500">Last sync: {integration.lastSync}</span>
          </div>

          {integration.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{integration.error}</p>
            </div>
          )}

          <div className="flex justify-end">{getActionButton()}</div>

          {children}
        </div>
      </CardContent>
    </Card>
  )
} 