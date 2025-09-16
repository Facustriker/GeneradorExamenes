import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Obtener cátedras con el conteo de exámenes asociados
    const { data: catedras, error } = await supabase
      .from("catedras")
      .select(`
        id,
        nombre,
        created_at,
        examenes(count)
      `)
      .order("nombre", { ascending: true })

    console.log("[API] Raw data from Supabase:", JSON.stringify(catedras, null, 2))
    console.log("[API] Error from Supabase:", error)

    if (error) {
      console.error("Error fetching catedras:", error)
      return NextResponse.json({ error: "Error fetching catedras" }, { status: 500 })
    }

    // Transformar los datos para incluir el conteo correctamente
    const catedrasWithCount = catedras?.map(catedra => {
      console.log("[API] Processing catedra:", catedra.nombre, "examenes data:", catedra.examenes)
      return {
        ...catedra,
        examenesCount: catedra.examenes?.[0]?.count || 0
      }
    }) || []

    console.log("[API] Final processed data:", JSON.stringify(catedrasWithCount, null, 2))

    return NextResponse.json(catedrasWithCount)
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// El resto del código POST se mantiene igual...
export async function POST(request: Request) {
  try {
    const { nombre } = await request.json()

    if (!nombre || typeof nombre !== "string" || nombre.trim().length === 0) {
      return NextResponse.json({ error: "Nombre is required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("catedras")
      .insert([{ nombre: nombre.trim() }])
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        // Unique constraint violation
        return NextResponse.json({ error: "Ya existe una cátedra con ese nombre" }, { status: 409 })
      }
      console.error("Error creating catedra:", error)
      return NextResponse.json({ error: "Error creating catedra" }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}