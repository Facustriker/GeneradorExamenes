import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Check if carrera has associated cátedras
    const { data: asociaciones, error: asociacionesError } = await supabase
      .from("carrera_catedra")
      .select("id")
      .eq("carrera_id", params.id)
      .limit(1)

    if (asociacionesError) {
      console.error("Error checking associated cátedras:", asociacionesError)
      return NextResponse.json({ error: "Error verificando cátedras asociadas" }, { status: 500 })
    }

    if (asociaciones && asociaciones.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar la carrera porque tiene cátedras asociadas" },
        { status: 409 }
      )
    }

    // Delete carrera
    const { error } = await supabase.from("carreras").delete().eq("id", params.id)

    if (error) {
      console.error("Error deleting carrera:", error)
      return NextResponse.json({ error: "Error eliminando la carrera" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// NUEVO: PATCH para editar nombre de carrera
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { nombre } = body

    if (!nombre || nombre.trim() === "") {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("carreras")
      .update({ nombre })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating carrera:", error)
      return NextResponse.json({ error: "Error actualizando la carrera" }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
