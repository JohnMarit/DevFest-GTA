import * as THREE from 'three'
import { EVENT } from '../game/content'

const cache = new Map<string, THREE.CanvasTexture>()

function finish(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

let seed = 7
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 4294967296
}

export function labelTexture(text: string, bg: string, fg = '#ffffff', width = 512, height = 128) {
  const key = `${text}|${bg}|${fg}|${width}`
  const hit = cache.get(key)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const g = canvas.getContext('2d')
  if (!g) return finish(canvas)
  const r = height * 0.28
  g.fillStyle = bg
  g.beginPath()
  g.roundRect(0, 0, width, height, r)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.22)'
  g.beginPath()
  g.roundRect(8, 8, width - 16, height * 0.42, r * 0.7)
  g.fill()
  g.fillStyle = fg
  g.font = `800 ${Math.floor(height * 0.4)}px Outfit, sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, width / 2, height * 0.56, width - 36)
  const texture = finish(canvas)
  cache.set(key, texture)
  return texture
}

/** Road-sign board: solid colour, white border, text, and an arrow on the pointing side. */
export function signTexture(text: string, dir: 'left' | 'right' | 'up', bg = '#1f6f43', fg = '#ffffff') {
  const key = `sign|${text}|${dir}|${bg}|${fg}`
  const hit = cache.get(key)
  if (hit) return hit
  const width = 640
  const height = 112
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const g = canvas.getContext('2d')
  if (!g) return finish(canvas)
  g.fillStyle = bg
  g.beginPath()
  g.roundRect(0, 0, width, height, 14)
  g.fill()
  g.strokeStyle = 'rgba(255,255,255,0.85)'
  g.lineWidth = 6
  g.beginPath()
  g.roundRect(8, 8, width - 16, height - 16, 10)
  g.stroke()
  g.fillStyle = fg
  g.font = `800 ${Math.floor(height * 0.42)}px Outfit, sans-serif`
  g.textBaseline = 'middle'
  const arrow = dir === 'left' ? '←' : dir === 'right' ? '→' : '↑'
  g.font = `900 ${Math.floor(height * 0.6)}px Outfit, sans-serif`
  const arrowWidth = 84
  if (dir === 'right') {
    g.textAlign = 'right'
    g.fillText(arrow, width - 26, height / 2 + 4)
    g.font = `800 ${Math.floor(height * 0.4)}px Outfit, sans-serif`
    g.textAlign = 'left'
    g.fillText(text, 30, height / 2 + 2, width - arrowWidth - 60)
  } else {
    g.textAlign = 'left'
    g.fillText(arrow, 24, height / 2 + 4)
    g.font = `800 ${Math.floor(height * 0.4)}px Outfit, sans-serif`
    g.fillText(text, arrowWidth + 20, height / 2 + 2, width - arrowWidth - 50)
  }
  const texture = finish(canvas)
  cache.set(key, texture)
  return texture
}

/** Street name plate: white plate with dark text, blue top band like municipal plates. */
export function plateTexture(text: string) {
  const key = `plate|${text}`
  const hit = cache.get(key)
  if (hit) return hit
  const width = 512
  const height = 128
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const g = canvas.getContext('2d')
  if (!g) return finish(canvas)
  g.fillStyle = '#f7f5ef'
  g.beginPath()
  g.roundRect(0, 0, width, height, 10)
  g.fill()
  g.fillStyle = '#1a73e8'
  g.fillRect(0, 0, width, 26)
  g.fillStyle = '#ffffff'
  g.font = '700 18px Outfit, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('JUBA CITY COUNCIL', width / 2, 13)
  g.fillStyle = '#102033'
  g.font = '800 54px Outfit, sans-serif'
  g.fillText(text, width / 2, 80, width - 40)
  const texture = finish(canvas)
  cache.set(key, texture)
  return texture
}

export function windowTexture() {
  const hit = cache.get('windows')
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const g = canvas.getContext('2d')
  if (!g) return finish(canvas)
  g.fillStyle = '#a7c9da'
  g.fillRect(0, 0, 128, 128)
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 3; x += 1) {
      g.fillStyle = rand() > 0.3 ? '#dbeff7' : '#f6e4b8'
      g.beginPath()
      g.roundRect(10 + x * 40, 10 + y * 30, 26, 18, 4)
      g.fill()
    }
  }
  g.fillStyle = 'rgba(26,115,232,0.14)'
  g.fillRect(0, 0, 128, 128)
  const texture = finish(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  cache.set('windows', texture)
  return texture
}

export function sandTexture() {
  const hit = cache.get('sand')
  if (hit) return hit
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const g = canvas.getContext('2d')
  if (!g) return finish(canvas)
  g.fillStyle = '#e2c99b'
  g.fillRect(0, 0, size, size)
  for (let i = 0; i < 1800; i += 1) {
    const shade = rand()
    g.fillStyle = shade > 0.5 ? 'rgba(120,88,50,0.09)' : 'rgba(255,245,220,0.12)'
    const s = 1 + rand() * 1.6
    g.fillRect(rand() * size, rand() * size, s, s)
  }
  for (let i = 0; i < 14; i += 1) {
    g.fillStyle = 'rgba(110,80,50,0.12)'
    g.beginPath()
    g.ellipse(rand() * size, rand() * size, 2 + rand() * 4, 1.4 + rand() * 2, rand() * 3, 0, Math.PI * 2)
    g.fill()
  }
  const texture = finish(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(70, 52)
  cache.set('sand', texture)
  return texture
}

export function asphaltTexture() {
  const hit = cache.get('asphalt')
  if (hit) return hit
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const g = canvas.getContext('2d')
  if (!g) return finish(canvas)
  g.fillStyle = '#454a52'
  g.fillRect(0, 0, size, size)
  for (let i = 0; i < 4200; i += 1) {
    g.fillStyle = rand() > 0.5 ? 'rgba(20,22,26,0.25)' : 'rgba(170,176,186,0.14)'
    const s = 1 + rand() * 1.6
    g.fillRect(rand() * size, rand() * size, s, s)
  }
  g.fillStyle = 'rgba(0,0,0,0.12)'
  for (let i = 0; i < 6; i += 1) {
    g.beginPath()
    g.ellipse(rand() * size, rand() * size, 14 + rand() * 30, 4 + rand() * 8, rand() * 3, 0, Math.PI * 2)
    g.fill()
  }
  const texture = finish(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  cache.set('asphalt', texture)
  return texture
}

export function venueBanner() {
  const hit = cache.get('banner')
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 384
  const g = canvas.getContext('2d')
  if (!g) return finish(canvas)
  const grad = g.createLinearGradient(0, 0, 1024, 384)
  grad.addColorStop(0, '#fdf7ee')
  grad.addColorStop(1, '#e8eef9')
  g.fillStyle = grad
  g.fillRect(0, 0, 1024, 384)
  const stripe = ['#1a73e8', '#ea4335', '#f9ab00', '#34a853']
  stripe.forEach((color, i) => {
    g.fillStyle = color
    g.fillRect(i * 256, 0, 256, 16)
  })
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = '800 120px Outfit, sans-serif'
  g.fillStyle = '#f9ab00'
  g.fillText('{', 150, 150)
  g.fillStyle = '#34a853'
  g.fillText('}', 874, 150)
  g.fillStyle = '#102033'
  g.font = '800 96px Outfit, sans-serif'
  g.fillText('DEVFEST JUBA', 512, 140)
  g.fillStyle = '#1a73e8'
  g.font = '700 50px Outfit, sans-serif'
  g.fillText(EVENT.date.toUpperCase(), 512, 240)
  g.fillStyle = '#ea4335'
  g.font = '700 40px Outfit, sans-serif'
  g.fillText(`${EVENT.venue.toUpperCase()}  ·  JUBA`, 512, 310)
  const texture = finish(canvas)
  cache.set('banner', texture)
  return texture
}
