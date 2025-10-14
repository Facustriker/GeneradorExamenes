import { type NextRequest, NextResponse } from "next/server"
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "docx"
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
  graphicData?: {
    type: 'line' | 'bar' | 'scatter'
    title: string
    xLabel: string
    yLabel: string
    data: Array<{ x: number; y: number }>
    annotations?: Array<{ x: number; y: number; text: string }>
  }
}

interface ExamenData {
  nombre: string
  catedraId: string
  preguntas: PreguntaGenerada[]
  fechaCreacion?: Date
}

// Función para convertir LaTeX a texto plano legible
function convertLatexToPlain(text: string): string {
  if (!text) return '';
  
  let result = text;
  
  // Primero, extraer contenido entre $ $
  result = result.replace(/\$\$([^$]+)\$\$/g, (match, content) => {
    return convertLatexCommands(content);
  });
  
  result = result.replace(/\$([^$]+)\$/g, (match, content) => {
    return convertLatexCommands(content);
  });
  
  return result;
}

function convertLatexCommands(latex: string): string {
  return latex
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\sqrt\[(\d+)\]\{([^}]+)\}/g, '$1√($2)')
    .replace(/\\int/g, '∫')
    .replace(/\\sum/g, '∑')
    .replace(/\\prod/g, '∏')
    .replace(/\\lim/g, 'lím')
    .replace(/\\sin/g, 'sen')
    .replace(/\\cos/g, 'cos')
    .replace(/\\tan/g, 'tan')
    .replace(/\\log/g, 'log')
    .replace(/\\ln/g, 'ln')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\theta/g, 'θ')
    .replace(/\\pi/g, 'π')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\omega/g, 'ω')
    .replace(/\\phi/g, 'φ')
    .replace(/\\epsilon/g, 'ε')
    .replace(/\\rho/g, 'ρ')
    .replace(/\\tau/g, 'τ')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±')
    .replace(/\\cdot/g, '·')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/\\infty/g, '∞')
    .replace(/\\partial/g, '∂')
    .replace(/\\vec\{([^}]+)\}/g, '$1→')
    .replace(/\\([a-zA-Z]+)/g, '$1')
    .replace(/[\{\}]/g, '')
    .replace(/\^(\w)/g, '^$1')
    .replace(/_(\w)/g, '_$1');
}

