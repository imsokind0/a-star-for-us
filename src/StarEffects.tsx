
import { useEffect } from 'react'
import './StarEffects.css'

export default function StarEffects() {
  useEffect(() => {
    const createStar = (x: number, y: number, burst = false) => {
      const star = document.createElement('span')

      star.className = burst ? 'cursor-star burst-star' : 'cursor-star'
      star.textContent = ['✦', '✧', '⋆', '★'][Math.floor(Math.random() * 4)]

      star.style.left = `${x}px`
      star.style.top = `${y}px`

      if (burst) {
        star.style.setProperty('--dx', `${(Math.random() - 0.5) * 140}px`)
        star.style.setProperty('--dy', `${(Math.random() - 0.5) * 140}px`)
      }

      document.body.appendChild(star)

      setTimeout(() => star.remove(), burst ? 800 : 600)
    }

    const onMove = (e: MouseEvent) => {
      if (Math.random() > 0.55) {
        createStar(e.clientX, e.clientY)
      }
    }

    const onClick = (e: MouseEvent) => {
      for (let i = 0; i < 10; i++) {
        createStar(e.clientX, e.clientY, true)
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('click', onClick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('click', onClick)
    }
  }, [])

  return null
}
