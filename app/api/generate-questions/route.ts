import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  console.log("[API] 🚀 Iniciando generate-questions con GROQ")
  
  try {
    const { pdfText, questions } = await request.json()
    console.log("[API] ✅ Request parseado correctamente")
    console.log("[API] 📄 Longitud del PDF text:", pdfText?.length)
    console.log("[API] 📝 Número de preguntas:", questions?.length)

    if (!pdfText || !questions || questions.length === 0) {
      console.log("[API] ❌ Validación falló: faltan datos")
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

    // Limitar el texto del PDF para evitar prompts muy largos - REDUCIDO para mayor estabilidad
    const maxPdfLength = 5000 // Reducido de 8000 para evitar truncamientos
    const truncatedPdfText = pdfText.length > maxPdfLength 
      ? pdfText.substring(0, maxPdfLength) + "\n\n[CONTENIDO TRUNCADO...]"
      : pdfText

    console.log(`[API] Longitud del texto PDF: ${pdfText.length} chars (truncado a: ${truncatedPdfText.length})`)

    const prompt = `Basándote en el siguiente contenido de un documento académico, genera un examen con las siguientes especificaciones:

CONTENIDO DEL DOCUMENTO:
${truncatedPdfText}

CONFIGURACIÓN DE PREGUNTAS:
${questionsConfig}

INSTRUCCIONES:
1. Genera preguntas que evalúen comprensión, aplicación y análisis del contenido
2. Para múltiple opción: incluye 4 opciones (A, B, C, D) con una correcta
3. Para desarrollo: formula preguntas que requieran explicación detallada
4. Para verdadero/falso: crea afirmaciones claras sobre conceptos del documento
5. Para preguntas con gráfico: genera datos matemáticos precisos para graficar
6. Mantén coherencia con el nivel académico del documento

INSTRUCCIONES ESPECIALES PARA MATEMÁTICA:
- Para ecuaciones matemáticas, usa sintaxis LaTeX entre $ para inline: $E_c = \\\\frac{1}{2}mv^2$
- Ejemplos de símbolos: $\\\\Delta$, $\\\\alpha$, $\\\\pi$, $\\\\theta$
- Fracciones: $\\\\frac{numerador}{denominador}$
- Exponentes: $x^2$, subíndices: $x_1$
- Integrales: $\\\\int$, sumatorias: $\\\\sum$, límites: $\\\\lim$
- Raíces: $\\\\sqrt{x}$, derivadas: $\\\\frac{d}{dx}$
- Funciones: $\\\\sin(x)$, $\\\\cos(x)$, $\\\\log(x)$

FORMATO DE RESPUESTA (JSON válido, títulos cortos):
{
  "questions": [
    {
      "type": "multiple|development|truefalse",
      "question": "Texto de la pregunta con LaTeX",
      "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "correctAnswer": 0,
      "points": 10,
      "category": "teoría",
      "includesGraphic": false,
      "justification": "none",
      "graphicData": {
        "type": "line",
        "title": "Título corto",
        "xLabel": "X",
        "yLabel": "Y", 
        "data": [{"x": 0, "y": 0}, {"x": 1, "y": 1}],
        "annotations": [{"x": 0.5, "y": 0.5, "text": "Punto"}]
      }
    }
  ]
}

IMPORTANTE: 
- Mantén títulos y textos cortos (máximo 30 caracteres)
- Para múltiple opción: "correctAnswer" debe ser índice (0, 1, 2, 3)
- Para verdadero/falso: "correctAnswer" debe ser "verdadero" o "falso"
- Solo incluye "options" para múltiple opción
- SIEMPRE usar LaTeX con doble backslash: \\\\frac, \\\\Delta
- Responde ÚNICAMENTE JSON válido, sin texto adicional
- Si includesGraphic es true, incluir graphicData completo`

    console.log(`[API] Configuración de preguntas: ${questions.length} preguntas`)
    console.log(`[API] Longitud del prompt completo: ${prompt.length} caracteres`)
    
    // Verificar API key
    const apiKey = process.env.GROQ_API_KEY
    console.log("[API] 🔑 GROQ API Key presente:", !!apiKey)

    if (!apiKey) {
      throw new Error("Falta GROQ_API_KEY en el .env")
    }

    // Función para limpiar JSON de manera robusta
    const cleanAndValidateJson = (rawText: string): string => {
      console.log("[API] 🧹 Iniciando limpieza de JSON...")
      
      let cleaned = rawText.trim()
      
      // Remover markdown
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      
      // Arreglar saltos de línea dentro de strings JSON
      cleaned = cleaned.replace(/("\w+"\s*:\s*")([^"]*\n[^"]*)(")/, '$1$2$3')
      
      // Limpiar caracteres problemáticos
      cleaned = cleaned
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remover caracteres de control
        .replace(/\n\s*\n/g, ' ') // Múltiples saltos de línea
        .replace(/\s+/g, ' ') // Espacios múltiples
        .trim()
      
      console.log("[API] 🔍 Texto después de limpieza inicial:", cleaned.substring(0, 200))
      
      // Buscar JSON
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error("[API] ❌ No se encontró JSON en:", cleaned.substring(0, 500))
        throw new Error("No se encontró JSON válido en la respuesta")
      }
      
      let jsonString = jsonMatch[0]
      
      // Validar y reparar llaves si es necesario
      const openBraces = (jsonString.match(/\{/g) || []).length
      const closeBraces = (jsonString.match(/\}/g) || []).length
      
      if (openBraces > closeBraces) {
        console.log("[API] 🔧 Reparando llaves faltantes...")
        jsonString += '}'.repeat(openBraces - closeBraces)
      }
      
      // Validar brackets
      const openBrackets = (jsonString.match(/\[/g) || []).length
      const closeBrackets = (jsonString.match(/\]/g) || []).length
      
      if (openBrackets > closeBrackets) {
        console.log("[API] 🔧 Reparando brackets faltantes...")
        jsonString += ']'.repeat(openBrackets - closeBrackets)
      }
      
      console.log("[API] 📝 JSON final para validar:", jsonString.substring(0, 300) + "...")
      return jsonString
    }

    // Función para retry con backoff exponencial
    const generateWithRetry = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          console.log(`[API] 🔄 Intento ${i + 1} de generar preguntas con GROQ`)
          
          const result = await generateText({
            model: groq("llama-3.3-70b-versatile"),
            prompt: prompt,
            temperature: 0.3, // Reducido para mayor consistencia
            topP: 0.9,
            frequencyPenalty: 0,
            presencePenalty: 0,
          })
          
          if (!result || !result.text) {
            throw new Error("GROQ devolvió respuesta vacía")
          }
          
          console.log(`[API] ✅ Respuesta exitosa en intento ${i + 1}`)
          console.log("[API] 📄 Longitud respuesta:", result.text.length)
          
          return result
        } catch (error: any) {
          console.log(`[API] ❌ Error en intento ${i + 1}:`, error.message)
          
          if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
            console.log("[API] ⏳ Rate limit alcanzado, esperando más tiempo...")
            const waitTime = Math.pow(2, i + 2) * 1000
            console.log(`[API] ⏰ Esperando ${waitTime}ms antes del siguiente intento...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
            continue
          }
          
          if (i === retries - 1) {
            throw error
          }
          
          // Backoff exponencial: 2s, 4s, 8s
          const waitTime = Math.pow(2, i + 1) * 1000
          console.log(`[API] ⏰ Esperando ${waitTime}ms antes del siguiente intento...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
      throw new Error("Todos los intentos fallaron")
    }

    const result = await generateWithRetry(3)
    
    // Limpiar y validar JSON
    const cleanedJson = cleanAndValidateJson(result.text)
    
    // Parsear JSON
    let parsedResponse
    try {
      parsedResponse = JSON.parse(cleanedJson)
      
      if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
        throw new Error("Formato de respuesta inválido: falta array 'questions'")
      }
      
      if (parsedResponse.questions.length === 0) {
        throw new Error("No se generaron preguntas")
      }
      
      console.log("[API] ✅ JSON parseado exitosamente:", parsedResponse.questions.length, "preguntas")
      
      // Validar cada pregunta
      parsedResponse.questions.forEach((q: any, index: number) => {
        if (!q.question || !q.type) {
          throw new Error(`Pregunta ${index + 1} tiene formato inválido`)
        }
      })
      
    } catch (parseError) {
      console.error("[API] ❌ Error parseando JSON final:", parseError)
      console.error("[API] 📄 JSON problemático:", cleanedJson.substring(0, 800))
      throw new Error(`Error al parsear respuesta de GROQ: ${parseError}`)
    }

    // Devolver respuesta exitosa
    return new Response(JSON.stringify(parsedResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })

  } catch (error) {
    console.error("[API] ❌ Error general generating questions:", error)
    return new Response(
      JSON.stringify({ 
        error: "Failed to generate questions", 
        details: error instanceof Error ? error.message : "Unknown error" 
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}