export async function POST(request: NextRequest) {
  try {
    console.log("[API] Iniciando generación de DOCX")

    const { examenData }: { examenData: ExamenData } = await request.json()
    console.log("[API] Datos recibidos:", {
      nombre: examenData?.nombre,
      catedraId: examenData?.catedraId,
      preguntasCount: examenData?.preguntas?.length,
    })

    if (!examenData || !examenData.nombre || !examenData.catedraId || !examenData.preguntas?.length) {
      console.log("[API] Error: Datos del examen incompletos")
      return NextResponse.json({ error: "Datos del examen incompletos" }, { status: 400 })
    }

    console.log("[API] Creando documento Word")
    
    // Array para almacenar todos los párrafos del documento
    const docElements = []

    // Procesar cada pregunta
    for (let i = 0; i < examenData.preguntas.length; i++) {
      const pregunta = examenData.preguntas[i]
      
      // Número de pregunta y enunciado con puntaje
      const enunciadoTexto = convertLatexToPlain(pregunta.enunciado)
      
      docElements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${i + 1}. ${enunciadoTexto}`,
              bold: true,
              size: 24, // 12pt
            }),
            new TextRun({
              text: `  (${pregunta.puntaje} ${pregunta.puntaje === 1 ? "punto" : "puntos"})`,
              size: 20, // 10pt
              italics: true,
            }),
          ],
          spacing: { after: 200 },
        })
      )

      // Contenido específico según tipo de pregunta
      if (pregunta.tipo === "multiple-opcion" && pregunta.opciones) {
  const correcta = String(pregunta.respuestaCorrecta ?? "").toLowerCase();

  pregunta.opciones.forEach((opcion, idx) => {
    const opcionTexto = convertLatexToPlain(opcion);
    const letra = String.fromCharCode(65 + idx);

    const esCorrecta =
      correcta === String(idx) ||
      correcta === letra.toLowerCase() ||
      correcta === opcion.toLowerCase();

    docElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${letra}) ${opcionTexto}${esCorrecta ? "   ← Correcta" : ""}`,
            bold: esCorrecta,
            color: esCorrecta ? "007700" : "000000", // verde si es correcta, negro si no
          }),
        ],
        indent: { left: 720 }, // 0.5 pulgadas
        spacing: { after: 100 },
      })
    );
  });
      } else if (pregunta.tipo === "desarrollo") {
        docElements.push(
          new Paragraph({
            text: "[Espacio para respuesta de desarrollo]",
            indent: { left: 720 },
            italics: true,
            spacing: { after: 200 },
          })
        )
        // Agregar líneas para escribir
        for (let j = 0; j < 6; j++) {
          docElements.push(
            new Paragraph({
              text: "_".repeat(80),
              indent: { left: 720 },
              spacing: { after: 100 },
            })
          )
        }
      } else if (pregunta.tipo === "verdadero-falso") {
  const respuesta = String(pregunta.respuestaCorrecta ?? "").toLowerCase();
  const esVerdadero = respuesta === "verdadero" || respuesta === "true";

  // Línea con checkboxes mostrando cuál es la respuesta correcta
  docElements.push(
    new Paragraph({
      children: [
        new TextRun({
          text: esVerdadero ? "☑ Verdadero     ☐ Falso" : "☐ Verdadero     ☑ Falso",
          color: "007700", // verde oscuro
          bold: true,
        }),
      ],
      indent: { left: 720 },
      spacing: { after: 200 },
    })
  );

  // Si hay texto de justificación, lo agregamos debajo
  if (pregunta.justificacion) {
    docElements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Justificación: ${pregunta.justificacion}`,
            italics: true,
            color: "444444",
          }),
        ],
        indent: { left: 720 },
        spacing: { after: 200 },
      })
    );
  }
}
      // Gráfico si existe
      if (pregunta.incluyeGrafico) {
        if (pregunta.graphicData) {
          const titulo = convertLatexToPlain(pregunta.graphicData.title)
          const xLabel = convertLatexToPlain(pregunta.graphicData.xLabel)
          const yLabel = convertLatexToPlain(pregunta.graphicData.yLabel)
          
          docElements.push(
            new Paragraph({
              text: `[Gráfico: ${titulo}]`,
              indent: { left: 720 },
              italics: true,
              spacing: { after: 100 },
            }),
            new Paragraph({
              text: `Eje X: ${xLabel} | Eje Y: ${yLabel}`,
              indent: { left: 720 },
              italics: true,
              size: 18,
              spacing: { after: 100 },
            })
          )
          
          // Mostrar algunos puntos de datos
          if (pregunta.graphicData.data && pregunta.graphicData.data.length > 0) {
            const puntosTexto = pregunta.graphicData.data
              .slice(0, 5)
              .map(p => `(${p.x}, ${p.y})`)
              .join(", ")
            docElements.push(
              new Paragraph({
                text: `Puntos clave: ${puntosTexto}${pregunta.graphicData.data.length > 5 ? "..." : ""}`,
                indent: { left: 720 },
                italics: true,
                size: 16,
                spacing: { after: 100 },
              })
            )
          }
          
          // Anotaciones si existen
          if (pregunta.graphicData.annotations && pregunta.graphicData.annotations.length > 0) {
            docElements.push(
              new Paragraph({
                text: "Puntos destacados:",
                indent: { left: 720 },
                bold: true,
                size: 18,
                spacing: { after: 100 },
              })
            )
            pregunta.graphicData.annotations.forEach(ann => {
              const annTexto = convertLatexToPlain(ann.text)
              docElements.push(
                new Paragraph({
                  text: `• (${ann.x}, ${ann.y}): ${annTexto}`,
                  indent: { left: 1080 },
                  size: 18,
                  spacing: { after: 50 },
                })
              )
            })
          }
        } else {
          docElements.push(
            new Paragraph({
              text: "[Espacio reservado para gráfico]",
              indent: { left: 720 },
              italics: true,
              spacing: { after: 200 },
            })
          )
        }
      }

      // Espacio entre preguntas
      docElements.push(
        new Paragraph({
          text: "",
          spacing: { after: 400 },
        })
      )
    }

    // Crear el documento Word
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: docElements,
        },
      ],
    })

    console.log("[API] Guardando en base de datos")
    const supabase = await createClient()

    const { error: dbError } = await supabase.from("examenes").insert({
      nombre: examenData.nombre,
      catedra_id: examenData.catedraId,
      preguntas: examenData.preguntas,
      created_at: new Date().toISOString(),
    })

    if (dbError) {
      console.error("[API] Error guardando en base de datos:", dbError)
      if (dbError.code === "23503") {
        return NextResponse.json(
          { error: "La cátedra especificada no existe" },
          { status: 404 },
        )
      }
      return NextResponse.json(
        { error: "Error guardando el examen en la base de datos", details: dbError.message },
        { status: 500 },
      )
    }
    console.log("[API] Examen guardado exitosamente en la base de datos.")

    console.log("[API] Generando bytes del DOCX")
    const docxBuffer = await Packer.toBuffer(doc)
    console.log("[API] DOCX generado exitosamente, tamaño:", docxBuffer.length, "bytes")

    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${examenData.nombre.replace(/\s+/g, "_")}.docx"`,
      },
    })

  } catch (error) {
    console.error("[API] Error completo generando DOCX:", error)
    return NextResponse.json(
      {
        error: "Error generando DOCX",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}