import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Upload API called")

    const formData = await request.formData()
    const file = formData.get("file") as File

    console.log("[v0] formData received:", formData)
    console.log("[v0] Raw file object:", file)

    if (!file) {
      console.log("[v0] No file provided")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("[v0] File received:", { name: file.name, size: file.size, type: file.type })
    console.log("[v0] File instance check:", file instanceof File)

    // Validate file type
    if (file.type !== "application/pdf") {
      console.log("[v0] Invalid file type:", file.type)
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 })
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      console.log("[v0] File too large:", file.size)
      return NextResponse.json({ error: "File size too large. Max 10MB allowed." }, { status: 400 })
    }

    const filename = `${Date.now()}-${file.name}`
    console.log("[v0] Uploading to Blob with filename:", filename)

    let blob
    try {
      blob = await put(filename, file, { access: "public" })
      console.log("[v0] Blob upload successful:", blob.url)
    } catch (putError) {
      console.error("[v0] Blob upload failed:", putError)
      return NextResponse.json({ error: "Blob upload failed", details: putError instanceof Error ? putError.message : putError }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        url: blob.url,
      },
      message: "File uploaded successfully",
    })
  } catch (error) {
    console.error("[v0] Upload API unexpected error:", error)
    return NextResponse.json(
      {
        error: "Upload failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
