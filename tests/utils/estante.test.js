import { describe, it, expect } from 'vitest'
import {
  normalizarTexto, buscarCoincidencia, cajaAPixeles, tamanoRecorte,
  armarTarjetas, tarjetasNuevas, construirAjustes, resumenEstante, MAX_PRODUCTOS_ESTANTE
} from '@/utils/estante'

const inv = [
  { id: 'a', name: 'Harina PAN 1 kg', marca: 'PAN', stock: 6, codigo_barras: '7591234567890', atributos: { presentacion: '1 kg' } },
  { id: 'b', name: 'Aceite Mazeite 1 L', stock: 2, atributos: {} },
  { id: 'c', name: 'Corte de cabello', tipo: 'servicio', stock: 0 },
  { id: 'd', name: 'Arroz Mary 1 kg', deleted_at: '2026-01-01', stock: 3 }
]

describe('normalizarTexto', () => {
  it('quita tildes, signos y mayúsculas', () => {
    expect(normalizarTexto('  Acetaminofén 500 mg. ')).toBe('acetaminofen 500 mg')
    expect(normalizarTexto(null)).toBe('')
  })
})

describe('buscarCoincidencia', () => {
  it('por código de barras', () => {
    expect(buscarCoincidencia({ nombre: 'otra cosa', codigo_barras: '7591234567890' }, inv).producto.id).toBe('a')
  })
  it('por nombre normalizado', () => {
    const r = buscarCoincidencia({ nombre: 'harina pan 1 KG' }, inv)
    expect(r.producto.id).toBe('a')
    expect(r.motivo).toBe('nombre')
  })
  it('por marca + presentación', () => {
    const r = buscarCoincidencia({ nombre: 'Harina de maíz precocida', marca: 'PAN', presentacion: '1 kg' }, inv)
    expect(r.producto.id).toBe('a')
    expect(r.motivo).toBe('marca')
  })
  it('por palabras parecidas (mínimo 2)', () => {
    expect(buscarCoincidencia({ nombre: 'Aceite Mazeite' }, inv).producto.id).toBe('b')
    expect(buscarCoincidencia({ nombre: 'Aceite' }, inv)).toBeNull()
  })
  it('ignora servicios y eliminados', () => {
    expect(buscarCoincidencia({ nombre: 'Corte de cabello' }, inv)).toBeNull()
    expect(buscarCoincidencia({ nombre: 'Arroz Mary 1 kg' }, inv)).toBeNull()
  })
  it('sin datos devuelve null', () => {
    expect(buscarCoincidencia(null, inv)).toBeNull()
    expect(buscarCoincidencia({ nombre: 'x' }, [])).toBeNull()
  })
})

describe('cajaAPixeles', () => {
  it('convierte 0–1000 a píxeles con margen', () => {
    const r = cajaAPixeles([100, 200, 500, 600], 1000, 2000, 0)
    expect(r).toEqual({ x: 200, y: 200, w: 400, h: 800 })
  })
  it('el margen crece sin salirse de la imagen', () => {
    const r = cajaAPixeles([0, 0, 1000, 500], 1000, 1000, 0.1)
    expect(r.x).toBe(0)
    expect(r.y).toBe(0)
    expect(r.w).toBe(550)
    expect(r.h).toBe(1000)
  })
  it('rechaza cajas inválidas', () => {
    expect(cajaAPixeles(null, 100, 100)).toBeNull()
    expect(cajaAPixeles([500, 500, 400, 600], 1000, 1000)).toBeNull()
    expect(cajaAPixeles([0, 0, 5, 5], 1000, 1000)).toBeNull()
    expect(cajaAPixeles(['a', 0, 1, 1], 1000, 1000)).toBeNull()
    expect(cajaAPixeles([0, 0, 500, 500], 0, 100)).toBeNull()
  })
  it('recorta valores fuera de rango', () => {
    const r = cajaAPixeles([-50, -50, 1200, 1200], 100, 100, 0)
    expect(r).toEqual({ x: 0, y: 0, w: 100, h: 100 })
  })
})

describe('tamanoRecorte', () => {
  it('no agranda y reduce al máximo', () => {
    expect(tamanoRecorte(400, 300)).toEqual({ w: 400, h: 300 })
    expect(tamanoRecorte(1600, 800)).toEqual({ w: 800, h: 400 })
  })
})

describe('tarjetas y ajustes', () => {
  const ia = [
    { nombre: 'Harina PAN 1 kg', cantidad_visible: 4, confianza: 'alta' },
    { nombre: 'Galletas Oreo', cantidad_visible: 0, confianza: 'media' },
    { nombre: 'Algo borroso', cantidad_visible: 2, confianza: 'baja' }
  ]
  const t = armarTarjetas(ia, inv)

  it('arma tarjetas: existente, nuevo y de baja confianza omitida', () => {
    expect(t).toHaveLength(3)
    expect(t[0].coincidencia.id).toBe('a')
    expect(t[1].coincidencia).toBeNull()
    expect(t[1].cantidad).toBe(1)
    expect(t[2].incluir).toBe(false)
  })

  it('limita a 40 productos', () => {
    const muchos = Array.from({ length: 55 }, (_, i) => ({ nombre: `P${i}`, confianza: 'alta' }))
    expect(armarTarjetas(muchos, [])).toHaveLength(MAX_PRODUCTOS_ESTANTE)
  })

  it('nuevos: solo incluidos sin coincidencia', () => {
    expect(tarjetasNuevas(t).map(x => x.nombre)).toEqual(['Galletas Oreo'])
  })

  it('ajustes: antes → después y delta', () => {
    const [a] = construirAjustes(t)
    expect(a).toMatchObject({ antes: 6, despues: 4, delta: -2 })
    expect(a.producto.id).toBe('a')
  })

  it('resumen cuenta nuevos y ajustes reales (delta distinto de 0)', () => {
    expect(resumenEstante(t)).toEqual({ nuevos: 1, ajustes: 1, incluidos: 2 })
    t[0].cantidad = 6
    expect(resumenEstante(t).ajustes).toBe(0)
  })

  it('omitir una tarjeta la saca de las acciones', () => {
    t[1].incluir = false
    expect(resumenEstante(t).nuevos).toBe(0)
  })
})
