import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { statusApi, rulesApi, recipientsApi } from "@/api/client"
import type { StatusResponse, Rule } from "@/api/client"
import { QRCodeSVG } from "qrcode.react"
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Send, Users, LogOut } from "lucide-react"
import { toast } from "sonner"

interface DashboardProps {
  onNavigate: (tab: string) => void
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [rules, setRules] = useState<Rule[]>([])
  const [executivesCount, setExecutivesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const statusData = await statusApi.get()
      setStatus(statusData)

      try {
        const rulesData = await rulesApi.list()
        setRules(rulesData)
      } catch {
        // ignore
      }

      try {
        const executivesData = await recipientsApi.executives()
        setExecutivesCount(executivesData.filter((e: any) => e.configured).length)
      } catch {
        setExecutivesCount(0)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = () => {
    if (!status) return null

    const statusConfig = {
      connected: { icon: Wifi, label: "Conectado", variant: "default" as const, color: "text-green-500" },
      connecting: { icon: RefreshCw, label: "Conectando...", variant: "secondary" as const, color: "text-yellow-500" },
      qr_required: { icon: AlertCircle, label: "Escanear QR", variant: "destructive" as const, color: "text-purple-500" },
      disconnected: { icon: WifiOff, label: "Desconectado", variant: "destructive" as const, color: "text-red-500" },
    }

    const config = statusConfig[status.status] || statusConfig.disconnected
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {config.label}
      </Badge>
    )
  }

  void getStatusBadge // suppress unused warning

  const handleLogout = async () => {
    if (!confirm("¿Estás seguro de que deseas cerrar la sesión de WhatsApp?")) {
      return
    }

    setLoggingOut(true)
    try {
      await statusApi.logout()
      toast.success("Sesión cerrada correctamente")
      await fetchData()
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
      toast.error("Error al cerrar sesión")
    } finally {
      setLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {status?.status === "qr_required" && status.qr && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-purple-500" />
              Escanea este código QR con WhatsApp
            </CardTitle>
            <CardDescription>
              Abre WhatsApp → Configuración → Dispositivos vinculados → Vincular un dispositivo
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <div className="p-4 bg-white rounded-lg">
              <QRCodeSVG value={status.qr} size={256} level="L" />
            </div>
            <p className="text-sm text-muted-foreground">
              El QR se actualiza automáticamente cada 20 segundos
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado WhatsApp</CardTitle>
            {status?.status === "connected" ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.status === "connected" ? "Activo" : "Inactivo"}</div>
            <p className="text-xs text-muted-foreground">
              {status?.status === "connected" ? "Conectado a WhatsApp" : "Esperando conexión"}
            </p>
            {status?.status === "connected" && (
              <Button
                variant="destructive"
                size="sm"
                className="mt-3 w-full"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4 mr-2" />
                )}
                {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reglas Activas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.filter(r => r.enabled).length}</div>
            <p className="text-xs text-muted-foreground">de {rules.length} configuradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Destinatarios</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{executivesCount}</div>
            <p className="text-xs text-muted-foreground">ejecutivos configurados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>Accede rápidamente a las funciones principales</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button onClick={() => onNavigate("send")}>
            <Send className="h-4 w-4 mr-2" />
            Enviar Alertas
          </Button>
          <Button variant="outline" onClick={() => onNavigate("recipients")}>
            <Users className="h-4 w-4 mr-2" />
            Gestionar Destinatarios
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
