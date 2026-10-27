import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { PDFParse } = require('pdf-parse')

const files = [
  'D:\\Nueva carpeta\\peluqueria\\contexto 1.pdf',
  'D:\\Nueva carpeta\\peluqueria\\contexto 2.pdf',
  'D:\\Nueva carpeta\\peluqueria\\contexto 3.pdf',
  'D:\\Nueva carpeta\\peluqueria\\Enlace_Vinculacion_Especificacion_Tecnica.pdf',
]

function cleanText(s) {
  return String(s || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

for (const f of files) {
  const buf = await fs.readFile(f)
  const data = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  const parser = new PDFParse({ data, verbosity: 0 })
  await parser.load()
  const info = await parser.getInfo().catch(() => null)
  const textObj = await parser.getText()
  const txt = cleanText(textObj?.text || '')
  const head = txt.slice(0, 50000)
  process.stdout.write(`\n===== ${path.basename(f)} =====\n`)
  process.stdout.write(`pages=${info?.total ?? 'unknown'}\n`)
  process.stdout.write(head + '\n')
  await parser.destroy()
}

