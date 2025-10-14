"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Plus, Trash2, BookOpen } from "lucide-react"
import Link from "next/link"

export default function CarrerasPage() {
  const [carreras, setCarreras] = useState<any[]>([])
  const [nuevaCarrera, setNuevaCarrera] = useState("")
  const [error, setError] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // NUEVO: Estado para editar
  const [editarDialogOpen, setEditarDialogOpen] = useState(false)
  const [carreraEditando, setCarreraEditando] = useState<any>(null)
  const [nombreEditado, setNombreEditado] = useState("")

  // Cargar carreras desde la API
  const fetchCarreras = async () => {
    try {
      const res = await fetch(`/api/carreras?t=${Date.now()}`)
      if (!res.ok) throw new Error("Error al traer carreras")
      const data = await res.json()
      console.log("Data received in frontend:", data)
      setCarreras(data)
    } catch (err) {
      console.error(err)
      setError("No se pudieron cargar las carreras")
    }
  }

  useEffect(() => {
    fetchCarreras()
  }, [])

  // Crear nueva carrera
  const handleAgregarCarrera = async () => {
    if (!nuevaCarrera.trim()) {
      setError("El nombre de la carrera es obligatorio")
      return
    }

    try {
      const res = await fetch("/api/carreras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevaCarrera }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error || "Error al crear la carrera")
        return
      }

      const nueva = await res.json()
      setCarreras((prev) => [...prev, nueva])
      setNuevaCarrera("")
      setError("")
      setIsDialogOpen(false)
    } catch (e) {
      console.error(e)
      setError("Error de red")
    }
  }

  // NUEVO: Editar carrera
  const handleEditarCarrera = async () => {
    if (!nombreEditado.trim()) {
      setError("El nombre es obligatorio")
      return
    }
    try {
      const res = await fetch(`/api/carreras/${carreraEditando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombreEditado }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || "Error al actualizar la carrera")
        return
      }
      const actualizado = await res.json()
      setCarreras((prev) =>
        prev.map((c) => (c.id === actualizado.id ? actualizado : c))
      )
      setCarreraEditando(null)
      setNombreEditado("")
      setError("")
      setEditarDialogOpen(false)
    } catch (e) {
      console.error(e)
      setError("Error de red")
    }
  }

  // Eliminar carrera
  const handleEliminarCarrera = async (id: string) => {
    try {
      const res = await fetch(`/api/carreras/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "No se pudo eliminar")
        return
      }
      setCarreras((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      console.error(e)
    }
  }

  console.log(
    "Estado actual de carreras:",
    carreras.map((c) => ({
      nombre: c.nombre,
      catedrasCount: c.catedrasCount,
    }))
  )

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
          <h1 className="font-heading font-bold text-xl text-slate-800">
            Gestión de Carreras
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Botón agregar carrera */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-heading font-bold text-2xl text-slate-800">
            Carreras Disponibles
          </h2>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-500 hover:bg-indigo-600 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nueva Carrera
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Nueva Carrera</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre de la Carrera</Label>
                  <Input
                    id="nombre"
                    value={nuevaCarrera}
                    onChange={(e) => setNuevaCarrera(e.target.value)}
                    placeholder="Ej: Ingeniería Civil, Sistemas, Historia..."
                    className="mt-1"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAgregarCarrera}>Agregar Carrera</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de carreras */}
        <div className="grid gap-4">
          {carreras.map((carrera) => (
            <Card key={carrera.id} className="p-6 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-lg text-slate-800">{carrera.nombre}</h3>
                    <p className="text-slate-600">
                      {carrera.catedrasCount ?? 0}{" "}
                      {(carrera.catedrasCount ?? 0) === 1 ? "cátedra" : "cátedras"} asociadas
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {(carrera.catedrasCount ?? 0) === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEliminarCarrera(carrera.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCarreraEditando(carrera)
                      setNombreEditado(carrera.nombre)
                      setEditarDialogOpen(true)
                    }}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                  >
                    Editar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* NUEVO: Dialog para editar */}
        <Dialog open={editarDialogOpen} onOpenChange={setEditarDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Carrera</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nombreEditar">Nombre de la Carrera</Label>
                <Input
                  id="nombreEditar"
                  value={nombreEditado}
                  onChange={(e) => setNombreEditado(e.target.value)}
                  className="mt-1"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditarDialogOpen(false)
                    setCarreraEditando(null)
                    setNombreEditado("")
                    setError("")
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleEditarCarrera}>Guardar Cambios</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {carreras.length === 0 && (
          <Card className="p-12 text-center bg-white">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="font-heading font-bold text-xl text-slate-600 mb-2">No hay carreras</h3>
            <p className="text-slate-500 mb-6">Agrega tu primera carrera para comenzar a organizar tus cátedras</p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-indigo-500 hover:bg-indigo-600">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Primera Carrera
            </Button>
          </Card>
        )}
      </main>
    </div>
  )
}
