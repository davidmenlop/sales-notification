import { useEffect, useState, type DragEvent } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { uploadApi } from "@/api/client"
import type { FileInfo } from "@/api/client"
import { Upload, FileSpreadsheet, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"

export function Files() {
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    loadFileInfo();
  }, []);

  const loadFileInfo = async () => {
    try {
      const info = await uploadApi.getInfo();
      setFileInfo(info);
    } catch (error) {
      console.error("Error loading file info:", error);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setError("Solo se permiten archivos Excel (.xlsx, .xls)");
      toast.error("Solo se permiten archivos Excel (.xlsx, .xls)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("El archivo es demasiado grande (máximo 10MB)");
      toast.error("El archivo es demasiado grande (máximo 10MB)");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      await uploadApi.upload(formData);
      toast.success('Archivo cargado exitosamente');
      await loadFileInfo();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.details?.[0] || 'Error al cargar el archivo';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const requiredColumns = [
    'Ejecutivo',
    'Disponibilidad',
    'Sku Infaltable',
    'ID Punto Venta',
    '% Real NSG',
    'Punto Venta'
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Archivos Excel</CardTitle>
          <CardDescription>
            Carga el archivo Excel que contiene los datos de ventas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-2">
              Arrastra tu archivo Excel aquí o haz click para seleccionar
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Formatos soportados: .xlsx, .xls (máximo 10MB)
            </p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button asChild disabled={uploading}>
                <span>
                  {uploading ? 'Cargando...' : 'Seleccionar Archivo'}
                </span>
              </Button>
            </label>
          </div>

          {fileInfo?.exists && (
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Archivo Activo</p>
                    <p className="text-sm text-muted-foreground">
                      Tamaño: {fileInfo.size ? (fileInfo.size / 1024).toFixed(2) : '0'} KB
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Cargado: {fileInfo.uploadedAt ? new Date(fileInfo.uploadedAt).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Columnas Requeridas</CardTitle>
          <CardDescription>
            Tu archivo Excel debe contener las siguientes columnas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {requiredColumns.map(col => (
              <div key={col} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>{col}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
