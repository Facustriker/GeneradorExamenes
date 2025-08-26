import { streamText } from "ai"
import { xai } from "@ai-sdk/xai"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { pdfText, questions } = await request.json()

    if (!pdfText || !questions || questions.length === 0) {
      return new Response("PDF text and questions configuration are required", { status: 400 })
    }

    // Construir el prompt basado en la configuración de preguntas
    const questionsConfig = questions
      .map((q: any, index: number) => {
        let config = `Pregunta ${index + 1}:
- Tipo: ${
          q.type === "multiple"
            ? "Múltiple opción (4 opciones, una correcta)"
            : q.type === "development"
              ? "Desarrollo (respuesta abierta)"
              : "Verdadero/Falso"
        }
- Puntaje: ${q.points} puntos
- Categoría: ${q.category}
- Incluye gráfico: ${q.includesGraphic ? "Sí (mencionar qué tipo de gráfico sería útil)" : "No"}`

        if (q.type === "truefalse") {
          config += `
- Justificación: ${
            q.justification === "true"
              ? "Justificar solo verdaderas"
              : q.justification === "false"
                ? "Justificar solo falsas"
                : "Sin justificación"
          }`
        }

        return config
      })
      .join("\n\n")

    const prompt = `Basándote en el siguiente contenido de un documento académico, genera un examen con las siguientes especificaciones:

CONTENIDO DEL DOCUMENTO:
${pdfText}

CONFIGURACIÓN DE PREGUNTAS:
${questionsConfig}

INSTRUCCIONES:
1. Genera preguntas que evalúen comprensión, aplicación y análisis del contenido
2. Para múltiple opción: incluye 4 opciones (A, B, C, D) con una correcta
3. Para desarrollo: formula preguntas que requieran explicación detallada
4. Para verdadero/falso: crea afirmaciones claras sobre conceptos del documento
5. Si se requiere gráfico, especifica qué tipo sería útil (diagrama, tabla, esquema, etc.)
6. Mantén coherencia con el nivel académico del documento

FORMATO DE RESPUESTA (JSON):
{
  "questions": [
    {
      "id": 1,
      "type": "multiple|development|truefalse",
      "question": "Texto de la pregunta",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."], // solo para múltiple opción
      "correctAnswer": "A", // solo para múltiple opción y verdadero/falso
      "points": número,
      "category": "teoría|práctica|mixta",
      "includesGraphic": boolean,
      "graphicDescription": "descripción del gráfico si aplica",
      "justification": "true|false|none" // solo para verdadero/falso
    }
  ]
}`

    const result = streamText({
      model: xai("grok-4", {
        apiKey: process.env.XAI_API_KEY,
      }),
      prompt: prompt,
      system:
        "Eres un experto en educación y evaluación académica. Genera preguntas de examen precisas, claras y apropiadas para el nivel educativo del contenido proporcionado. Responde únicamente con el JSON solicitado, sin texto adicional.",
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error("Error generating questions:", error)
    return new Response("Failed to generate questions", { status: 500 })
  }
}
