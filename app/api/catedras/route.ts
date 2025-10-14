import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Obtener cátedras con el conteo de exámenes Y las carreras asociadas
    const { data: catedras, error } = await supabase
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
      .order("nombre", { ascending: true })

    console.log("[API] Raw data from Supabase:", JSON.stringify(catedras, null, 2))
    console.log("[API] Error from Supabase:", error)

    if (error) {
      console.error("Error fetching catedras:", error)
      return NextResponse.json({ error: "Error fetching catedras" }, { status: 500 })
    }

    // Transformar los datos para incluir el conteo y las carreras correctamente
    const catedrasWithCount = catedras?.map(catedra => {
      console.log("[API] Processing catedra:", catedra.nombre, "examenes data:", catedra.examenes)
      
      // Extraer las carreras de la estructura anidada
      const carreras = catedra.carrera_catedra?.map((cc: any) => ({
        id: cc.carreras?.id,
        nombre: cc.carreras?.nombre
      })).filter((c: any) => c.id && c.nombre) || []

      return {
        id: catedra.id,
        nombre: catedra.nombre,
        created_at: catedra.created_at,
        examenesCount: catedra.examenes?.[0]?.count || 0,
        carreras: carreras
      }
    }) || []

    console.log("[API] Final processed data:", JSON.stringify(catedrasWithCount, null, 2))

    return NextResponse.json(catedrasWithCount)
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { nombre, carreraIds } = await request.json()

    if (!nombre || typeof nombre !== "string" || nombre.trim().length === 0) {
      return NextResponse.json({ error: "El nombre de la cátedra es obligatorio" }, { status: 400 })
    }
    if (!carreraIds || !Array.isArray(carreraIds) || carreraIds.length === 0) {
      return NextResponse.json({ error: "Debe seleccionar al menos una carrera" }, { status: 400 })
    }

    const supabase = await createClient()

    // Insertar cátedra
    const { data: catedra, error } = await supabase
      .from("catedras")
      .insert([{ nombre: nombre.trim() }])
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Ya existe una cátedra con ese nombre" }, { status: 409 })
      }
      return NextResponse.json({ error: "Error creando la cátedra" }, { status: 500 })
    }

    // Insertar múltiples relaciones con carreras
    const relaciones = carreraIds.map(carreraId => ({
      carrera_id: carreraId,
      catedra_id: catedra.id
    }))

    const { error: relError } = await supabase
      .from("carrera_catedra")
      .insert(relaciones)

    if (relError) {
      console.error("Error creando relaciones cátedra-carrera:", relError)
      // Eliminar la cátedra creada si falla la relación
      await supabase.from("catedras").delete().eq("id", catedra.id)
      return NextResponse.json({ error: "Error asociando la cátedra a las carreras" }, { status: 500 })
    }

    // Retornar la cátedra con las carreras asociadas
    const { data: catedraConCarrera } = await supabase
      .from("catedras")
      .select(`
        id,
        nombre,
        created_at,
        carrera_catedra(
          carrera_id,
          carreras(
            id,
            nombre
          )
        )
      `)
      .eq("id", catedra.id)
      .single()

    const carreras = catedraConCarrera?.carrera_catedra?.map((cc: any) => ({
      id: cc.carreras?.id,
      nombre: cc.carreras?.nombre
    })).filter((c: any) => c.id && c.nombre) || []

    return NextResponse.json(
      {
        ...catedra,
        carreras,
        examenesCount: 0
      },
      { status: 201 }
    )
  } catch (e) {
    console.error("Unexpected error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}