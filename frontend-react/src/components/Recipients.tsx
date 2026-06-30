import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { recipientsApi } from "@/api/client"
import type { Executive } from "@/api/client"
import { RefreshCw, UserPlus, Edit, Trash2, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

export function Recipients() {
  const [executives, setExecutives] = useState<Executive[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingExecutive, setEditingExecutive] = useState<Executive | null>(null)
  const [formData, setFormData] = useState({ name: "", whatsapp: "", enabled: true })

  useEffect(() => {
    fetchExecutives()
  }, [])

  const fetchExecutives = async () => {
    try {
      const data = await recipientsApi.executives()
      setExecutives(data)
    } catch (error) {
      console.error("Error fetching executives:", error)
      toast.error("Error al cargar ejecutivos")
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    try {
      const result = await recipientsApi.sync()
      toast.success(result.message)
      await fetchExecutives()
    } catch (error) {
      console.error("Error syncing:", error)
      toast.error("Error al sincronizar")
    }
  }

  const handleAdd = () => {
    setEditingExecutive(null)
    setFormData({ name: "", whatsapp: "", enabled: true })
    setDialogOpen(true)
  }

  const handleEdit = (executive: Executive) => {
    setEditingExecutive(executive)
    setFormData({
      name: executive.name,
      whatsapp: executive.whatsapp || "",
      enabled: executive.enabled,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (name: string) => {
    if (!confirm(`¿Eliminar a ${name}?`)) return

    try {
      await recipientsApi.delete(name)
      toast.success("Destinatario eliminado")
      await fetchExecutives()
    } catch (error) {
      console.error("Error deleting:", error)
      toast.error("Error al eliminar")
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("El nombre es requerido")
      return
    }

    try {
      if (editingExecutive) {
        await recipientsApi.update(editingExecutive.name, {
          whatsapp: formData.whatsapp || null,
          enabled: formData.enabled,
        })
        toast.success("Destinatario actualizado")
      } else {
        await recipientsApi.create({
          name: formData.name,
          whatsapp: formData.whatsapp || null,
          enabled: formData.enabled,
        })
        toast.success("Destinatario creado")
      }
      setDialogOpen(false)
      await fetchExecutives()
    } catch (error) {
      console.error("Error saving:", error)
      toast.error("Error al guardar")
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
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Destinatarios</CardTitle>
          <CardDescription>Administra los ejecutivos que recibirán las alertas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button onClick={handleSync}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar desde Excel
            </Button>
            <Button variant="outline" onClick={handleAdd}>
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar Destinatario
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ejecutivo</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Habilitado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executives.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No hay ejecutivos. Sincroniza desde Excel o agrega manualmente.
                    </TableCell>
                  </TableRow>
                ) : (
                  executives.map(executive => (
                    <TableRow key={executive.name}>
                      <TableCell className="font-medium">{executive.name}</TableCell>
                      <TableCell>
                        {executive.whatsapp || (
                          <span className="text-muted-foreground">No configurado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {executive.configured ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Configurado
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Sin número
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {!executive.enabled ? (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            Deshabilitado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            Habilitado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(executive)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(executive.name)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExecutive ? "Editar Destinatario" : "Agregar Destinatario"}</DialogTitle>
            <DialogDescription>
              {editingExecutive
                ? "Modifica los datos del destinatario"
                : "Ingresa los datos del nuevo destinatario"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Ejecutivo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                disabled={!!editingExecutive}
                placeholder="Ej: Natalia Rivera Vega"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">Número de WhatsApp</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="+573001234567"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked: boolean) => setFormData({ ...formData, enabled: checked })}
              />
              <Label htmlFor="enabled">Habilitado</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
