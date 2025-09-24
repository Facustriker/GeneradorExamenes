import katex from "katex"
import { createCanvas } from "canvas"

export async function latexToImage(latex: string): Promise<Uint8Array> {
  // Renderizamos el LaTeX a HTML usando KaTeX
  const html = katex.renderToString(latex, {
    throwOnError: false,
    displayMode: true,
  })

  // Creamos un canvas para dibujar (ej: 800x200, lo podés ajustar)
  const canvas = createCanvas(800, 200)
  const ctx = canvas.getContext("2d")

  // Fondo blanco
  ctx.fillStyle = "#fff"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // OJO: KaTeX devuelve HTML con CSS, y canvas no entiende HTML directo.
  // Lo que hacemos es: usar librerías como node-html-to-image o directamente
  // un renderizador. Para simplificar, probamos primero con texto plano.
  // (Para versión PRO: habría que usar `puppeteer` para renderizar el HTML real).

  ctx.font = "20px Times New Roman"
  ctx.fillStyle = "#000"
  ctx.fillText(latex, 10, 50)

  return canvas.toBuffer("image/png")
}
