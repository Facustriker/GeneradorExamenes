import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const catedraId = searchParams.get("catedra_id")

    const supabase = createClient()

    let query = supabase
      .from("examenes")
      .select(`
        *,
        catedras (
          id,
          nombre
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

    return NextResponse.json(examenes)
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

    const supabase = createClient()

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
          nombre
        )
      `)
      .single()

    if (error) {
      console.error("Error creating examen:", error)
      return NextResponse.json({ error: "Error creating examen" }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
