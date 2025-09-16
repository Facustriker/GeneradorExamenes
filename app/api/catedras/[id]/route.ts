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

    // Delete catedra
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
