"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Plus, Trash2, BookOpen, Edit2 } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

export default function CatedrasPage() {
  const [catedras, setCatedras] = useState<any[]>([])
  const [nuevaCatedra, setNuevaCatedra] = useState("")
  const [error, setError] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editCatedraId, setEditCatedraId] = useState<string | null>(null)
  const [carreras, setCarreras] = useState<any[]>([])
  const [carrerasSeleccionadas, setCarrerasSeleccionadas] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Cargar carreras al inicio
  const fetchCarreras = async () => {
    try {
      const res = await fetch(`/api/carreras?t=${Date.now()}`)
      if (!res.ok) throw new Error("Error al traer carreras")
      const data = await res.json()
      setCarreras(data)
    } catch (err) {
      console.error(err)
    }
  }

  // Cargar cátedras desde la API
  const fetchCatedras = async () => {
    try {
      const res = await fetch(`/api/catedras?t=${Date.now()}`)
      if (!res.ok) throw new Error("Error al traer cátedras")
      const data = await res.json()
      setCatedras(data)
    } catch (err) {
      console.error(err)
      setError("No se pudieron cargar las cátedras")
    }
  }

  useEffect(() => {
    fetchCatedras()
    fetchCarreras()
  }, [])

  const handleToggleCarrera = (carreraId: string) => {
    setCarrerasSeleccionadas(prev => {
      if (prev.includes(carreraId)) {
        return prev.filter(id => id !== carreraId)
      } else {
        return [...prev, carreraId]
      }
    })
  }

  const handleOpenDialog = (catedra?: any) => {
    if (catedra) {
      // Modo edición
      setEditCatedraId(catedra.id)
      setNuevaCatedra(catedra.nombre)
      // Extraer IDs de carreras asociadas
      const carreraIds = catedra.carreras?.map((c: any) => c.id) || []
      setCarrerasSeleccionadas(carreraIds)
    } else {
      // Modo creación
      setEditCatedraId(null)
      setNuevaCatedra("")
      setCarrerasSeleccionadas([])
    }
    setError("")
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditCatedraId(null)
    setNuevaCatedra("")
    setCarrerasSeleccionadas([])
    setError("")
  }

  // Crear nueva cátedra
  const handleAgregarCatedra = async () => {
    if (!nuevaCatedra.trim()) {
      setError("El nombre de la cátedra es obligatorio")
      return
    }
    if (carrerasSeleccionadas.length === 0) {
      setError("Debe seleccionar al menos una carrera")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/catedras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          nombre: nuevaCatedra, 
          carreraIds: carrerasSeleccionadas 
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error || "Error al crear la cátedra")
        return
      }

      const nueva = await res.json()
      setCatedras((prev) => [...prev, nueva])
      handleCloseDialog()
      await fetchCatedras() // Recargar para asegurar datos actualizados
    } catch (e) {
      console.error(e)
      setError("Error de red")
    } finally {
      setIsLoading(false)
    }
  }

  // Editar cátedra
  const handleEditarCatedra = async () => {
    if (!nuevaCatedra.trim() || !editCatedraId) return
    if (carrerasSeleccionadas.length === 0) {
      setError("Debe seleccionar al menos una carrera")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/catedras/${editCatedraId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          nombre: nuevaCatedra,
          carreraIds: carrerasSeleccionadas
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || "Error al editar cátedra")
        return
      }
      const updated = await res.json()
      setCatedras((prev) =>
        prev.map((c) => (c.id === editCatedraId ? updated : c))
      )
      handleCloseDialog()
    } catch (e) {
      console.error(e)
      setError("Error de red")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEliminarCatedra = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta cátedra?")) return
    
    try {
      const res = await fetch(`/api/catedras/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "No se pudo eliminar")
        return
      }
      setCatedras((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      console.error(e)
      alert("Error al eliminar la cátedra")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </a>
          <h1 className="font-heading font-bold text-xl text-slate-800">Gestión de Cátedras</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Botón agregar cátedra */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-heading font-bold text-2xl text-slate-800">Cátedras Disponibles</h2>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-indigo-500 hover:bg-indigo-600 flex items-center gap-2"
                onClick={() => handleOpenDialog()}
              >
                <Plus className="w-4 h-4" />
                Nueva Cátedra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editCatedraId ? "Editar Cátedra" : "Agregar Nueva Cátedra"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Input nombre */}
                <div>
                  <Label htmlFor="nombre">Nombre de la Cátedra</Label>
                  <Input
                    id="nombre"
                    value={nuevaCatedra}
                    onChange={(e) => setNuevaCatedra(e.target.value)}
                    placeholder="Ej: Matemática, Física, Historia..."
                    className="mt-1"
                  />
                </div>

                {/* Checkboxes de carreras */}
                <div>
                  <Label className="mb-3 block">Carreras asociadas</Label>
                  <div className="space-y-3 max-h-64 overflow-y-auto border rounded-lg p-4 bg-slate-50">
                    {carreras.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">
                        No hay carreras disponibles. <a href="/carreras" className="text-indigo-600 hover:underline">Crear una carrera</a>
                      </p>
                    ) : (
                      carreras.map((carrera) => (
                        <div key={carrera.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`carrera-${carrera.id}`}
                            checked={carrerasSeleccionadas.includes(carrera.id)}
                            onCheckedChange={() => handleToggleCarrera(carrera.id)}
                          />
                          <label
                            htmlFor={`carrera-${carrera.id}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {carrera.nombre}
                          </label>
                        </div>
                      ))
                    )}
                  </div>
                  {carrerasSeleccionadas.length > 0 && (
                    <p className="text-xs text-slate-500 mt-2">
                      {carrerasSeleccionadas.length} {carrerasSeleccionadas.length === 1 ? "carrera seleccionada" : "carreras seleccionadas"}
                    </p>
                  )}
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={handleCloseDialog}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={editCatedraId ? handleEditarCatedra : handleAgregarCatedra}
                    disabled={isLoading}
                  >
                    {isLoading ? "Guardando..." : editCatedraId ? "Guardar Cambios" : "Agregar Cátedra"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de cátedras */}
        <div className="grid gap-4">
          {catedras.map((catedra) => {
            const carrerasNombres = catedra.carreras?.map((c: any) => c.nombre).join(", ") || "Sin carreras"
            
            return (
              <Card key={catedra.id} className="p-6 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-lg text-slate-800">{catedra.nombre}</h3>
                      <p className="text-slate-600 text-sm">
                        {catedra.examenesCount ?? 0}{" "}
                        {(catedra.examenesCount ?? 0) === 1 ? "examen" : "exámenes"} asociados
                      </p>
                      <p className="text-slate-500 text-sm mt-1">
                        <span className="font-medium">Carreras:</span> {carrerasNombres}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(catedra)}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {(catedra.examenesCount ?? 0) === 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEliminarCatedra(catedra.id)}
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {catedras.length === 0 && (
          <Card className="p-12 text-center bg-white">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="font-heading font-bold text-xl text-slate-600 mb-2">No hay cátedras</h3>
            <p className="text-slate-500 mb-6">Agrega tu primera cátedra para comenzar a organizar tus exámenes</p>
            <Button onClick={() => handleOpenDialog()} className="bg-indigo-500 hover:bg-indigo-600">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Primera Cátedra
            </Button>
          </Card>
        )}
      </main>
    </div>
  )
}