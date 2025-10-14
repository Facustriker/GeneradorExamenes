import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Check if catedra has associated exams
    const { data: examenes, error: examenesError } = await supabase
      .from("examenes")
      .select("id")
      .eq("catedra_id", params.id)
      .limit(1)

    if (examenesError) {
      console.error("Error checking examenes:", examenesError)
      return NextResponse.json({ error: "Error checking associated exams" }, { status: 500 })
    }

    if (examenes && examenes.length > 0) {
      return NextResponse.json(
        {
          error: "No se puede eliminar la cátedra porque tiene exámenes asociados",
        },
        { status: 409 },
      )
    }

    // Delete catedra (las relaciones en carrera_catedra se eliminan automáticamente por CASCADE)
    const { error } = await supabase.from("catedras").delete().eq("id", params.id)

    if (error) {
      console.error("Error deleting catedra:", error)
      return NextResponse.json({ error: "Error deleting catedra" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { nombre, carreraIds } = body

    if (!nombre || nombre.trim() === "") {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
    }

    // Actualizar nombre de la cátedra
    const { data, error } = await supabase
      .from("catedras")
      .update({ nombre: nombre.trim() })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating catedra:", error)
      return NextResponse.json({ error: "Error actualizando la cátedra" }, { status: 500 })
    }

    // Si se proporcionaron carreraIds, actualizar las relaciones
    if (carreraIds && Array.isArray(carreraIds)) {
      if (carreraIds.length === 0) {
        return NextResponse.json({ error: "Debe seleccionar al menos una carrera" }, { status: 400 })
      }

      // Eliminar todas las relaciones existentes
      const { error: deleteError } = await supabase
        .from("carrera_catedra")
        .delete()
        .eq("catedra_id", params.id)

      if (deleteError) {
        console.error("Error deleting old relations:", deleteError)
        return NextResponse.json({ error: "Error actualizando relaciones" }, { status: 500 })
      }

      // Insertar nuevas relaciones
      const relaciones = carreraIds.map(carreraId => ({
        carrera_id: carreraId,
        catedra_id: params.id
      }))

      const { error: insertError } = await supabase
        .from("carrera_catedra")
        .insert(relaciones)

      if (insertError) {
        console.error("Error inserting new relations:", insertError)
        return NextResponse.json({ error: "Error actualizando relaciones" }, { status: 500 })
      }
    }

    // Retornar la cátedra actualizada con sus carreras
    const { data: catedraActualizada } = await supabase
      .from("catedras")
      .select(`
        id,
        nombre,
        created_at,
        examenes(count),
        carrera_catedra(
          carrera_id,
          carreras(
            id,
            nombre
          )
        )
      `)
      .eq("id", params.id)
      .single()

    const carreras = catedraActualizada?.carrera_catedra?.map((cc: any) => ({
      id: cc.carreras?.id,
      nombre: cc.carreras?.nombre
    })).filter((c: any) => c.id && c.nombre) || []

    return NextResponse.json({
      ...data,
      carreras,
      examenesCount: catedraActualizada?.examenes?.[0]?.count || 0
    })
  } catch (error) {
    console.error("Unexpected error on PATCH:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}