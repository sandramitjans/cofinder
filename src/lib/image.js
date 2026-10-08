/**
 * Convierte una foto elegida por el usuario en un JPEG cuadrado y ligero (≈20–40 KB),
 * recortado al centro y con la orientación de la cámara corregida.
 * Devuelve un data URL listo para guardar en el perfil.
 */
export async function photoToDataUrl(file, size = 320, quality = 0.82) {
  if (!file || !file.type?.startsWith('image/')) throw new Error('not-an-image')

  let source
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Navegadores sin createImageBitmap para este formato: vía <img>
    source = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode-failed')) }
      img.src = url
    })
  }

  const w = source.width
  const h = source.height
  const side = Math.min(w, h)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size)
  source.close?.()
  return canvas.toDataURL('image/jpeg', quality)
}
