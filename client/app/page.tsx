"use client"

import { Suspense, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Dashboard } from "@/components/dashboard"
import { FAQManagement } from "@/components/faq-management"
import { IntegrationsManagement } from "@/components/integrations-management"

function ApexChatPlatform() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derive activeTab from URL query parameter, default to 'dashboard'
  const activeTab = searchParams.get('tab') || 'dashboard';

  // Function to handle tab changes by updating URL
  const handleTabChange = (tab: string) => {
    router.push(`/?tab=${tab}`);
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />
      case "faq":
        return <FAQManagement />
      case "integrations":
        return <IntegrationsManagement />
      default:
        return <Dashboard />
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-lg font-semibold text-gray-700">Loading...</div>
      </div>
    );
  }

  if (!user) {
    // Optionally, show nothing while redirecting
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50">
        {/* Pass handleTabChange to AppSidebar */}
        <AppSidebar activeTab={activeTab} setActiveTab={handleTabChange} />
        <main className="flex-1 p-6">
          <div className="mx-auto max-w-7xl">{renderContent()}</div>
        </main>
      </div>
    </SidebarProvider>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-50"><div className="text-lg font-semibold text-gray-700">Loading...</div></div>}>
      <ApexChatPlatform />
    </Suspense>
  )
}
