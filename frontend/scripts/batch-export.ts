#!/usr/bin/env tsx
import fs from 'fs'
import path from 'path'
import { Candle, parseCSV } from './lib/candleUtils'
import { generateAnnotations } from './lib/annotations'
import { renderChart } from './lib/chartRenderer'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function processDatesInParallel(
  datesToProcess: string[],
  m1Candles: Candle[],
  outputDir: string,
  concurrency: number = 8
): Promise<void> {
  let processed = 0
  const total = datesToProcess.length

  for (let i = 0; i < total; i += concurrency) {
    const batch = datesToProcess.slice(i, i + concurrency)

    await Promise.all(batch.map(async (date) => {
      try {
        const annotations = generateAnnotations(m1Candles, date)
        const buffer = renderChart(m1Candles, annotations, date)

        const outputPath = path.join(outputDir, `${date}.png`)
        fs.writeFileSync(outputPath, buffer)

        processed++
        console.log(`[${processed}/${total}] Saved: ${date}.png`)
      } catch (error) {
        console.error(`  Error processing ${date}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }))

    if (global.gc) {
      global.gc()
    }

    if (i + concurrency < total) {
      await sleep(50)
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const limitArg = args.find(a => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined

  const dataDir = path.join(process.cwd(), 'data')
  const outputDir = path.join(process.cwd(), 'output')

  if (!fs.existsSync(dataDir)) {
    console.error('data/ folder not found')
    process.exit(1)
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const m1File = fs.readdirSync(dataDir).find((f: string) => f.includes('m1'))
  if (!m1File) {
    console.error('No m1 CSV file found in data/')
    process.exit(1)
  }

  console.log(`Loading ${m1File}...`)
  const m1Text = fs.readFileSync(path.join(dataDir, m1File), 'utf-8')
  const m1Candles = parseCSV(m1Text)

  if (m1Candles.length === 0) {
    console.error('No candles parsed from CSV')
    process.exit(1)
  }

  const dates = Array.from(new Set(m1Candles.map(c => c.time.split(' ')[0] || c.time.split('T')[0]))).sort()
  console.log(`Found ${dates.length} trading days`)

  const datesToProcess = limit ? dates.slice(0, limit) : dates
  if (limit) {
    console.log(`Processing first ${limit} days only`)
  }

  console.log(`Processing ${datesToProcess.length} dates with concurrency 8...`)
  await processDatesInParallel(datesToProcess, m1Candles, outputDir, 8)

  console.log('Done!')
}

main().catch(console.error)
