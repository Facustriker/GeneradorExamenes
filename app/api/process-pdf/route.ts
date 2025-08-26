import { type NextRequest, NextResponse } from "next/server"
import pdf from "pdf-parse"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] API process-pdf called")

    const body = await request.json()
    console.log("[v0] Request body:", body)

    const { fileUrl, questionConfig } = body

    if (!fileUrl) {
      console.log("[v0] Missing fileUrl")
      return NextResponse.json({ error: "File URL is required" }, { status: 400 })
    }

    if (!questionConfig) {
      console.log("[v0] Missing questionConfig")
      return NextResponse.json({ error: "Question configuration is required" }, { status: 400 })
    }

    console.log("[v0] Processing PDF from URL:", fileUrl)

    try {
      // Descargar el PDF
      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      // Extraer texto del PDF
      const data = await pdf(buffer)
      const extractedText = data.text

      console.log("[v0] PDF processed successfully, text length:", extractedText.length)

      return NextResponse.json({
        success: true,
        extractedText,
        message: "PDF processed successfully",
      })
    } catch (pdfError) {
      console.error("[v0] PDF processing error:", pdfError)
      return NextResponse.json({ error: "Failed to process PDF file" }, { status: 500 })
    }
  } catch (error) {
    console.error("[v0] API process-pdf error:", error)
    return NextResponse.json({ error: "PDF processing failed" }, { status: 500 })
  }
}
