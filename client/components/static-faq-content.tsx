// Server component for static FAQ management layout

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default function StaticFaqContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">FAQ Management</h1>
          <p className="text-gray-600">Configure and manage your AI responses</p>
        </div>
      </div>

      <Tabs defaultValue="faqs" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="faqs">FAQ Management</TabsTrigger>
          <TabsTrigger value="test">Test Your Bot</TabsTrigger>
        </TabsList>

        <TabsContent value="faqs" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Manage your AI&apos;s knowledge base and responses</p>
              </div>
              {/* Button will be client-side */}
            </CardHeader>
            {/* Dynamic content like form and list will be client-side */}
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          {/* BotTester will be client-side */}
        </TabsContent>
      </Tabs>
    </div>
  );
} 