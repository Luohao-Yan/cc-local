import { useState, useCallback, useMemo } from 'react'
import './ImageBlock.css'

interface ImageBlockProps {
  src: string
  alt?: string
  mediaType?: string
  maxWidth?: number
  maxHeight?: number
}

function ImageBlock({
  src,
  alt = '',
  mediaType,
  maxWidth = 800,
  maxHeight = 400,
}: ImageBlockProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFull, setShowFull] = useState(false)

  // 处理图片源
  const imageSrc = useMemo(() => {
    if (src.startsWith('data:') || src.startsWith('http')) {
      return src
    }

    // Base64 编码的图片
    if (mediaType) {
      return `data:${mediaType};base64,${src}`
    }

    return src
  }, [src, mediaType])

  // 加载完成
  const handleLoad = useCallback(() => {
    setLoaded(true)
    setError(null)
  }, [])

  // 加载错误
  const handleError = useCallback(() => {
    setError('Failed to load image')
    setLoaded(false)
  }, [])

  // 切换全屏
  const toggleFull = useCallback(() => {
    setShowFull(prev => !prev)
  }, [])

  return (
    <div className={`image-block ${showFull ? 'full' : ''}`}>
      {!loaded && !error && (
        <div className="image-block-loading">
          <span>Loading...</span>
        </div>
      )}

      {error && (
        <div className="image-block-error">
          <span>{error}</span>
        </div>
      )}

      <img
        src={imageSrc}
        alt={alt}
        className="image-block-img"
        onLoad={handleLoad}
        onError={handleError}
        style={{ maxWidth: showFull ? 'none' : maxWidth, maxHeight: showFull ? 'none' : maxHeight }}
        loading="lazy"
        onClick={toggleFull}
      />

      {alt && (
        <div className="image-block-caption">{alt}</div>
      )}

      {showFull && (
        <div className="image-block-overlay" onClick={toggleFull}>
          <img
            src={imageSrc}
            alt={alt}
            className="image-block-full-img"
          />
        </div>
      )}
    </div>
  )
}

export default ImageBlock

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Create blob URL from base64
// ─────────────────────────────────────────────────────────────────────────────

export function createBlobUrl(base64: string, mediaType: string): string {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: mediaType })
  return URL.createObjectURL(blob)
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Validate image data
// ─────────────────────────────────────────────────────────────────────────────

export function validateImageData(data: unknown): { valid: boolean; error?: string } {
  if (typeof data !== 'string') {
    return { valid: false, error: 'Invalid image data type' }
  }

  // Check if it's a valid base64 string
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
  if (!base64Regex.test(data)) {
    return { valid: false, error: 'Invalid base64 encoding' }
  }

  return { valid: true }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Get image dimensions
// ─────────────────────────────────────────────────────────────────────────────

export function getImageDimensions(
  base64: string,
  mediaType: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = `data:${mediaType};base64,${base64}`
  })
}
