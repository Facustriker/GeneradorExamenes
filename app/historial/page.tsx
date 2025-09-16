"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Eye, Search, FileText, Calendar, BookOpen } from "lucide-react"
import Link from "next/link"
import MathText from "@/components/MathText"
import MathGraph from "@/components/MathGraph"

interface PreguntaGenerada {
  id: string
  enunciado: string
  tipo: "multiple-opcion" | "desarrollo" | "verdadero-falso"
  opciones?: string[]
  respuestaCorrecta?: string | number
  justificacion?: string
  puntaje: number
  incluyeGrafico: boolean
  graphicData?: {
    type: 'line' | 'bar' | 'scatter'
    title: string
    xLabel: string
    yLabel: string
    data: Array<{ x: number; y: number }>
    annotations?: Array<{ x: number; y: number; text: string }>
  }
}

interface Examen {
  id: string
  nombre: string
  catedra_id: string
  preguntas: PreguntaGenerada[]
  created_at: string
  catedra?: {
    nombre: string
  }
}

export default function HistorialExamenesPage() {
  const [examenes, setExamenes] = useState<Examen[]>([])
  const [examenSeleccionado, setExamenSeleccionado] = useState<Examen | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCatedra, setSelectedCatedra] = useState<string>("todas")
  const [catedras, setCatedras] = useState<{ id: string; nombre: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Cargar exámenes y cátedras
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch exámenes
        const examenesRes = await fetch("/api/examenes")
        if (!examenesRes.ok) throw new Error("Error al cargar exámenes")
        const examenesData = await examenesRes.json()
        
        // Fetch cátedras
        const catedrasRes = await fetch("/api/catedras")
        if (!catedrasRes.ok) throw new Error("Error al cargar cátedras")
        const catedrasData = await catedrasRes.json()
        
        setExamenes(examenesData)
        setCatedras(catedrasData)
      } catch (err) {
        console.error(err)
        setError("Error al cargar los datos")
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  // Filtrar exámenes
  const examenesFiltrados = examenes.filter(examen => {
    const matchesSearch = examen.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCatedra = selectedCatedra === "todas" || examen.catedra_id === selectedCatedra
    return matchesSearch && matchesCatedra
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const handleVerExamen = (examen: Examen) => {
    setExamenSeleccionado(examen)
    setShowPreview(true)
  }

  const getCatedraNombre = (catedraId: string) => {
    const catedra = catedras.find(c => c.id === catedraId)
    return catedra?.nombre || "Cátedra no encontrada"
  }

  if (showPreview && examenSeleccionado) {
    return (
      <div className="min-h-screen bg-white">
        <main className="max-w-4xl mx-auto px-6 py-12">
          {/* Header de vista previa */}
          <div className="flex items-center justify-between mb-8 no-print">
            <Button variant="ghost" onClick={() => setShowPreview(false)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al historial
            </Button>
            <Button onClick={() => window.print()} className="bg-indigo-500 hover:bg-indigo-600 text-white">
              Imprimir Vista Previa
            </Button>
          </div>

          {/* Vista previa del examen */}
          <div className="bg-white border border-slate-300 rounded-lg p-8 shadow-sm">
            {/* Encabezado del examen */}
            <div className="text-center mb-8 border-b border-slate-300 pb-6">
              <h1 className="font-heading font-black text-2xl text-slate-800 mb-2">
                {examenSeleccionado.nombre}
              </h1>
              <p className="text-slate-600 mb-1">Cátedra: {getCatedraNombre(examenSeleccionado.catedra_id)}</p>
              <p className="text-slate-600 text-sm">Fecha: {formatDate(examenSeleccionado.created_at)}</p>
              <div className="mt-4 flex justify-between text-sm text-slate-600">
                <span>Nombre: _________________________</span>
                <span>Legajo: _____________</span>
              </div>
            </div>

            {/* Preguntas */}
            <div className="space-y-6">
              {examenSeleccionado.preguntas.map((pregunta, index) => (
                <div key={pregunta.id} className="border-b border-slate-200 pb-6 last:border-b-0">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-slate-800">
                      {index + 1}. <MathText>{pregunta.enunciado}</MathText>
                    </h3>
                    <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded ml-4 flex-shrink-0">
                      ({pregunta.puntaje} {pregunta.puntaje === 1 ? "punto" : "puntos"})
                    </span>
                  </div>

                  {/* Opciones para múltiple opción */}
                  {pregunta.tipo === "multiple-opcion" && pregunta.opciones && (
                    <div className="ml-4 space-y-2">
                      {pregunta.opciones.map((opcion, idx) => (
                        <div key={idx} className="flex items-center">
                          <span className="w-6 h-6 border border-slate-400 rounded mr-3 flex-shrink-0"></span>
                          <span className="text-slate-700">
                            {String.fromCharCode(65 + idx)}) <MathText>{opcion}</MathText>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Espacio para desarrollo */}
                  {pregunta.tipo === "desarrollo" && (
                    <div className="ml-4 mt-4">
                      <div className="space-y-3">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="border-b border-slate-300"></div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verdadero/Falso */}
                  {pregunta.tipo === "verdadero-falso" && (
                    <div className="ml-4 space-y-3">
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center">
                          <span className="w-5 h-5 border border-slate-400 rounded mr-2"></span>
                          <span>Verdadero</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-5 h-5 border border-slate-400 rounded mr-2"></span>
                          <span>Falso</span>
                        </div>
                      </div>
                      {pregunta.justificacion && (
                        <div className="mt-3">
                          <p className="text-sm text-slate-600 mb-2">{pregunta.justificacion}</p>
                          <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                              <div key={i} className="border-b border-slate-300"></div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Gráfico matemático */}
                  {pregunta.incluyeGrafico && pregunta.graphicData && (
                    <div className="ml-4 mt-4 math-graph">
                      <MathGraph graphicData={pregunta.graphicData} />
                    </div>
                  )}
                  {pregunta.incluyeGrafico && !pregunta.graphicData && (
                    <div className="ml-4 mt-4 p-4 border-2 border-dashed border-slate-300 rounded-lg">
                      <p className="text-center text-slate-500 text-sm">[ Gráfico no generado ]</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pie del examen */}
            <div className="mt-8 pt-6 border-t border-slate-300 text-center text-sm text-slate-600">
              <p>Total de puntos: {examenSeleccionado.preguntas.reduce((sum, p) => sum + p.puntaje, 0)}</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
          <h1 className="font-heading font-bold text-xl text-slate-800">Historial de Exámenes</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Filtros */}
        <Card className="p-6 bg-white border-slate-200 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por nombre del examen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <Select value={selectedCatedra} onValueChange={setSelectedCatedra}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por cátedra" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las cátedras</SelectItem>
                  {catedras.map((catedra) => (
                    <SelectItem key={catedra.id} value={catedra.id}>
                      {catedra.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Tabla de exámenes */}
        {loading ? (
          <Card className="p-12 text-center bg-white">
            <p className="text-slate-500">Cargando exámenes...</p>
          </Card>
        ) : error ? (
          <Card className="p-12 text-center bg-white">
            <p className="text-red-500">{error}</p>
          </Card>
        ) : examenesFiltrados.length === 0 ? (
          <Card className="p-12 text-center bg-white">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="font-heading font-bold text-xl text-slate-600 mb-2">
              {searchTerm || selectedCatedra !== "todas" ? "No se encontraron exámenes" : "No hay exámenes"}
            </h3>
            <p className="text-slate-500 mb-6">
              {searchTerm || selectedCatedra !== "todas" 
                ? "Intenta cambiar los filtros de búsqueda"
                : "Los exámenes que generes aparecerán aquí"
              }
            </p>
            {!searchTerm && selectedCatedra === "todas" && (
              <Link href="/generar">
                <Button className="bg-indigo-500 hover:bg-indigo-600">
                  Generar Primer Examen
                </Button>
              </Link>
            )}
          </Card>
        ) : (
          <Card className="bg-white border-slate-200">
            {/* Header de la tabla */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-200 bg-slate-50 font-medium text-sm text-slate-600">
              <div className="col-span-5">Nombre del Examen</div>
              <div className="col-span-2">Cátedra</div>
              <div className="col-span-3">Fecha de Creación</div>
              <div className="col-span-1">Preguntas</div>
              <div className="col-span-1">Acciones</div>
            </div>
            
            {/* Filas de la tabla */}
            <div className="divide-y divide-slate-200">
              {examenesFiltrados.map((examen) => (
                <div key={examen.id} className="grid grid-cols-12 gap-4 p-4 hover:bg-slate-50 transition-colors">
                  <div className="col-span-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-indigo-500" />
                      </div>
                      <span className="text-slate-800 font-medium">{examen.nombre}</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{getCatedraNombre(examen.catedra_id)}</span>
                    </div>
                  </div>
                  <div className="col-span-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{formatDate(examen.created_at)}</span>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <span className="text-slate-600">{examen.preguntas.length}</span>
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVerExamen(examen)}
                      className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Resumen */}
        {!loading && !error && examenes.length > 0 && (
          <div className="mt-6 text-center text-sm text-slate-500">
            Mostrando {examenesFiltrados.length} de {examenes.length} exámenes
          </div>
        )}
      </main>
    </div>
  )
}