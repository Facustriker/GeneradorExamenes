import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, History, Settings } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-end">
          <Link href="/catedras">
            <Button variant="outline" className="flex items-center gap-2 bg-transparent">
              <Settings className="w-4 h-4" />
              Agregar Cátedras
            </Button>
          </Link>
        </div>
      </header>

      {/* Zona central */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Bloque de bienvenida */}
        <div className="text-center mb-12">
          <h1 className="font-heading font-black text-4xl text-slate-800 mb-4">
            Bienvenido al Generador de Exámenes v1.0
          </h1>
          <p className="text-slate-600 text-lg mb-2">Hecho por Olea Facundo</p>
          <p className="text-slate-500 text-base">Crea, organiza y evalúa con facilidad</p>
        </div>

        {/* Panel de acciones principales */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Generar examen nuevo */}
          <Link href="/generar">
            <Card className="p-8 bg-white border-slate-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-indigo-500 transition-colors duration-300">
                  <Plus className="w-8 h-8 text-indigo-500 group-hover:text-white transition-colors duration-300" />
                </div>
                <h2 className="font-heading font-bold text-2xl text-slate-800 mb-4">Generar Examen Nuevo</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Sube un PDF y crea un examen personalizado con inteligencia artificial en minutos
                </p>
                <Button className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-medium py-3 text-base">
                  Comenzar Nuevo Examen
                </Button>
              </div>
            </Card>
          </Link>

          {/* Ver historial */}
          <Link href="/historial">
            <Card className="p-8 bg-white border-slate-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-slate-700 transition-colors duration-300">
                  <History className="w-8 h-8 text-slate-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h2 className="font-heading font-bold text-2xl text-slate-800 mb-4">Ver Historial de Exámenes</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  Accede, edita y reutiliza los exámenes que has creado anteriormente
                </p>
                <Button
                  variant="outline"
                  className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 font-medium py-3 text-base bg-transparent"
                >
                  Ver Exámenes Anteriores
                </Button>
              </div>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  )
}
