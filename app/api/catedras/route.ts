import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createClient()

    const { data: catedras, error } = await supabase.from("catedras").select("*").order("nombre", { ascending: true })

    if (error) {
      console.error("Error fetching catedras:", error)
      return NextResponse.json({ error: "Error fetching catedras" }, { status: 500 })
    }

    return NextResponse.json(catedras)
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { nombre } = await request.json()

    if (!nombre || typeof nombre !== "string" || nombre.trim().length === 0) {
      return NextResponse.json({ error: "Nombre is required" }, { status: 400 })
    }

    const supabase = createClient()

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
