import { type NextRequest, NextResponse } from "next/server"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import { createClient } from "@/lib/supabase/server"

interface PreguntaGenerada {
  id: string
  enunciado: string
  tipo: "multiple-opcion" | "desarrollo" | "verdadero-falso"
  opciones?: string[]
  respuestaCorrecta?: string | number
  justificacion?: string
  puntaje: number
  incluyeGrafico: boolean
}

interface ExamenData {
  nombre: string
  catedra: string
  preguntas: PreguntaGenerada[]
  fechaCreacion: Date
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Iniciando generación de PDF")

    const { examenData }: { examenData: ExamenData } = await request.json()
    console.log("[v0] Datos recibidos:", {
      nombre: examenData?.nombre,
      catedra: examenData?.catedra,
      preguntasCount: examenData?.preguntas?.length,
    })

    if (!examenData || !examenData.nombre || !examenData.catedra || !examenData.preguntas?.length) {
      console.log("[v0] Error: Datos del examen incompletos")
      return NextResponse.json({ error: "Datos del examen incompletos" }, { status: 400 })
    }

    console.log("[v0] Creando documento PDF")
    // Crear documento PDF
    const pdfDoc = await PDFDocument.create()
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)

    let page = pdfDoc.addPage([595.28, 841.89]) // A4 size
    const { width, height } = page.getSize()

    let yPosition = height - 50

    // Encabezado del examen
    page.drawText(examenData.nombre, {
      x: 50,
      y: yPosition,
      size: 18,
      font: timesRomanBoldFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= 30

    page.drawText(`Cátedra: ${examenData.catedra}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= 20

    page.drawText(`Fecha: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= 30

    // Campos para datos del estudiante
    page.drawText("Nombre: _________________________", {
      x: 50,
      y: yPosition,
      size: 12,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    })

    page.drawText("Legajo: _____________", {
      x: 350,
      y: yPosition,
      size: 12,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= 40

    // Línea separadora
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: width - 50, y: yPosition },
      thickness: 1,
      color: rgb(0, 0, 0),
    })
    yPosition -= 30

    // Preguntas
    for (let i = 0; i < examenData.preguntas.length; i++) {
      const pregunta = examenData.preguntas[i]

      // Verificar si necesitamos una nueva página
      if (yPosition < 150) {
        const newPage = pdfDoc.addPage([595.28, 841.89])
        yPosition = height - 50
        // Continuar en la nueva página
        page = newPage
      }

      // Número y enunciado de la pregunta
      const preguntaText = `${i + 1}. ${pregunta.enunciado}`
      const puntajeText = `(${pregunta.puntaje} ${pregunta.puntaje === 1 ? "punto" : "puntos"})`

      page.drawText(preguntaText, {
        x: 50,
        y: yPosition,
        size: 12,
        font: timesRomanBoldFont,
        color: rgb(0, 0, 0),
        maxWidth: width - 150,
      })

      page.drawText(puntajeText, {
        x: width - 120,
        y: yPosition,
        size: 10,
        font: timesRomanFont,
        color: rgb(0.5, 0.5, 0.5),
      })
      yPosition -= 25

      // Contenido específico según el tipo de pregunta
      if (pregunta.tipo === "multiple-opcion" && pregunta.opciones) {
        for (let j = 0; j < pregunta.opciones.length; j++) {
          const opcion = pregunta.opciones[j]
          page.drawText(`${String.fromCharCode(65 + j)}) ${opcion}`, {
            x: 70,
            y: yPosition,
            size: 11,
            font: timesRomanFont,
            color: rgb(0, 0, 0),
            maxWidth: width - 120,
          })
          yPosition -= 20
        }
        yPosition -= 10
      } else if (pregunta.tipo === "desarrollo") {
        // Líneas para respuesta de desarrollo
        for (let k = 0; k < 6; k++) {
          page.drawLine({
            start: { x: 70, y: yPosition },
            end: { x: width - 50, y: yPosition },
            thickness: 0.5,
            color: rgb(0.7, 0.7, 0.7),
          })
          yPosition -= 20
        }
        yPosition -= 10
      } else if (pregunta.tipo === "verdadero-falso") {
        page.drawText("Verdadero ☐    Falso ☐", {
          x: 70,
          y: yPosition,
          size: 11,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        })
        yPosition -= 25

        if (pregunta.justificacion) {
          page.drawText(pregunta.justificacion, {
            x: 70,
            y: yPosition,
            size: 10,
            font: timesRomanFont,
            color: rgb(0.3, 0.3, 0.3),
            maxWidth: width - 120,
          })
          yPosition -= 20

          // Líneas para justificación
          for (let k = 0; k < 3; k++) {
            page.drawLine({
              start: { x: 70, y: yPosition },
              end: { x: width - 50, y: yPosition },
              thickness: 0.5,
              color: rgb(0.7, 0.7, 0.7),
            })
            yPosition -= 15
          }
        }
        yPosition -= 10
      }

      // Espacio para gráfico si es necesario
      if (pregunta.incluyeGrafico) {
        page.drawRectangle({
          x: 70,
          y: yPosition - 60,
          width: width - 120,
          height: 50,
          borderColor: rgb(0.7, 0.7, 0.7),
          borderWidth: 1,
          borderDashArray: [3, 3],
        })
        page.drawText("[ Espacio reservado para gráfico ]", {
          x: (width - 200) / 2,
          y: yPosition - 40,
          size: 10,
          font: timesRomanFont,
          color: rgb(0.5, 0.5, 0.5),
        })
        yPosition -= 80
      }

      yPosition -= 20
    }

    // Pie del examen
    const totalPuntos = examenData.preguntas.reduce((sum, p) => sum + p.puntaje, 0)
    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: width - 50, y: yPosition },
      thickness: 1,
      color: rgb(0, 0, 0),
    })
    yPosition -= 20

    page.drawText(`Total de puntos: ${totalPuntos}`, {
      x: (width - 150) / 2,
      y: yPosition,
      size: 12,
      font: timesRomanBoldFont,
      color: rgb(0, 0, 0),
    })

    console.log("[v0] Guardando en base de datos")
    // Guardar en base de datos
    const supabase = createClient()

    const { data: catedraData, error: catedraError } = await supabase
      .from("catedras")
      .select("id")
      .eq("nombre", examenData.catedra)
      .single()

    if (catedraError) {
      console.log("[v0] Error buscando cátedra:", catedraError)
    }

    const { error: dbError } = await supabase.from("examenes").insert({
      nombre: examenData.nombre,
      catedra_id: catedraData?.id || null,
      preguntas_json: examenData.preguntas,
      created_at: new Date().toISOString(),
    })

    if (dbError) {
      console.error("[v0] Error guardando en base de datos:", dbError)
    }

    console.log("[v0] Generando bytes del PDF")
    // Generar PDF
    const pdfBytes = await pdfDoc.save()
    console.log("[v0] PDF generado exitosamente, tamaño:", pdfBytes.length, "bytes")

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${examenData.nombre.replace(/\s+/g, "_")}.pdf"`,
      },
    })
  } catch (error) {
    console.error("[v0] Error completo generando PDF:", error)
    return NextResponse.json(
      {
        error: "Error generando PDF",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
