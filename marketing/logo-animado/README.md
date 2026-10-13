# Logo animado AD System — video de marketing

Composición [HyperFrames](https://hyperframes.heygen.com) (HTML/CSS + GSAP) con la
misma coreografía del logo que `src/components/ui/LogoAnimado.vue`: el SVG oficial
(`public/ADSystem/editable/LOGO.svg`) copiado inline, en dos proyectos (uno por
relación de aspecto) y dos colores de fondo por proyecto (variables en tiempo de
render). 4 videos en total, ~3 s cada uno:

| Archivo | Tamaño | Fondo | Logo |
|---|---|---|---|
| `square/renders/logo-blanco-1080x1080.mp4` | 1080×1080 | Blanco | Color (negro + granate) |
| `square/renders/logo-granate-1080x1080.mp4` | 1080×1080 | Granate `#8E1818` | Blanco (variación "Blanco" del manual) |
| `landscape/renders/logo-blanco-1920x1080.mp4` | 1920×1080 | Blanco | Color (negro + granate) |
| `landscape/renders/logo-granate-1920x1080.mp4` | 1920×1080 | Granate `#8E1818` | Blanco |

Ya están renderizados en este repo (carpetas `renders/` de cada proyecto). Si hace
falta volver a renderizarlos (por ejemplo tras editar la coreografía en
`square/index.html` o `landscape/index.html`), los 4 comandos exactos son:

```bash
# Requiere: Node.js, y FFmpeg en el PATH (local: winget install --id Gyan.FFmpeg -e)
# Chrome headless se descarga solo en el primer render (puppeteer-core).

cd marketing/logo-animado/square
npx hyperframes@0.8.150 render -o renders/logo-blanco-1080x1080.mp4 \
  --variables '{"fondo":"#FFFFFF","logoBlanco":false}'
npx hyperframes@0.8.150 render -o renders/logo-granate-1080x1080.mp4 \
  --variables '{"fondo":"#8E1818","logoBlanco":true}'

cd ../landscape
npx hyperframes@0.8.150 render -o renders/logo-blanco-1920x1080.mp4 \
  --variables '{"fondo":"#FFFFFF","logoBlanco":false}'
npx hyperframes@0.8.150 render -o renders/logo-granate-1920x1080.mp4 \
  --variables '{"fondo":"#8E1818","logoBlanco":true}'
```

Validar antes de re-renderizar (lint + runtime + contraste):

```bash
cd marketing/logo-animado/square   # o .../landscape
npx hyperframes@0.8.150 check
```

Ver fotogramas clave sin renderizar el video completo:

```bash
npx hyperframes@0.8.150 snapshot --at 0,0.3,0.6,0.9,1.2,1.5
```

## Coreografía (idéntica a `LogoAnimado.vue`)

1. **0 – 0,16 s** — contorno de la "D" + faceta interior granate: fade rápido (base del ícono).
2. **0,06 – 0,52 s** — 5 barras ascendentes: crecen desde abajo (`scaleY`), escalonadas de izquierda a derecha.
3. **0,48 – 0,91 s** — flecha de crecimiento: crece desde la cola y la punta hace un pequeño "pop" (overshoot calmado, sin librerías de física).
4. **0,82 – 1,10 s** — "A" en granate: fade + slide suave desde la izquierda.
5. **1,02 – 1,34 s** — wordmark "System": fade + slide hacia arriba, al final.

La animación termina ~1,34 s; el video (3 s) sostiene el último fotograma el resto
del tiempo — igual que el componente Vue, nunca repite la entrada completa.

## Variables (fondo / variación del logo)

Declaradas en `data-composition-variables` en cada `index.html`:

- `fondo` (color): color de fondo del canvas.
- `logoBlanco` (boolean): si es `true`, aplica `filter: brightness(0) invert(1)`
  al SVG completo — la variación "Blanco" del manual de marca (monocromática,
  sin el acento granate), para usar sobre el fondo granate de alto contraste.
  `brightness(0)` aplana negro+granate a negro puro **antes** de invertir; si
  solo se invirtiera, el granate `#8E1818` quedaría cian.

## Estructura

```
marketing/logo-animado/
  square/       proyecto HyperFrames 1080x1080 (index.html = la composición)
  landscape/    proyecto HyperFrames 1920x1080 (misma coreografía)
  README.md     este archivo
```

Cada proyecto es independiente (su propio `hyperframes.json`/`meta.json`/`package.json`,
generados por `hyperframes init`). No se tocó nada fuera de `marketing/` para esta tarea.
