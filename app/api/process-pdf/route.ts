import { NextResponse } from "next/server";
import pdf from "pdf-parse";

export async function POST(req: Request) {
  try {
    console.log("[API] process-pdf llamado");

    const body = await req.json();
    const { pdfUrl, questionConfig } = body;

    console.log("[API] Body recibido:", body);

    if (!pdfUrl) {
      console.log("[API] Falta pdfUrl");
      return NextResponse.json(
        { error: "PDF URL is required" },
        { status: 400 }
      );
    }

    if (!questionConfig) {
      console.log("[API] Falta questionConfig");
      return NextResponse.json(
        { error: "Question configuration is required" },
        { status: 400 }
      );
    }

    console.log("[API] Descargando PDF desde:", pdfUrl);

    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`No se pudo descargar el PDF: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("[API] Buffer length:", buffer.length);

    const data = await pdf(buffer);
    const extractedText = data.text;

    console.log(
      "[API] PDF procesado, longitud del texto extraído:",
      extractedText.length
    );

    return NextResponse.json({
      success: true,
      text: extractedText,
      message: "PDF processed successfully",
    });
  } catch (error: any) {
    console.error("[API] Error procesando PDF:", error);
    return NextResponse.json(
      { error: "Failed to process PDF file", details: error.message },
      { status: 500 }
    );
  }
}
