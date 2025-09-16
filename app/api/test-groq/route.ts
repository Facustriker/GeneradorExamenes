import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  console.log("[TEST] 🧪 Iniciando test de GROQ")
  
  try {
    // Verificar API key
    const apiKey = process.env.GROQ_API_KEY
    console.log("[TEST] 🔑 GROQ API Key presente:", !!apiKey)
    console.log("[TEST] 🔑 API Key length:", apiKey?.length)
    console.log("[TEST] 🔑 API Key starts with:", apiKey?.substring(0, 15) + "...")
    
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: "No GROQ API key found",
        envVars: Object.keys(process.env).filter(key => key.includes('GROQ'))
      }), { status: 400 })
    }

    console.log("[TEST] 📡 Enviando request simple a GROQ...")
    
    const result = await generateText({
      model: groq("llama-3.3-70b-versatile"), // Modelo actualizado
      prompt: "Di solo 'Hola desde GROQ' y nada más",
      system: "Responde exactamente lo que se te pide, sin agregar texto adicional.",
      temperature: 0.1,
    })

    console.log("[TEST] ✅ Respuesta de GROQ:", result.text)
    console.log("[TEST] 📊 Usage info:", result.usage)

    return new Response(JSON.stringify({ 
      success: true,
      response: result.text,
      usage: result.usage,
      model: "llama-3.3-70b-versatile"
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error("[TEST] ❌ Error en test GROQ:", error)
    console.error("[TEST] Error details:", {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      cause: error.cause,
      name: error.name
    })

    return new Response(JSON.stringify({ 
      error: "Test GROQ failed", 
      details: error.message,
      errorName: error.name,
      statusCode: error.status || 'unknown'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}