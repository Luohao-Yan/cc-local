#!/usr/bin/env bun

/**
 * Create PNG icon from SVG
 * Uses simple canvas-based approach
 */

import { writeFileSync } from 'fs'
import { join } from 'path'

const IMAGES_DIR = join(import.meta.dir, '..', 'packages', 'vscode-ext', 'images')

// Simple PNG icon (128x128) - Claude orange circle with "C" letter
// This is a minimal valid PNG file with an orange circle
const width = 128
const height = 128

// Create a simple PNG using raw data
// PNG header
const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])

// Create IHDR chunk (image header)
function createChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)

  const typeBuffer = Buffer.from(type)
  const crcData = Buffer.concat([typeBuffer, data])

  // Calculate CRC32
  let crc = 0xFFFFFFFF
  for (let i = 0; i < crcData.length; i++) {
    crc ^= crcData[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  crc = ~crc >>> 0
  const crcBuffer = Buffer.alloc(4)
  crcBuffer.writeUInt32BE(crc, 0)

  return Buffer.concat([length, typeBuffer, data, crcBuffer])
}

// IHDR: width, height, bit depth (8), color type (RGBA=6), compression (0), filter (0), interlace (0)
const ihdrData = Buffer.alloc(13)
ihdrData.writeUInt32BE(width, 0)    // width
ihdrData.writeUInt32BE(height, 4)    // height
ihdrData.writeUInt8(8, 8)            // bit depth
ihdrData.writeUInt8(6, 9)            // color type: RGBA
ihdrData.writeUInt8(0, 10)           // compression
ihdrData.writeUInt8(0, 11)           // filter
ihdrData.writeUInt8(0, 12)           // interlace

const ihdr = createChunk('IHDR', ihdrData)

// Create image data (RGBA)
// Orange circle with "C" letter
const orange = { r: 217, g: 119, b: 87 }  // #d97757
const white = { r: 255, g: 255, b: 255 }

const rawData: number[] = []
const centerX = width / 2
const centerY = height / 2
const radius = 50

for (let y = 0; y < height; y++) {
  rawData.push(0) // filter byte for each row
  for (let x = 0; x < width; x++) {
    const dx = x - centerX
    const dy = y - centerY
    const dist = Math.sqrt(dx * dx + dy * dy)

    // Check if inside circle
    if (dist <= radius) {
      // Check if inside "C" letter area
      const angle = Math.atan2(dy, dx)
      const normalizedAngle = (angle + Math.PI) / (2 * Math.PI)

      // Simple "C" shape - right side missing
      const isC = normalizedAngle > 0.15 && normalizedAngle < 0.85 &&
                  dist > radius * 0.4 && dist < radius * 0.85

      if (isC) {
        rawData.push(white.r, white.g, white.b, 255)
      } else {
        rawData.push(orange.r, orange.g, orange.b, 255)
      }
    } else {
      // Transparent outside circle
      rawData.push(0, 0, 0, 0)
    }
  }
}

// Compress with zlib (deflate)
const zlib = await import('zlib')
const rawBuffer = Buffer.from(rawData)
const compressed = zlib.deflateSync(rawBuffer)

const idat = createChunk('IDAT', compressed)

// IEND chunk
const iend = createChunk('IEND', Buffer.alloc(0))

// Combine all chunks
const png = Buffer.concat([signature, ihdr, idat, iend])

// Write to file
writeFileSync(join(IMAGES_DIR, 'icon.png'), png)
console.log('✅ Created icon.png (128x128)')
