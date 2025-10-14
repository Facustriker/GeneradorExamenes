const katex = require("katex");
const puppeteer = require("puppeteer");
const fs = require("fs");

async function renderLatexToImage(latex) {
  console.log("[TEST] Renderizando fórmula:", latex);

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: transparent;
      }
      #container {
        display: inline-block; /* Cambiado de flex + fit-content */
        padding: 20px;
      }
      .katex {
        font-size: 3em;
      }
    </style>
  </head>
  <body>
    <div id="container">${katex.renderToString(latex, { throwOnError: false })}</div>
  </body>
  </html>
  `;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });
  await page.setContent(htmlContent, { waitUntil: "load" });

  // Esperar a que KaTeX se renderice completamente
  await page.waitForSelector(".katex", { visible: true });
  await page.waitForFunction(() => {
    const el = document.querySelector(".katex");
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

  const element = await page.$("#container");

  if (!element) throw new Error("No se encontró el contenedor");

  // Omitir clip, ya que el elemento tiene el tamaño exacto
  const buffer = await element.screenshot({
    omitBackground: true,
    type: "png",
  });

  await browser.close();

  fs.writeFileSync("latex-test.png", buffer);
  console.log("[TEST] ✅ Imagen renderizada correctamente -> latex-test.png");
}

// Ejemplo
renderLatexToImage("\\int_0^{2\\pi} \\sin(x)\\,dx = 0");
