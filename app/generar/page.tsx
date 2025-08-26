"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Upload, FileText, ArrowLeft, Plus, Trash2, Settings, Loader2, Edit3, Save, X } from "lucide-react"
import Link from "next/link"

interface Pregunta {
  id: string
  tipoPregunta: "multiple-opcion" | "desarrollo" | "verdadero-falso"
  justificacionVF?: "verdaderas" | "falsas" | "sin-justificar"
  incluyeGrafico: boolean
  puntaje: number
  tipo: "teoria" | "practica" | "mixta"
}

interface PreguntaGenerada {
  id: string
  enunciado: string
  tipo: "multiple-opcion" | "desarrollo" | "verdadero-falso"
  opciones?: string[]
  respuestaCorrecta?: string | number
  justificacion?: string
  puntaje: number
  incluyeGrafico: boolean
}

interface ExamenData {
  nombre: string
  catedra: string
  preguntas: PreguntaGenerada[]
  fechaCreacion: Date
}

export default function GenerarExamenPage() {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showConfiguration, setShowConfiguration] = useState(false)
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [examenGenerado, setExamenGenerado] = useState<PreguntaGenerada[]>([])
  const [showExamen, setShowExamen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null)

  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [nombreExamen, setNombreExamen] = useState("")
  const [catedraSeleccionada, setCatedraSeleccionada] = useState("")

  const catedras = [
    "Matemática",
    "Física",
    "Química",
    "Historia",
    "Lengua y Literatura",
    "Biología",
    "Geografía",
    "Inglés",
  ]

  const [nuevaPregunta, setNuevaPregunta] = useState<Omit<Pregunta, "id">>({
    tipoPregunta: "multiple-opcion",
    justificacionVF: "sin-justificar",
    incluyeGrafico: false,
    puntaje: 1,
    tipo: "teoria",
  })

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    const pdfFile = files.find((file) => file.type === "application/pdf")

    if (pdfFile) {
      setSelectedFile(pdfFile)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === "application/pdf") {
      setSelectedFile(file)
    }
  }, [])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const handleContinueConfiguration = () => {
    setShowConfiguration(true)
  }

  const agregarPregunta = () => {
    const nuevaP: Pregunta = {
      ...nuevaPregunta,
      id: Date.now().toString(),
    }
    setPreguntas([...preguntas, nuevaP])
    setNuevaPregunta({
      tipoPregunta: "multiple-opcion",
      justificacionVF: "sin-justificar",
      incluyeGrafico: false,
      puntaje: 1,
      tipo: "teoria",
    })
    setShowAddQuestion(false)
  }

  const eliminarPregunta = (id: string) => {
    setPreguntas(preguntas.filter((p) => p.id !== id))
  }

  const getTipoPreguntaTexto = (pregunta: Pregunta) => {
    switch (pregunta.tipoPregunta) {
      case "multiple-opcion":
        return "Múltiple opción"
      case "desarrollo":
        return "Desarrollo"
      case "verdadero-falso":
        return "Verdadero/Falso"
      default:
        return "Pregunta estándar"
    }
  }

  const puedeCrearExamen = preguntas.length > 0 && selectedFile

  // Funciones para generar examen con IA
  const handleCreateExam = async () => {
    if (!selectedFile || preguntas.length === 0) return

    setIsGenerating(true)

    try {
      console.log("[v0] Iniciando generación de examen con IA")

      // Primero subir el PDF y extraer texto
      const formData = new FormData()
      formData.append("file", selectedFile)

      console.log("[v0] Subiendo PDF...")
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Error al subir el archivo PDF")
      }

      const { url: pdfUrl } = await uploadResponse.json()
      console.log("[v0] PDF subido correctamente:", pdfUrl)

      // Procesar PDF para extraer texto
      console.log("[v0] Procesando PDF...")
      const processResponse = await fetch("/api/process-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pdfUrl }),
      })

      if (!processResponse.ok) {
        throw new Error("Error al procesar el PDF")
      }

      const { text: pdfText } = await processResponse.json()
      console.log("[v0] Texto extraído del PDF:", pdfText.substring(0, 200) + "...")

      // Generar preguntas con IA
      console.log("[v0] Generando preguntas con IA...")
      const generateResponse = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pdfText,
          questions: preguntas.map((p) => ({
            type:
              p.tipoPregunta === "multiple-opcion"
                ? "multiple"
                : p.tipoPregunta === "desarrollo"
                  ? "development"
                  : "truefalse",
            points: p.puntaje,
            category: p.tipo,
            includesGraphic: p.incluyeGrafico,
            justification:
              p.justificacionVF === "verdaderas" ? "true" : p.justificacionVF === "falsas" ? "false" : "none",
          })),
        }),
      })

      if (!generateResponse.ok) {
        throw new Error("Error al generar preguntas con IA")
      }

      // Leer la respuesta streaming
      const reader = generateResponse.body?.getReader()
      let fullResponse = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = new TextDecoder().decode(value)
          fullResponse += chunk
        }
      }

      console.log("[v0] Respuesta completa de IA:", fullResponse)

      // Parsear la respuesta JSON
      let aiQuestions
      try {
        // La IA puede devolver el JSON dentro de bloques de código, extraerlo
        const jsonMatch = fullResponse.match(/\{[\s\S]*\}/)
        const jsonStr = jsonMatch ? jsonMatch[0] : fullResponse
        aiQuestions = JSON.parse(jsonStr)
      } catch (parseError) {
        console.error("[v0] Error parseando respuesta de IA:", parseError)
        console.log("[v0] Respuesta raw:", fullResponse)
        throw new Error("Error al procesar la respuesta de la IA")
      }

      // Convertir preguntas de IA al formato interno
      const preguntasGeneradas: PreguntaGenerada[] = aiQuestions.questions.map((q: any, index: number) => ({
        id: `gen-${Date.now()}-${index}`,
        enunciado: q.question,
        tipo:
          q.type === "multiple"
            ? ("multiple-opcion" as const)
            : q.type === "development"
              ? ("desarrollo" as const)
              : ("verdadero-falso" as const),
        opciones: q.options || undefined,
        respuestaCorrecta: q.correctAnswer || undefined,
        justificacion:
          q.justification && q.justification !== "none"
            ? `Justifique las respuestas ${q.justification === "true" ? "verdaderas" : "falsas"}`
            : undefined,
        puntaje: q.points,
        incluyeGrafico: q.includesGraphic || false,
      }))

      console.log("[v0] Preguntas generadas:", preguntasGeneradas)
      setExamenGenerado(preguntasGeneradas)
      setShowExamen(true)
    } catch (error) {
      console.error("[v0] Error generando examen:", error)
      alert(`Error al generar el examen: ${error instanceof Error ? error.message : "Error desconocido"}`)

      // Fallback a preguntas simuladas en caso de error
      console.log("[v0] Usando fallback a preguntas simuladas")
      const preguntasGeneradas: PreguntaGenerada[] = preguntas.map((config, index) => {
        const preguntaBase = {
          id: `fallback-${config.id}`,
          puntaje: config.puntaje,
          incluyeGrafico: config.incluyeGrafico,
        }

        switch (config.tipoPregunta) {
          case "multiple-opcion":
            return {
              ...preguntaBase,
              tipo: "multiple-opcion" as const,
              enunciado: `[FALLBACK] Pregunta de múltiple opción ${index + 1} sobre ${config.tipo} - La IA no pudo procesar el PDF correctamente`,
              opciones: ["Opción A", "Opción B", "Opción C", "Opción D"],
              respuestaCorrecta: 0,
            }
          case "desarrollo":
            return {
              ...preguntaBase,
              tipo: "desarrollo" as const,
              enunciado: `[FALLBACK] Pregunta de desarrollo ${index + 1} sobre ${config.tipo} - La IA no pudo procesar el PDF correctamente`,
            }
          case "verdadero-falso":
            return {
              ...preguntaBase,
              tipo: "verdadero-falso" as const,
              enunciado: `[FALLBACK] Pregunta verdadero/falso ${index + 1} sobre ${config.tipo} - La IA no pudo procesar el PDF correctamente`,
              respuestaCorrecta: "verdadero",
              justificacion:
                config.justificacionVF !== "sin-justificar"
                  ? `Justifique las respuestas ${config.justificacionVF}`
                  : undefined,
            }
          default:
            return preguntaBase as PreguntaGenerada
        }
      })

      setExamenGenerado(preguntasGeneradas)
      setShowExamen(true)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleEditQuestion = (id: string) => {
    setEditingQuestion(id)
  }

  const handleSaveQuestion = (id: string, nuevoEnunciado: string) => {
    setExamenGenerado((prev) => prev.map((p) => (p.id === id ? { ...p, enunciado: nuevoEnunciado } : p)))
    setEditingQuestion(null)
  }

  const handleDeleteGeneratedQuestion = (id: string) => {
    setExamenGenerado((prev) => prev.filter((p) => p.id !== id))
  }

  const handleExportToPDF = () => {
    setShowExportDialog(true)
  }

  const handleConfirmExport = async () => {
    if (!nombreExamen.trim() || !catedraSeleccionada) return

    const examenData: ExamenData = {
      nombre: nombreExamen,
      catedra: catedraSeleccionada,
      preguntas: examenGenerado,
      fechaCreacion: new Date(),
    }

    try {
      const response = await fetch("/api/export-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ examenData }),
      })

      if (!response.ok) {
        throw new Error("Error al generar PDF")
      }

      // Descargar el PDF generado
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${nombreExamen.replace(/\s+/g, "_")}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Cerrar diálogo
      setShowExportDialog(false)
      setNombreExamen("")
      setCatedraSeleccionada("")

      alert("Examen exportado y guardado exitosamente!")
    } catch (error) {
      console.error("Error exportando examen:", error)
      alert("Error al exportar el examen")
    }
  }

  const handleShowPreview = () => {
    setShowPreview(true)
  }

  if (!showConfiguration) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="max-w-4xl mx-auto px-6 py-12">
          {/* Header con botón de regreso */}
          <div className="flex items-center mb-8">
            <Link href="/">
              <Button variant="ghost" className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al inicio
              </Button>
            </Link>
            <div>
              <h1 className="font-heading font-black text-3xl text-slate-800">Generar Nuevo Examen</h1>
              <p className="text-slate-600 mt-1">Sube un PDF para que la IA genere preguntas basadas en el contenido</p>
            </div>
          </div>

          {/* Área de subida de archivos */}
          <Card className="p-8 bg-white border-slate-200">
            <div className="text-center mb-6">
              <h2 className="font-heading font-bold text-xl text-slate-800 mb-2">Subir Documento PDF</h2>
              <p className="text-slate-600">Arrastra y suelta tu archivo PDF o haz clic para seleccionarlo</p>
            </div>

            {!selectedFile ? (
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300 ${
                  isDragOver ? "border-indigo-400 bg-indigo-50" : "border-slate-300 hover:border-slate-400"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors duration-300 ${
                      isDragOver ? "bg-indigo-100" : "bg-slate-100"
                    }`}
                  >
                    <Upload
                      className={`w-8 h-8 transition-colors duration-300 ${
                        isDragOver ? "text-indigo-500" : "text-slate-500"
                      }`}
                    />
                  </div>

                  <h3 className="font-medium text-lg text-slate-800 mb-2">
                    {isDragOver ? "Suelta el archivo aquí" : "Arrastra tu PDF aquí"}
                  </h3>

                  <p className="text-slate-500 mb-6">o haz clic en el botón para seleccionar desde tu computadora</p>

                  <input type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" id="file-upload" />

                  <label htmlFor="file-upload">
                    <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">Seleccionar Archivo PDF</Button>
                  </label>

                  <p className="text-xs text-slate-400 mt-4">Solo se aceptan archivos PDF (máximo 10MB)</p>
                </div>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg p-6 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                      <FileText className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">{selectedFile.name}</h3>
                      <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)} • PDF</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    className="text-slate-600 hover:text-slate-800"
                  >
                    Cambiar archivo
                  </Button>
                </div>
              </div>
            )}

            {selectedFile && (
              <div className="mt-8 pt-6 border-t border-slate-200">
                <Button
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3"
                  size="lg"
                  onClick={handleContinueConfiguration}
                >
                  Continuar con la Configuración
                </Button>
              </div>
            )}
          </Card>
        </main>
      </div>
    )
  }

  if (showPreview) {
    return (
      <div className="min-h-screen bg-white">
        <main className="max-w-4xl mx-auto px-6 py-12">
          {/* Header de vista previa */}
          <div className="flex items-center justify-between mb-8 no-print">
            <Button variant="ghost" onClick={() => setShowPreview(false)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al examen
            </Button>
            <Button onClick={() => window.print()} className="bg-indigo-500 hover:bg-indigo-600 text-white">
              Imprimir Vista Previa
            </Button>
          </div>

          {/* Vista previa del PDF */}
          <div className="bg-white border border-slate-300 rounded-lg p-8 shadow-sm">
            {/* Encabezado del examen */}
            <div className="text-center mb-8 border-b border-slate-300 pb-6">
              <h1 className="font-heading font-black text-2xl text-slate-800 mb-2">
                {nombreExamen || "Nombre del Examen"}
              </h1>
              <p className="text-slate-600 mb-1">Cátedra: {catedraSeleccionada || "Seleccionar Cátedra"}</p>
              <p className="text-slate-600 text-sm">Fecha: {new Date().toLocaleDateString()}</p>
              <div className="mt-4 flex justify-between text-sm text-slate-600">
                <span>Nombre: _________________________</span>
                <span>Legajo: _____________</span>
              </div>
            </div>

            {/* Preguntas */}
            <div className="space-y-6">
              {examenGenerado.map((pregunta, index) => (
                <div key={pregunta.id} className="border-b border-slate-200 pb-6 last:border-b-0">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-slate-800">
                      {index + 1}. {pregunta.enunciado}
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
                            {String.fromCharCode(65 + idx)}) {opcion}
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

                  {/* Indicador de gráfico */}
                  {pregunta.incluyeGrafico && (
                    <div className="ml-4 mt-4 p-4 border-2 border-dashed border-slate-300 rounded-lg">
                      <p className="text-center text-slate-500 text-sm">[ Espacio reservado para gráfico ]</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pie del examen */}
            <div className="mt-8 pt-6 border-t border-slate-300 text-center text-sm text-slate-600">
              <p>Total de puntos: {examenGenerado.reduce((sum, p) => sum + p.puntaje, 0)}</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (showExamen) {
    return (
      <div className="min-h-screen bg-slate-50">
        <main className="max-w-4xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Button variant="ghost" className="mr-4" onClick={() => setShowExamen(false)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver a configuración
              </Button>
              <div>
                <h1 className="font-heading font-black text-3xl text-slate-800">Examen Generado</h1>
                <p className="text-slate-600 mt-1">Revisa y edita las preguntas antes de exportar</p>
              </div>
            </div>
          </div>

          {/* Información del examen */}
          <Card className="p-4 bg-white border-slate-200 mb-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                <FileText className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-slate-800">{selectedFile?.name}</h3>
                <p className="text-sm text-slate-500">
                  {examenGenerado.length} preguntas • {examenGenerado.reduce((sum, p) => sum + p.puntaje, 0)} puntos
                  totales
                </p>
              </div>
            </div>
          </Card>

          {/* Lista de preguntas generadas */}
          <div className="space-y-6">
            {examenGenerado.map((pregunta, index) => (
              <Card key={pregunta.id} className="p-6 bg-white border-slate-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-sm font-medium text-indigo-600">{index + 1}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {pregunta.tipo === "multiple-opcion"
                          ? "Múltiple opción"
                          : pregunta.tipo === "desarrollo"
                            ? "Desarrollo"
                            : "V/F"}
                      </span>
                      <span className="text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                        {pregunta.puntaje} {pregunta.puntaje === 1 ? "punto" : "puntos"}
                      </span>
                      {pregunta.incluyeGrafico && (
                        <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                          Con gráfico
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditQuestion(pregunta.id)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGeneratedQuestion(pregunta.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Enunciado editable */}
                {editingQuestion === pregunta.id ? (
                  <div className="space-y-3">
                    <Textarea defaultValue={pregunta.enunciado} className="min-h-[100px]" id={`edit-${pregunta.id}`} />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          const textarea = document.getElementById(`edit-${pregunta.id}`) as HTMLTextAreaElement
                          handleSaveQuestion(pregunta.id, textarea.value)
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Guardar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingQuestion(null)}>
                        <X className="w-4 h-4 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <p className="text-slate-800 leading-relaxed">{pregunta.enunciado}</p>
                  </div>
                )}

                {/* Opciones para múltiple opción */}
                {pregunta.tipo === "multiple-opcion" && pregunta.opciones && (
                  <div className="space-y-2 ml-11">
                    {pregunta.opciones.map((opcion, idx) => (
                      <div key={idx} className="flex items-center">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 ${
                            idx === pregunta.respuestaCorrecta ? "bg-green-100 border-green-500" : "border-slate-300"
                          }`}
                        >
                          <span className="text-sm font-medium">{String.fromCharCode(65 + idx)}</span>
                        </div>
                        <span className="text-slate-700">{opcion}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Justificación para V/F */}
                {pregunta.justificacion && (
                  <div className="ml-11 mt-3 p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600 font-medium">Instrucciones:</p>
                    <p className="text-sm text-slate-700">{pregunta.justificacion}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>

          <div className="flex gap-4 mt-8">
            <Button
              onClick={handleShowPreview}
              variant="outline"
              className="flex-1 border-indigo-500 text-indigo-600 hover:bg-indigo-50 bg-transparent"
            >
              Vista Previa
            </Button>
            <Button onClick={handleExportToPDF} className="flex-1 bg-green-500 hover:bg-green-600 text-white">
              Exportar a PDF
            </Button>
          </div>

          {examenGenerado.length === 0 && (
            <Card className="p-8 bg-white border-slate-200 text-center">
              <p className="text-slate-500">No hay preguntas generadas</p>
            </Card>
          )}

          {showExportDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md mx-4 p-6 bg-white">
                <h3 className="font-heading font-bold text-xl text-slate-800 mb-4">Exportar Examen</h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nombre-examen" className="text-sm font-medium text-slate-700">
                      Nombre del Examen
                    </Label>
                    <Input
                      id="nombre-examen"
                      value={nombreExamen}
                      onChange={(e) => setNombreExamen(e.target.value)}
                      placeholder="Ej: Parcial 1 - Matemática"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-slate-700 mb-3 block">Cátedra</Label>
                    <RadioGroup value={catedraSeleccionada} onValueChange={setCatedraSeleccionada}>
                      <div className="grid grid-cols-2 gap-2">
                        {catedras.map((catedra) => (
                          <div key={catedra} className="flex items-center space-x-2">
                            <RadioGroupItem value={catedra} id={catedra} />
                            <Label htmlFor={catedra} className="text-sm">
                              {catedra}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    onClick={handleConfirmExport}
                    disabled={!nombreExamen.trim() || !catedraSeleccionada}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                  >
                    Confirmar Exportación
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowExportDialog(false)
                      setNombreExamen("")
                      setCatedraSeleccionada("")
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Button variant="ghost" className="mr-4" onClick={() => setShowConfiguration(false)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="font-heading font-black text-3xl text-slate-800">Configurar Preguntas</h1>
            <p className="text-slate-600 mt-1">Define el tipo y características de cada pregunta del examen</p>
          </div>
        </div>

        {/* Archivo seleccionado */}
        <Card className="p-4 bg-white border-slate-200 mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mr-3">
              <FileText className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-medium text-slate-800">{selectedFile?.name}</h3>
              <p className="text-sm text-slate-500">Documento de referencia</p>
            </div>
          </div>
        </Card>

        {/* Lista de preguntas */}
        <div className="space-y-4 mb-6">
          {preguntas.map((pregunta, index) => (
            <Card key={pregunta.id} className="p-4 bg-white border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-medium text-indigo-600">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-800">
                      {getTipoPreguntaTexto(pregunta)} • {pregunta.puntaje}{" "}
                      {pregunta.puntaje === 1 ? "punto" : "puntos"}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {pregunta.tipo.charAt(0).toUpperCase() + pregunta.tipo.slice(1)}
                      {pregunta.incluyeGrafico && " • Con gráfico"}
                      {pregunta.justificacionVF &&
                        pregunta.justificacionVF !== "sin-justificar" &&
                        ` • Justifica ${pregunta.justificacionVF}`}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => eliminarPregunta(pregunta.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Botón agregar pregunta */}
        {!showAddQuestion ? (
          <Button
            onClick={() => setShowAddQuestion(true)}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-3 mb-6"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Agregar Pregunta
          </Button>
        ) : (
          <Card className="p-6 bg-white border-slate-200 mb-6">
            <div className="flex items-center mb-4">
              <Settings className="w-5 h-5 text-indigo-500 mr-2" />
              <h3 className="font-heading font-bold text-lg text-slate-800">Configurar Nueva Pregunta</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tipo de pregunta */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700">Tipo de Pregunta</Label>
                <RadioGroup
                  value={nuevaPregunta.tipoPregunta}
                  onValueChange={(value) => setNuevaPregunta({ ...nuevaPregunta, tipoPregunta: value as any })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="multiple-opcion" id="multiple-opcion" />
                    <Label htmlFor="multiple-opcion" className="text-sm">
                      Múltiple opción
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="desarrollo" id="desarrollo" />
                    <Label htmlFor="desarrollo" className="text-sm">
                      De desarrollo
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="verdadero-falso" id="verdadero-falso" />
                    <Label htmlFor="verdadero-falso" className="text-sm">
                      Verdadero/Falso
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Justificación V/F */}
              {nuevaPregunta.tipoPregunta === "verdadero-falso" && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-slate-700">Justificación V/F</Label>
                  <RadioGroup
                    value={nuevaPregunta.justificacionVF}
                    onValueChange={(value) => setNuevaPregunta({ ...nuevaPregunta, justificacionVF: value as any })}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="verdaderas" id="justifica-verdaderas" />
                      <Label htmlFor="justifica-verdaderas" className="text-sm">
                        Justificar verdaderas
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="falsas" id="justifica-falsas" />
                      <Label htmlFor="justifica-falsas" className="text-sm">
                        Justificar falsas
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sin-justificar" id="sin-justificar" />
                      <Label htmlFor="sin-justificar" className="text-sm">
                        Sin justificar
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Incluye gráfico */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="incluye-grafico"
                    checked={nuevaPregunta.incluyeGrafico}
                    onCheckedChange={(checked) =>
                      setNuevaPregunta({ ...nuevaPregunta, incluyeGrafico: checked as boolean })
                    }
                  />
                  <Label htmlFor="incluye-grafico" className="text-sm font-medium text-slate-700">
                    Incluye gráfico
                  </Label>
                </div>
              </div>

              {/* Puntaje */}
              <div className="space-y-3">
                <Label htmlFor="puntaje" className="text-sm font-medium text-slate-700">
                  Puntaje
                </Label>
                <Input
                  id="puntaje"
                  type="number"
                  min="1"
                  max="10"
                  value={nuevaPregunta.puntaje}
                  onChange={(e) =>
                    setNuevaPregunta({ ...nuevaPregunta, puntaje: Number.parseInt(e.target.value) || 1 })
                  }
                  className="w-full"
                />
              </div>

              {/* Tipo de contenido */}
              <div className="space-y-3 md:col-span-2">
                <Label className="text-sm font-medium text-slate-700">Tipo de Contenido</Label>
                <Select
                  value={nuevaPregunta.tipo}
                  onValueChange={(value) => setNuevaPregunta({ ...nuevaPregunta, tipo: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teoria">Teoría (definiciones, demostraciones)</SelectItem>
                    <SelectItem value="practica">Práctica (ejercicios, aplicar fórmulas)</SelectItem>
                    <SelectItem value="mixta">Mixta (teoría y práctica)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={agregarPregunta} className="bg-indigo-500 hover:bg-indigo-600 text-white">
                Agregar Pregunta
              </Button>
              <Button variant="outline" onClick={() => setShowAddQuestion(false)}>
                Cancelar
              </Button>
            </div>
          </Card>
        )}

        {/* Botón Crear Examen */}
        <Button
          className={`w-full bg-green-500 hover:bg-green-600 text-white py-3 ${
            !puedeCrearExamen || isGenerating ? "opacity-50 cursor-not-allowed" : ""
          }`}
          size="lg"
          disabled={!puedeCrearExamen || isGenerating}
          onClick={handleCreateExam}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generando Examen...
            </>
          ) : (
            "Crear Examen"
          )}
        </Button>

        {/* Información de ayuda */}
        {preguntas.length === 0 && (
          <Card className="p-6 bg-blue-50 border-blue-200 mt-6">
            <div className="text-center">
              <h3 className="font-medium text-blue-800 mb-2">¡Comienza agregando preguntas!</h3>
              <p className="text-blue-600 text-sm">
                Define las características de cada pregunta que quieres que la IA genere basándose en tu PDF.
              </p>
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}
