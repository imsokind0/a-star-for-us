
import { useRef, useState, useEffect } from 'react'
import './DrawingCanvas.css'

type Props = {
  onSave: (data: string) => void
}

export default function DrawingCanvas({ onSave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [color, setColor] = useState('#f5b8dc')
  const [size, setSize] = useState(4)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#160d27'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const start = (e: React.PointerEvent) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    drawing.current = true
    canvas.setPointerCapture(e.pointerId)

    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(
      (e.clientX - rect.left) * canvas.width / rect.width,
      (e.clientY - rect.top) * canvas.height / rect.height
    )
  }

  const draw = (e: React.PointerEvent) => {
    if (!drawing.current) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const rect = canvas.getBoundingClientRect()

    ctx.strokeStyle = color
    ctx.lineWidth = size
    ctx.lineTo(
      (e.clientX - rect.left) * canvas.width / rect.width,
      (e.clientY - rect.top) * canvas.height / rect.height
    )
    ctx.stroke()
  }

  const stop = () => {
    drawing.current = false
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.fillStyle = '#160d27'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const save = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    onSave(canvas.toDataURL('image/png'))
  }

  return (
    <div className="drawing-box">
      <div className="drawing-tools">
        {['#f5b8dc', '#ffffff', '#f6e5a8', '#a8e6cf', '#b9a5ff'].map(c => (
          <button
            key={c}
            type="button"
            className="drawing-color"
            style={{ background: c }}
            onClick={() => setColor(c)}
            aria-label={c}
          />
        ))}

        <input
          type="range"
          min="1"
          max="15"
          value={size}
          onChange={e => setSize(Number(e.target.value))}
        />

        <button type="button" onClick={clear}>
          지우기
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={600}
        height={300}
        onPointerDown={start}
        onPointerMove={draw}
        onPointerUp={stop}
        onPointerCancel={stop}
      />

      <button type="button" className="pink-button" onClick={save}>
        그림 저장하기
      </button>
    </div>
  )
}
