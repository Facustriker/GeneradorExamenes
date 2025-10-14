import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Obtener carreras
    const { data: carreras, error } = await supabase
      .from("carreras")
      .select("id, nombre, created_at")
      .order("nombre", { ascending: true })

    console.log("[API] Raw data from Supabase:", JSON.stringify(carreras, null, 2))
    console.log("[API] Error from Supabase:", error)

    if (error) {
      console.error("Error fetching carreras:", error)
      return NextResponse.json({ error: "Error fetching carreras" }, { status: 500 })
    }

    // Contar cátedras asociadas a cada carrera
    const carrerasWithCount = await Promise.all(
      carreras.map(async (carrera) => {
        const { count } = await supabase
          .from("carrera_catedra")
          .select("*", { count: "exact", head: true })
          .eq("carrera_id", carrera.id)
        return {
          ...carrera,
          catedrasCount: count || 0
        }
      })
    )

    console.log("[API] Final processed data:", JSON.stringify(carrerasWithCount, null, 2))

    return NextResponse.json(carrerasWithCount)
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { nombre } = await request.json()

    if (!nombre || typeof nombre !== "string" || nombre.trim().length === 0) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("carreras")
      .insert([{ nombre: nombre.trim() }])
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        // Unique constraint violation
        return NextResponse.json({ error: "Ya existe una carrera con ese nombre" }, { status: 409 })
      }
      console.error("Error creating carrera:", error)
      return NextResponse.json({ error: "Error creando la carrera" }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const supabase = await createClient()

    // Verificar si tiene cátedras asociadas
    const { count } = await supabase
      .from("carrera_catedra")
      .select("*", { count: "exact", head: true })
      .eq("carrera_id", id)

    if (count && count > 0) {
      return NextResponse.json({ error: "No se puede eliminar una carrera con cátedras asociadas" }, { status: 400 })
    }

    const { error } = await supabase
      .from("carreras")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting carrera:", error)
      return NextResponse.json({ error: "Error eliminando la carrera" }, { status: 500 })
    }

    return NextResponse.json({ message: "Carrera eliminada correctamente" }, { status: 200 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
