import { type NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import puppeteer from "puppeteer";
import katex from "katex";

interface PreguntaGenerada {
  id: string;
  enunciado: string;
  tipo: "multiple-opcion" | "desarrollo" | "verdadero-falso";
  opciones?: string[];
  respuestaCorrecta?: string | number;
  justificacion?: string;
  puntaje: number;
  incluyeGrafico: boolean;
  graphicData?: {
    type: 'line' | 'bar' | 'scatter';
    title: string;
    xLabel: string;
    yLabel: string;
    data: Array<{ x: number; y: number }>;
    annotations?: Array<{ x: number; y: number; text: string }>;
  };
}

interface ExamenData {
  nombre: string;
  catedraId: string;
  preguntas: PreguntaGenerada[];
  fechaCreacion?: Date;
}

// Función para renderizar LaTeX a imagen usando Puppeteer y KaTeX
async function renderLatexToImage(latex: string): Promise<{ buffer: Buffer; width: number; height: number }> {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 }); // Mejora la resolución

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
        <style>
          body { margin: 0; padding: 10px; background: transparent; }
          .katex { font-size: 3.0em; } /* Aumentado para generar imágenes más grandes */
        </style>
      </head>
      <body>
        <div id="formula">${katex.renderToString(latex, { throwOnError: false })}</div>
      </body>
      </html>
    `;

    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    const formulaElement = await page.$("#formula");
    if (!formulaElement) throw new Error("No se encontró el elemento de la fórmula");

    const boundingBox = await formulaElement.boundingBox();
    if (!boundingBox) throw new Error("No se pudo obtener el tamaño del elemento");

    const screenshot = await page.screenshot({
      clip: {
        x: boundingBox.x,
        y: boundingBox.y,
        width: boundingBox.width,
        height: boundingBox.height,
      },
      type: "png",
      omitBackground: true,
    });

    return {
      buffer: screenshot as Buffer,
      width: boundingBox.width,
      height: boundingBox.height,
    };
  } finally {
    await browser.close();
  }
}

// Función para dibujar gráfico simple en PDF
function drawSimpleGraph(page: any, graphicData: any, x: number, y: number, width: number, height: number) {
  page.drawRectangle({
    x: x,
    y: y - height,
    width: width,
    height: height,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1,
  });

  const title = graphicData.title;
  page.drawText(title, {
    x: x + width / 2 - (title.length * 3),
    y: y - 15,
    size: 10,
    font: page.doc.getFont("TimesRomanBold"),
    color: rgb(0, 0, 0),
  });

  const xLabel = graphicData.xLabel;
  const yLabel = graphicData.yLabel;

  page.drawText(xLabel, {
    x: x + width / 2 - (xLabel.length * 2.5),
    y: y - height - 20,
    size: 9,
    font: page.doc.getFont("TimesRoman"),
    color: rgb(0, 0, 0),
  });

  page.drawText(yLabel, {
    x: x - 40,
    y: y - height / 2,
    size: 9,
    font: page.doc.getFont("TimesRoman"),
    color: rgb(0, 0, 0),
  });

  page.drawLine({
    start: { x: x + 30, y: y - height + 20 },
    end: { x: x + width - 10, y: y - height + 20 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  page.drawLine({
    start: { x: x + 30, y: y - height + 20 },
    end: { x: x + 30, y: y - 30 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  if (graphicData.data && graphicData.data.length > 0) {
    const data = graphicData.data;
    const minX = Math.min(...data.map((d: any) => d.x));
    const maxX = Math.max(...data.map((d: any) => d.x));
    const minY = Math.min(...data.map((d: any) => d.y));
    const maxY = Math.max(...data.map((d: any) => d.y));

    const graphWidth = width - 50;
    const graphHeight = height - 60;

    for (let i = 0; i < data.length - 1; i++) {
      const point1 = data[i];
      const point2 = data[i + 1];

      const x1 = x + 30 + ((point1.x - minX) / (maxX - minX)) * graphWidth;
      const y1 = y - height + 20 + ((point1.y - minY) / (maxY - minY)) * graphHeight;
      const x2 = x + 30 + ((point2.x - minX) / (maxX - minX)) * graphWidth;
      const y2 = y - height + 20 + ((point2.y - minY) / (maxY - minY)) * graphHeight;

      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: 2,
        color: rgb(0, 0, 0),
      });

      page.drawCircle({
        x: x1,
        y: y1,
        size: 2,
        color: rgb(0, 0, 0),
      });
    }

    const lastPoint = data[data.length - 1];
    const lastX = x + 30 + ((lastPoint.x - minX) / (maxX - minX)) * graphWidth;
    const lastY = y - height + 20 + ((lastPoint.y - minY) / (maxY - minY)) * graphHeight;
    
    page.drawCircle({
      x: lastX,
      y: lastY,
      size: 2,
      color: rgb(0, 0, 0),
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Iniciando generación de PDF");

    const { examenData }: { examenData: ExamenData } = await request.json();
    console.log("[v0] Datos recibidos:", {
      nombre: examenData?.nombre,
      catedraId: examenData?.catedraId,
      preguntasCount: examenData?.preguntas?.length,
    });

    if (!examenData || !examenData.nombre || !examenData.catedraId || !examenData.preguntas?.length) {
      console.log("[v0] Error: Datos del examen incompletos");
      return NextResponse.json({ error: "Datos del examen incompletos" }, { status: 400 });
    }

    console.log("[v0] Creando documento PDF");
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    let page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();

    page.doc = pdfDoc;
    page.doc.getFont = (fontName: string) => {
      return fontName === "TimesRomanBold" ? timesRomanBoldFont : timesRomanFont;
    };

    let yPosition = height - 50;

    const supabase = await createClient();
    const { data: catedraData } = await supabase
      .from("catedras")
      .select("nombre")
      .eq("id", examenData.catedraId)
      .single();

    const catedraNombre = catedraData?.nombre || "Cátedra no encontrada";

    page.drawText(examenData.nombre, {
      x: 50,
      y: yPosition,
      size: 18,
      font: timesRomanBoldFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    page.drawText(`Cátedra: ${catedraNombre}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 20;

    page.drawText(`Fecha: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    page.drawText("Nombre y Apellido: ", {
      x: 50,
      y: yPosition,
      size: 12,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });

    page.drawText("Legajo: ", {
      x: 350,
      y: yPosition,
      size: 12,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 40;

    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: width - 50, y: yPosition },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    for (let i = 0; i < examenData.preguntas.length; i++) {
      const pregunta = examenData.preguntas[i];

      const spaceNeeded = pregunta.incluyeGrafico ? 250 : (pregunta.enunciado.includes("$") ? 180 : 120);
      if (yPosition < spaceNeeded) {
        page = pdfDoc.addPage([595.28, 841.89]);
        page.doc = pdfDoc;
        page.doc.getFont = (fontName: string) => {
          return fontName === "TimesRomanBold" ? timesRomanBoldFont : timesRomanFont;
        };
        yPosition = height - 50;
      }

      const latexRegex = /\$(.*?)\$/g;
      const parts: Array<{ type: "text" | "latex"; content: string }> = [];
      let lastIndex = 0;

      let match;
      while ((match = latexRegex.exec(pregunta.enunciado)) !== null) {
        const beforeText = pregunta.enunciado.slice(lastIndex, match.index).trim();
        if (beforeText) parts.push({ type: "text", content: beforeText });
        parts.push({ type: "latex", content: match[1].trim() });
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < pregunta.enunciado.length) {
        parts.push({ type: "text", content: pregunta.enunciado.slice(lastIndex).trim() });
      }

      page.drawText(`${i + 1}.`, {
        x: 50,
        y: yPosition,
        size: 12,
        font: timesRomanBoldFont,
        color: rgb(0, 0, 0),
      });

      let xOffset = 70;
      let initialY = yPosition; // Para el puntaje
      let enunciadoHeight = 0;

      for (const part of parts) {
        if (part.type === "text") {
          const words = part.content.split(" ");
          let currentLine = "";
          let lines = [];
          const maxWidth = width - 200;

          for (const word of words) {
            const testLine = currentLine + (currentLine ? " " : "") + word;
            if (testLine.length * 6 > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) lines.push(currentLine);

          for (const line of lines) {
            page.drawText(line, {
              x: xOffset,
              y: yPosition,
              size: 12,
              font: timesRomanFont,
              color: rgb(0, 0, 0),
            });
            yPosition -= 18;
            enunciadoHeight += 18;
            xOffset = 70; // Resetear offset para nuevas líneas
          }
        } else if (part.type === "latex") {
          const { buffer, width: imgWidth, height: imgHeight } = await renderLatexToImage(part.content);
          const pngImage = await pdfDoc.embedPng(buffer);
          const scale = Math.min(400 / imgWidth, 80 / imgHeight, 3.0);
          page.drawImage(pngImage, {
            x: xOffset,
            y: yPosition - (imgHeight * scale) / 2 + 5,
            width: imgWidth * scale,
            height: imgHeight * scale,
          });
          xOffset += imgWidth * scale + 5;
          if (imgHeight * scale > 20) {
            yPosition -= imgHeight * scale - 18;
            enunciadoHeight += imgHeight * scale - 18;
          }
        }
      }

      const puntajeText = `(${pregunta.puntaje} ${pregunta.puntaje === 1 ? "punto" : "puntos"})`;
      page.drawText(puntajeText, {
        x: width - 150,
        y: initialY,
        size: 10,
        font: timesRomanFont,
        color: rgb(0.5, 0.5, 0.5),
      });

      yPosition -= 15;

      if (pregunta.tipo === "multiple-opcion" && pregunta.opciones) {
        for (let j = 0; j < pregunta.opciones.length; j++) {
          const opcion = pregunta.opciones[j];

          const opcionParts: Array<{ type: "text" | "latex"; content: string }> = [];
          let opcionLastIndex = 0;
          let opcionMatch;
          const opcionRegex = /\$(.*?)\$/g;
          while ((opcionMatch = opcionRegex.exec(opcion)) !== null) {
            const beforeText = opcion.slice(opcionLastIndex, opcionMatch.index).trim();
            if (beforeText) opcionParts.push({ type: "text", content: beforeText });
            opcionParts.push({ type: "latex", content: opcionMatch[1].trim() });
            opcionLastIndex = opcionMatch.index + opcionMatch[0].length;
          }
          if (opcionLastIndex < opcion.length) {
            opcionParts.push({ type: "text", content: opcion.slice(opcionLastIndex).trim() });
          }

          page.drawRectangle({
            x: 70,
            y: yPosition - 5,
            width: 10,
            height: 10,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
          });

          let opcionXOffset = 90;
          page.drawText(`${String.fromCharCode(65 + j)})`, {
            x: opcionXOffset,
            y: yPosition,
            size: 11,
            font: timesRomanFont,
            color: rgb(0, 0, 0),
          });
          opcionXOffset += 20;

          for (const opcionPart of opcionParts) {
            if (opcionPart.type === "text") {
              page.drawText(opcionPart.content, {
                x: opcionXOffset,
                y: yPosition,
                size: 11,
                font: timesRomanFont,
                color: rgb(0, 0, 0),
              });
              opcionXOffset += opcionPart.content.length * 6;
            } else if (opcionPart.type === "latex") {
              const { buffer, width: imgWidth, height: imgHeight } = await renderLatexToImage(opcionPart.content);
              const pngImage = await pdfDoc.embedPng(buffer);
              const scale = Math.min(300 / imgWidth, 60 / imgHeight, 2.5);
              page.drawImage(pngImage, {
                x: opcionXOffset,
                y: yPosition - (imgHeight * scale) / 2 + 3,
                width: imgWidth * scale,
                height: imgHeight * scale,
              });
              opcionXOffset += imgWidth * scale + 15;
            }
          }
          yPosition -= 25;
        }
        yPosition -= 10;
      } else if (pregunta.tipo === "desarrollo") {
        for (let k = 0; k < 8; k++) {
          yPosition -= 20;
        }
        yPosition -= 10;
      } else if (pregunta.tipo === "verdadero-falso") {
        page.drawRectangle({
          x: 70,
          y: yPosition - 5,
          width: 12,
          height: 12,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        page.drawRectangle({
          x: 170,
          y: yPosition - 5,
          width: 12,
          height: 12,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        page.drawText("Verdadero", {
          x: 90,
          y: yPosition,
          size: 11,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });

        page.drawText("Falso", {
          x: 190,
          y: yPosition,
          size: 11,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });

        yPosition -= 30;

        if (pregunta.justificacion) {
          const justificacionParts: Array<{ type: "text" | "latex"; content: string }> = [];
          let justificacionLastIndex = 0;
          let justificacionMatch;
          const justificacionRegex = /\$(.*?)\$/g;
          while ((justificacionMatch = justificacionRegex.exec(pregunta.justificacion)) !== null) {
            const beforeText = pregunta.justificacion.slice(justificacionLastIndex, justificacionMatch.index).trim();
            if (beforeText) justificacionParts.push({ type: "text", content: beforeText });
            justificacionParts.push({ type: "latex", content: justificacionMatch[1].trim() });
            justificacionLastIndex = justificacionMatch.index + justificacionMatch[0].length;
          }
          if (justificacionLastIndex < pregunta.justificacion.length) {
            justificacionParts.push({ type: "text", content: pregunta.justificacion.slice(justificacionLastIndex).trim() });
          }

          let justificacionXOffset = 70;
          for (const justificacionPart of justificacionParts) {
            if (justificacionPart.type === "text") {
              page.drawText(justificacionPart.content, {
                x: justificacionXOffset,
                y: yPosition,
                size: 10,
                font: timesRomanFont,
                color: rgb(0.3, 0.3, 0.3),
              });
              justificacionXOffset += justificacionPart.content.length * 5;
            } else if (justificacionPart.type === "latex") {
              const { buffer, width: imgWidth, height: imgHeight } = await renderLatexToImage(justificacionPart.content);
              const pngImage = await pdfDoc.embedPng(buffer);
              const scale = Math.min(300 / imgWidth, 60 / imgHeight, 2.5);
              page.drawImage(pngImage, {
                x: justificacionXOffset,
                y: yPosition - (imgHeight * scale) / 2 + 3,
                width: imgWidth * scale,
                height: imgHeight * scale,
              });
              justificacionXOffset += imgWidth * scale + 15;
            }
          }
          yPosition -= 30;

          for (let k = 0; k < 3; k++) {
            yPosition -= 15;
          }
        }
        yPosition -= 10;
      }

      if (pregunta.incluyeGrafico) {
        if (pregunta.graphicData) {
          drawSimpleGraph(page, pregunta.graphicData, 70, yPosition, width - 120, 120);
          yPosition -= 140;
        } else {
          page.drawRectangle({
            x: 70,
            y: yPosition - 60,
            width: width - 120,
            height: 50,
            borderColor: rgb(0.7, 0.7, 0.7),
            borderWidth: 1,
            borderDashArray: [3, 3],
          });
          page.drawText("[ Espacio reservado para gráfico ]", {
            x: (width - 200) / 2,
            y: yPosition - 40,
            size: 10,
            font: timesRomanFont,
            color: rgb(0.5, 0.5, 0.5),
          });
          yPosition -= 80;
        }
      }

      yPosition -= 20;
    }

    const totalPuntos = examenData.preguntas.reduce((sum, p) => sum + p.puntaje, 0);
    page.drawText(`Total de puntos: ${totalPuntos}`, {
      x: (width - 150) / 2,
      y: 35,
      size: 12,
      font: timesRomanBoldFont,
      color: rgb(0, 0, 0),
    });

    console.log("[v0] Guardando en base de datos");
    const { error: dbError } = await supabase.from("examenes").insert({
      nombre: examenData.nombre,
      catedra_id: examenData.catedraId,
      preguntas: examenData.preguntas,
      created_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error("[v0] Error guardando en base de datos:", dbError);
      if (dbError.code === "23503") {
        return NextResponse.json(
          { error: "La cátedra especificada no existe" },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { error: "Error guardando el examen en la base de datos", details: dbError.message },
        { status: 500 },
      );
    }
    console.log("[v0] Examen guardado exitosamente en la base de datos.");

    console.log("[v0] Generando bytes del PDF");
    const pdfBytes = await pdfDoc.save();
    console.log("[v0] PDF generado exitosamente, tamaño:", pdfBytes.length, "bytes");

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${examenData.nombre.replace(/\s+/g, "_")}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[v0] Error completo generando PDF:", error);
    return NextResponse.json(
      {
        error: "Error generando PDF",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}