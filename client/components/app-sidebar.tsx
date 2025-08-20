"use client"

import { BarChart3, MessageSquare, Zap, LogOut } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar" // Assumes shadcn/ui sidebar components are in this path
import { useAuth } from "@/lib/auth-context"

interface AppSidebarProps {
  activeTab: string
  /**
   * Called when a tab is selected. Updates the URL query parameter in the parent.
   */
  setActiveTab: (tab: string) => void
}

const menuItems = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: BarChart3,
  },
  {
    id: "faq",
    title: "FAQ Management",
    icon: MessageSquare,
  },
  {
    id: "integrations",
    title: "Integrations",
    icon: Zap,
  },
]

export function AppSidebar({ activeTab, setActiveTab }: AppSidebarProps) {
  const { logout } = useAuth();

  return (
    <Sidebar className="border-r border-gray-200 flex flex-col h-full">
      <SidebarHeader className="border-b border-gray-200 p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">ApexChat AI</h1>
            <p className="text-sm text-gray-500">WhatsApp Automation</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex-1 flex flex-col justify-between">
        <div>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => setActiveTab(item.id)}
                      isActive={activeTab === item.id}
                      className="w-full justify-start"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
        {/* Logout button at the bottom */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={logout}
                  className="w-full justify-start text-red-600 hover:text-red-700"
                  aria-label="Logout"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
} 