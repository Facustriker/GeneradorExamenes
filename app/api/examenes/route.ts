import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const catedraId = searchParams.get("catedra_id")
    const carreraId = searchParams.get("carrera_id")

    const supabase = await createClient()

    // Select anidado: examen → catedras → carrera_catedra → carreras
    let query = supabase
      .from("examenes")
      .select(`
        *,
        catedras (
          id,
          nombre,
          carrera_catedra (
            carrera_id,
            carreras (
              id,
              nombre
            )
          )
        )
      `)
      .order("created_at", { ascending: false })

    if (catedraId) {
      query = query.eq("catedra_id", catedraId)
    }

    const { data: examenes, error } = await query

    if (error) {
      console.error("Error fetching examenes:", error)
      return NextResponse.json({ error: "Error fetching examenes" }, { status: 500 })
    }

    // Mapear para agregar carrera directamente al examen
    const examenesConCarrera = examenes.map((examen: any) => {
      const carrera =
        examen.catedras?.carrera_catedra?.[0]?.carreras || null

      return {
        ...examen,
        carrera_id: carrera?.id || null,
        carrera_nombre: carrera?.nombre || null
      }
    })

    // Filtrar por carrera si se pasa el parámetro
    const examenesFiltrados = carreraId
      ? examenesConCarrera.filter((ex: any) => ex.carrera_id === carreraId)
      : examenesConCarrera

    return NextResponse.json(examenesFiltrados)
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { nombre, catedra_id, preguntas, pdf_url } = await request.json()

    if (!nombre || !catedra_id || !preguntas) {
      return NextResponse.json(
        {
          error: "Nombre, catedra_id, and preguntas are required",
        },
        { status: 400 },
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("examenes")
      .insert([
        {
          nombre,
          catedra_id,
          preguntas,
          pdf_url,
        },
      ])
      .select(`
        *,
        catedras (
          id,
          nombre,
          carrera_catedra (
            carrera_id,
            carreras (
              id,
              nombre
            )
          )
        )
      `)
      .single()

    if (error) {
      console.error("Error creating examen:", error)
      return NextResponse.json({ error: "Error creating examen" }, { status: 500 })
    }

    const carrera =
      data.catedras?.carrera_catedra?.[0]?.carreras || null

    const examenFinal = {
      ...data,
      carrera_id: carrera?.id || null,
      carrera_nombre: carrera?.nombre || null
    }

    return NextResponse.json(examenFinal, { status: 201 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
