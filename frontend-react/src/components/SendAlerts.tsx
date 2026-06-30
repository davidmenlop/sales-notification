import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { rulesApi, previewApi } from "@/api/client"
import type { Rule, PreviewResponse } from "@/api/client"
import { Eye, Send, FlaskConical, Trash2, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react"
import { toast } from "sonner"

interface LogEntry {
  id: string
  timestamp: string
  type: "info" | "success" | "warning" | "error" | "preview"
  message: string
  data?: unknown
}

export function SendAlerts() {
  const [rules, setRules] = useState<Rule[]>([])
  const [selectedRules, setSelectedRules] = useState<Set<string>>(new Set())
  const [preview, setPreview] = useState<PreviewResponse[] | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    try {
      const data = await rulesApi.list()
      setRules(data)
      setSelectedRules(new Set(data.filter(r => r.enabled).map(r => r.id)))
    } catch (error) {
      console.error("Error fetching rules:", error)
      toast.error("Error al cargar las reglas")
    }
  }

  const toggleRule = (ruleId: string) => {
    const newSelected = new Set(selectedRules)
    if (newSelected.has(ruleId)) {
      newSelected.delete(ruleId)
    } else {
      newSelected.add(ruleId)
    }
    setSelectedRules(newSelected)
  }

  const handlePreview = async () => {
    if (selectedRules.size === 0) {
      toast.error("Selecciona al menos una regla")
      return
    }

    try {
      const data = await previewApi.generate(Array.from(selectedRules))
      setPreview(data.previews)
      toast.success("Preview generado")
    } catch (error) {
      console.error("Error generating preview:", error)
      toast.error("Error al generar preview")
    }
  }

  const handleSend = async (dryRun: boolean = false) => {
    if (selectedRules.size === 0) {
      toast.error("Selecciona al menos una regla")
      return
    }

    if (!dryRun && !confirm("¿Estás seguro de que deseas enviar las alertas?")) {
      return
    }

    setSending(true)
    setLogs([])
    setPreview(null)

    const addLog = (type: LogEntry["type"], message: string, data?: unknown) => {
      setLogs(prev => [...prev, {
        id: Date.now().toString() + Math.random(),
        timestamp: new Date().toISOString(),
        type,
        message,
        data,
      }])
    }

    try {
      const url = `http://localhost:3000/api/send`
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleIds: Array.from(selectedRules), dryRun }),
      })

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No reader available")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const logData = JSON.parse(line.slice(6))
              addLog(logData.type, logData.message, logData.data)
            } catch {
              // ignore parse errors
            }
          }
        }
      }

      toast.success(dryRun ? "Dry run completado" : "Envío completado")
    } catch (error) {
      console.error("Error sending:", error)
      addLog("error", `Error: ${error}`)
      toast.error("Error al enviar")
    } finally {
      setSending(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  const getLogIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "success": return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "error": return <XCircle className="h-4 w-4 text-red-500" />
      case "warning": return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case "preview": return <Eye className="h-4 w-4 text-purple-500" />
      default: return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const getLogColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "success": return "text-green-600 dark:text-green-400"
      case "error": return "text-red-600 dark:text-red-400"
      case "warning": return "text-yellow-600 dark:text-yellow-400"
      case "preview": return "text-purple-600 dark:text-purple-400"
      default: return "text-blue-600 dark:text-blue-400"
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Reglas</CardTitle>
          <CardDescription>Elige las reglas que deseas ejecutar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScrollArea className="h-[200px] rounded-md border p-4">
            <div className="space-y-3">
              {rules.map(rule => (
                <div key={rule.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={rule.id}
                    checked={selectedRules.has(rule.id)}
                    onCheckedChange={() => toggleRule(rule.id)}
                    disabled={!rule.enabled}
                  />
                  <label htmlFor={rule.id} className="flex-1 cursor-pointer">
                    <div className="font-medium">{rule.name}</div>
                    <div className="text-xs text-muted-foreground uppercase">{rule.type}</div>
                  </label>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Button onClick={handlePreview} disabled={sending || selectedRules.size === 0}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={() => handleSend(false)} disabled={sending || selectedRules.size === 0}>
              <Send className="h-4 w-4 mr-2" />
              Enviar
            </Button>
            <Button variant="outline" onClick={() => handleSend(true)} disabled={sending || selectedRules.size === 0}>
              <FlaskConical className="h-4 w-4 mr-2" />
              Dry Run
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview && preview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview del Mensaje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview.map(p => (
              <div key={p.ruleId} className="space-y-3">
                <h4 className="font-medium text-sm">{p.ruleName}</h4>
                {p.alerts.map((alert, idx) => (
                  <div key={idx} className="border-l-4 border-primary pl-4 py-2 bg-muted/50 rounded-r">
                    <div className="text-sm text-muted-foreground mb-2">
                      <strong>{alert.recipientName}</strong> ({alert.recipient})
                    </div>
                    <pre className="text-xs whitespace-pre-wrap font-mono bg-background p-3 rounded">
                      {alert.message}
                    </pre>
                  </div>
                ))}
                {p.alerts.length === 0 && (
                  <p className="text-sm text-muted-foreground">No hay alertas para esta regla</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Logs de Ejecución
            </CardTitle>
            <CardDescription>Registro en tiempo real de la ejecución</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={clearLogs} disabled={logs.length === 0}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] rounded-md bg-muted/50 p-4 font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-center text-muted-foreground">
                Los logs aparecerán aquí cuando se ejecute una acción...
              </p>
            ) : (
              <div className="space-y-2">
                {logs.map(log => (
                  <div key={log.id} className="flex items-start gap-2">
                    {getLogIcon(log.type)}
                    <div className="flex-1">
                      <span className="text-muted-foreground text-xs">
                        [{new Date(log.timestamp).toLocaleTimeString()}]
                      </span>{" "}
                      <span className={getLogColor(log.type)}>{log.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
