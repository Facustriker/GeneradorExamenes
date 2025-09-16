"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react"

interface ApiStatus {
  name: string
  endpoint: string
  status: "checking" | "online" | "offline" | "error"
  responseTime?: number
  error?: string
}

export default function DiagnosticoPage() {
  const [apiStatuses, setApiStatuses] = useState<ApiStatus[]>([
    { name: "Cátedras", endpoint: "/api/catedras", status: "checking" },
    { name: "Subir Archivo", endpoint: "/api/upload", status: "checking" },
    { name: "Procesar PDF", endpoint: "/api/process-pdf", status: "checking" },
    { name: "Generar Preguntas", endpoint: "/api/generate-questions", status: "checking" },
    { name: "Exportar PDF", endpoint: "/api/export-pdf", status: "checking" },
    { name: "Exámenes", endpoint: "/api/examenes", status: "checking" },
  ])

  const checkApiStatus = async (api: ApiStatus): Promise<ApiStatus> => {
    const startTime = Date.now()

    try {
      // Para APIs GET, hacemos GET. Para APIs POST, verificamos que den 405
      const method = api.endpoint === "/api/catedras" || api.endpoint === "/api/examenes" ? "GET" : "POST"

      const response = await fetch(api.endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "POST" ? JSON.stringify({}) : undefined,
      })

      const responseTime = Date.now() - startTime

      // Para APIs POST, 405 (Method Not Allowed) significa que está online
      // Para APIs GET, 200 significa que está online
      if (
        (method === "GET" && response.ok) ||
        (method === "POST" && response.status === 405) ||
        (method === "POST" && response.status === 400) // Bad Request también indica que está online
      ) {
        return { ...api, status: "online", responseTime }
      } else {
        return {
          ...api,
          status: "error",
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        ...api,
        status: "offline",
        responseTime,
        error: error instanceof Error ? error.message : "Error desconocido",
      }
    }
  }

  const checkAllApis = async () => {
    setApiStatuses((prev) => prev.map((api) => ({ ...api, status: "checking" as const })))

    const promises = apiStatuses.map(checkApiStatus)
    const results = await Promise.all(promises)

    setApiStatuses(results)
  }

  const getStatusIcon = (status: ApiStatus["status"]) => {
    switch (status) {
      case "online":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "offline":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "checking":
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />
    }
  }

  const getStatusBadge = (status: ApiStatus["status"]) => {
    switch (status) {
      case "online":
        return (
          <Badge variant="default" className="bg-green-500">
            En línea
          </Badge>
        )
      case "offline":
        return <Badge variant="destructive">Fuera de línea</Badge>
      case "error":
        return (
          <Badge variant="secondary" className="bg-yellow-500">
            Error
          </Badge>
        )
      case "checking":
        return <Badge variant="outline">Verificando...</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Diagnóstico de APIs</h1>
          <p className="text-slate-600">Verifica el estado de todas las APIs del generador de exámenes</p>
        </div>

        <div className="mb-6 text-center">
          <Button onClick={checkAllApis} size="lg">
            Verificar todas las APIs
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {apiStatuses.map((api) => (
            <Card key={api.endpoint}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{api.name}</CardTitle>
                  {getStatusIcon(api.status)}
                </div>
                <CardDescription className="font-mono text-sm">{api.endpoint}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  {getStatusBadge(api.status)}
                  {api.responseTime && <span className="text-sm text-slate-500">{api.responseTime}ms</span>}
                </div>
                {api.error && <p className="text-sm text-red-600 mt-2">{api.error}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Información sobre suspensión de APIs:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>
              • <strong>Supabase:</strong> Se pausa después de 1 semana sin actividad
            </li>
            <li>
              • <strong>Vercel Functions:</strong> Se mantienen activas mientras el proyecto esté desplegado
            </li>
            <li>
              • <strong>Vercel Blob:</strong> Siempre disponible
            </li>
            <li>
              • <strong>APIs de IA (Grok/Groq):</strong> Dependen de las API keys y límites de uso
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
