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

export default function CatedrasPage() {
  const [catedras, setCatedras] = useState<any[]>([])
  const [nuevaCatedra, setNuevaCatedra] = useState("")
  const [error, setError] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

// Cargar cátedras desde la API
const fetchCatedras = async () => {
  try {
    const res = await fetch(`/api/catedras?t=${Date.now()}`)
    if (!res.ok) throw new Error("Error al traer cátedras")
    const data = await res.json()
    console.log("Data received in frontend:", data)
    setCatedras(data)
  } catch (err) {
    console.error(err)
    setError("No se pudieron cargar las cátedras")
  }
}

useEffect(() => {
  fetchCatedras()
}, [])

  // Crear nueva cátedra
  const handleAgregarCatedra = async () => {
    if (!nuevaCatedra.trim()) {
      setError("El nombre de la cátedra es obligatorio")
      return
    }

    try {
      const res = await fetch("/api/catedras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nuevaCatedra }),
      })

      if (!res.ok) {
        const err = await res.json()
        setError(err.error || "Error al crear la cátedra")
        return
      }

      const nueva = await res.json()
      setCatedras((prev) => [...prev, nueva])
      setNuevaCatedra("")
      setError("")
      setIsDialogOpen(false)
    } catch (e) {
      console.error(e)
      setError("Error de red")
    }
  }

  // Eliminar cátedra
  const handleEliminarCatedra = async (id: number) => {
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
    }
  }

  console.log("Estado actual de catedras:", catedras.map(c => ({
  nombre: c.nombre,
  examenesCount: c.examenesCount
})))

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
          <h1 className="font-heading font-bold text-xl text-slate-800">Gestión de Cátedras</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Botón agregar cátedra */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-heading font-bold text-2xl text-slate-800">Cátedras Disponibles</h2>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-500 hover:bg-indigo-600 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nueva Cátedra
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Nueva Cátedra</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
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

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAgregarCatedra}>Agregar Cátedra</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de cátedras */}
        <div className="grid gap-4">
          {catedras.map((catedra) => (
            <Card key={catedra.id} className="p-6 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-lg text-slate-800">{catedra.nombre}</h3>
                    <p className="text-slate-600"> 
                      {catedra.examenesCount ?? 0}{" "}
                      {(catedra.examenesCount ?? 0) === 1 ? "examen" : "exámenes"} asociados
                    </p>
                  </div>
                </div>

                {(catedra.examenes_count ?? 0) === 0 && (
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
            </Card>
          ))}
        </div>

        {catedras.length === 0 && (
          <Card className="p-12 text-center bg-white">
            <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="font-heading font-bold text-xl text-slate-600 mb-2">No hay cátedras</h3>
            <p className="text-slate-500 mb-6">Agrega tu primera cátedra para comenzar a organizar tus exámenes</p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-indigo-500 hover:bg-indigo-600">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Primera Cátedra
            </Button>
          </Card>
        )}
      </main>
    </div>
  )
}
