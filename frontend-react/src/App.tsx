import { useState } from "react"
import { Toaster } from "@/components/ui/sonner"
import { Dashboard } from "@/components/Dashboard"
import { SendAlerts } from "@/components/SendAlerts"
import { Recipients } from "@/components/Recipients"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bell, Send, Users } from "lucide-react"

function App() {
  const [activeTab, setActiveTab] = useState("dashboard")

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Sales Notifications</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="send" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Enviar Alertas
            </TabsTrigger>
            <TabsTrigger value="recipients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Destinatarios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard onNavigate={setActiveTab} />
          </TabsContent>

          <TabsContent value="send">
            <SendAlerts />
          </TabsContent>

          <TabsContent value="recipients">
            <Recipients />
          </TabsContent>
        </Tabs>
      </main>

      <Toaster />
    </div>
  )
}

export default App
