# Reporte de Fase 5: Reconstrucción Moderna en React + JavaScript + Vite + Tailwind CSS + JSON

**Proyecto:** *Costa Rica Pura Vida in Many Ways* (Ministerio de Educación Pública - MEP)  
**Fase:** 5 — Arquitectura e Implementación Frontend Moderna (Zero-Backend / 100% Estático)  
**Ubicación de la Aplicación:** `c:\xampp\htdocs\costa_rica_puravida_in_many_ways\app\`  

---

## 1. Resumen Ejecutivo

En esta **Fase 5** se completó la reconstrucción integral del videojuego educativo oficial del MEP *Costa Rica Pura Vida in Many Ways*, migrando desde el binario legado de Unity 2017.3.1f1 (WebGL IL2CPP `asm.js`) hacia una aplicación web moderna, responsiva y autónoma construida con **React 18 + JavaScript (ES2023) + Vite 6 + Tailwind CSS + Base de Conocimiento 100% JSON**.

### Hitos Principales Logrados:
1. **Arquitectura 100% Frontend sin Base de Datos ni Backend:**
   - Toda la lógica pedagógica, textos, diálogos, preguntas de trivia, recetas, glosario y manifiesto multimedia se alimentan directamente de los 7 archivos JSON estructurados en `app/src/data/`.
   - El progreso del estudiante se persiste automáticamente en `localStorage` respetando las claves originales del juego (`CRPVMW_monedas`, `CRPVMW_personaje`, `CRPVMW_location`, `CRPVMW_level_0` a `CRPVMW_level_7`), añadiendo además soporte para **Exportar / Importar partida en JSON**.
2. **Integración del 100% de Activos Originales Extraídos:**
   - Se integraron en `app/public/assets/` los **895 sprites PNG**, **334 texturas PNG**, **422 clips de audio M4A** (música regional, efectos de sonido y locuciones en inglés) y las **15 fuentes tipográficas TTF/OTF** (*Amaranth*, *Exo2*, *FredokaOne*, *Hanken*, *OpenSans*) declaradas mediante `@font-face` en `src/index.css`.
3. **Flujo Completo de Pantallas del Sistema (`level0` a `level10`):**
   - Reconstrucción fiel del **Menú Principal (`Main`)**, **Advertencia de Juego Nuevo (`NewGameWarning`)**, **Selección de Personaje (`SelecGenero`: Lisa y Mike con sus voces)**, **Conversación Introductoria con Daniel (`SelecScreen` con `Fungus.Say`)**, **Inicio de Aventura (`AdventureStart`)**, **Mapa Interactivo de Costa Rica (`MapaCostaRica`)**, **Glosario Bilingüe (`Glosario`)**, **Opciones de Audio (`Opciones`)**, **Créditos Oficiales (`Creditos`)** y **Secuencia Final de Victoria (`GameEnding` al alcanzar `21/21` piezas de estrella)**.
4. **Motor de Trivia `PopQuiz` (`PreguntaController`) con las 68 Preguntas Reales:**
   - Al viajar entre provincias en el mapa (`costo real en código: 5,000 monedas`, texto UI original `"You must spend 1000 coins to travel"`), se activa el modal de confirmación y el examen cultural `PopQuiz` con preguntas aleatorias de `popquiz.json`, reproducción de la locución en inglés (`questionAudio`), soporte nativo para selección única (`single`) y selección múltiple (`multiple`), y evaluación exacta `aciertos - errores >= minScore` con los efectos originales (`sfx 36` al aprobar y `sfx 37` al fallar).
5. **25 Motores Jugables de Minijuegos Regionales (`21` Oficiales + `4` Variantes Culturales Rescatadas):**
   - Cada minijuego cuenta con su **Pantalla `_Intro` Interactiva** (diálogos `Fungus.Say` con retratos de los anfitriones regionales, locución en inglés `.m4a` paso a paso e instrucciones de controles), seguida del **Minijuego Jugable** y la **Pantalla de Resultados (`Well done!`)** que otorga las monedas ganadas y desbloquea la pieza de estrella correspondiente (`starPieceIndex` `0`, `1` o `2`).

---

## 2. Estructura de Directorios de la Aplicación (`app/`)

```text
c:\xampp\htdocs\costa_rica_puravida_in_many_ways\app\
├── index.html                        # Punto de entrada HTML5
├── package.json                      # Dependencias y scripts (dev, build, preview)
├── vite.config.js                    # Configuración de Vite (@vitejs/plugin-react)
├── tailwind.config.js                # Configuración de Tailwind CSS y familias tipográficas
├── postcss.config.js                 # Configuración de PostCSS + Autoprefixer
├── public/
│   └── assets/                       # Activos originales servidos estáticamente
│       ├── audio/                    # 422 clips de audio .m4a (música, SFX y voces en inglés)
│       ├── fonts/                    # 15 archivos tipográficos .ttf / .otf originales
│       ├── sprites/                  # 895 sprites .png recortados del juego original
│       └── textures/                 # 334 atlas y texturas .png originales
└── src/
    ├── main.jsx                      # Bootstrap de React 18
    ├── App.jsx                       # Enrutador de pantallas y contenedor responsivo 960x620
    ├── index.css                     # Declaraciones @font-face y utilidades Tailwind CSS
    ├── utils/
    │   └── assetUrl.js               # Resolutor seguro de URLs con codificación URI para acentos/espacios
    ├── data/                         # Base de Conocimiento 100% JSON (Fases 1-4)
    │   ├── gameConfig.json           # Economía, personajes, audio, HUD y configuración global
    │   ├── provinces.json            # Las 7 provincias, bienvenidas, escudos y recompensas
    │   ├── popquiz.json              # Las 68 preguntas reales de trivia cultural en inglés
    │   ├── minigames.json            # Especificación de los 21 minijuegos + 4 variantes + 5 recetas
    │   ├── glossary.json             # 22 términos oficiales en 3 columnas + 15 términos extendidos
    │   ├── dialogues.json            # Bloques narrativos Fungus.Say y créditos oficiales
    │   └── assetsManifest.json       # Catálogo maestro de los 1,666 activos extraídos
    ├── context/
    │   ├── AudioContext.jsx          # Reproductor global Music_Handler + Sound_Handler + Voiceover
    │   └── GameContext.jsx           # Estado global, economía, 21 estrellas y persistencia localStorage
    └── components/
        ├── layout/
        │   └── AppShell.jsx          # App Shell a pantalla completa (Header fijo, Main con scroll selectivo, Footer MEP — GESPRO)
        ├── common/
        │   ├── TopHudBar.jsx         # Barra superior #479BD6 (Menú, Personaje, Monedas, Audio)
        │   ├── StarMeter.jsx         # Renderizador de estrella de 3 piezas (star_left, star_center, star_right)
        │   ├── FungusDialogBox.jsx   # Motor interactivo de diálogos Fungus.Say con filtro Lisa/Mike y voz .m4a
        │   └── GlobalModals.jsx      # Modales globales: PauseMenu, CancelGame y GameEnding
        ├── screens/
        │   ├── MainScreen.jsx        # Menú Principal (New Game, Continue, Glossary, Options, Credits)
        │   ├── OnboardingScreens.jsx # NewGameWarning, SelecGenero (Lisa/Mike), SelecScreen y AdventureStart
        │   ├── CostaRicaMapScreen.jsx# Mapa interactivo de las 7 provincias + Hub Provincial + Viajes
        │   ├── PopQuizModal.jsx      # Motor PreguntaController (68 preguntas single/multiple + audio)
        │   └── SystemScreens.jsx     # Glosario interactivo (3 columnas y tarjetas), Opciones y Créditos
        └── minigames/
            ├── MinigameRunner.jsx    # Orquestador de fases (_Intro -> _Play -> _Result) y entrega de estrellas
            ├── SanJoseMinigames.jsx  # Coffee Farming, Pre-Columbian Gold Museum, Whitewater Rafting
            ├── HerediaMinigames.jsx  # Delivering Flowers, Barva Mascarada, Bosque de la Hoja Mountain Bike
            ├── CartagoMinigames.jsx  # Sanatorio Durán (6 misterios), Volcanoes Control, Basílica Puzzle
            ├── AlajuelaMinigames.jsx # Laguna del Hule Triathlon (Ciclismo/Correr/Natación), Carretas Sarchí, Mariposario, Juan Santamaría
            ├── PuntarenasMinigames.jsx# Manuel Antonio (3 etapas), Paseo de los Turistas (Churchills), Río Tárcoles Cleanup
            ├── GuanacasteMinigames.jsx# Barra Honda Caverns, Playas del Coco Scuba Diving, Tamarindo Surf
            └── LimonMinigames.jsx    # Caribbean Cuisine (5 recetas y 34 ingredientes), Tortuguero Boat, Saving Sea Turtles
```

---

## 3. Detalle de los Motores Implementados

### 3.1. Motor de Estado y Persistencia (`src/context/GameContext.jsx`)
- **Compatibilidad Exacta con `PlayerPrefs` Originales:**
  - `CRPVMW_monedas`: Entero con las monedas del jugador (inicia en `5000`).
  - `CRPVMW_personaje`: `'1'` para **Lisa** (`female=true`) y `'0'` para **Mike** (`male=false`).
  - `CRPVMW_location`: Índice de provincia actual (`0` San José, `1` Heredia, `2` Cartago, `3` Alajuela, `4` Puntarenas, `5` Guanacaste, `6` Limón).
  - `CRPVMW_level_0` .. `CRPVMW_level_6`: Máscara de 3 caracteres (`"000"` a `"111"`) que representa las 3 piezas de estrella (*Left*, *Center*, *Right*) de cada provincia (`7 × 3 = 21` piezas de estrella).
  - `CRPVMW_level_7`: Estado de finalización del juego (`"000"` en progreso, `"111"` listo para mostrar la celebración `GameEnding` al volver al mapa, `"222"` celebración mostrada).

### 3.2. Motor de Audio Multicapa (`src/context/AudioContext.jsx`)
- **Canal de Música (`Music_Handler`):** Administra las 29 pistas musicales `.m4a` indexadas (`0..28`), evitando reinicios innecesarios al cambiar entre pantallas que comparten tema musical y respetando pistas sin bucle (`24`, `25`, `26`).
- **Canal de Efectos (`Sound_Handler`):** Reproduce de forma polifónica los 62 efectos de sonido `.m4a` indexados (`0..61`), incluyendo monedas (`35`), victoria/respuesta correcta (`36`), error/fallo (`37`), clic UI (`38`, `39`), obturador de cámara (`40`), brazadas de natación (`41`), interruptor de luz (`42`), raspado de hielo Churchill (`43`), recolección de café (`44`), motor de bote (`45`) y ovación de público (`47`).
- **Canal de Locución en Inglés (`Voiceover`):** Reproduce las locuciones pedagógicas de `Fungus.Say`, las 68 preguntas del `PopQuiz` y el pronunciador del `Glosario`, deteniendo automáticamente la locución anterior al avanzar de diálogo.

### 3.3. Catálogo de los 25 Minijuegos Jugables (`src/components/minigames/`)

| Provincia | ID de Escena | Título del Minijuego | Pieza de Estrella | Mecánica Interactiva Implementada |
| :--- | :--- | :--- | :---: | :--- |
| **0. San José** | `SJ_FincaCafetalera` | *Coffee Farming* | `0` (Left) | Recolección de café maduro rojo (`+10`) y amarillo (`+5`) evitando verde/negro (`-5`), límite de canasta (`12`) con alerta `"Your basket is full !"` y entrega en el `Recibidor`. |
| **0. San José** | `SJ_Museo_Oro` | *Gold Museum* | `1` (Center) | Recorrido por las 4 salas subterráneas bajo la Plaza de la Cultura con Maricela, doble guía de audio en inglés por sala, monedas numismáticas ocultas y verificación cultural. |
| **0. San José** | `SJ_Rafting` | *Whitewater Rafting* | `2` (Right) | Descenso en balsa por 5 carriles de rápidos esquivando rocas y troncos mientras se recolectan monedas (`+50`). |
| **1. Heredia** | `HD_Entregar_Flores` | *Delivering Flowers* | `0` (Left) | Entrega de 5 arreglos florales desde la floristería de Daniela Rose escuchando las pistas de audio en inglés y ubicando cada destino en el mapa urbano de Heredia. |
| **1. Heredia** | `HD_Mascarada` | *Barva Masquerade* | `1` (Center) | Carrera festiva por las calles de Barva escapando de *La Giganta*, saltando obstáculos y recogiendo monedas hasta la plaza. |
| **1. Heredia** | `HD_Mountainbike` | *Mountain Biking* | `2` (Right) | Ciclismo de montaña por los 3 senderos de cipreses del Bosque de la Hoja esquivando rocas y recolectando monedas. |
| **2. Cartago** | `CT_Sanatorio_Duran` | *Sanatorio Durán* | `0` (Left) | Exploración con cono de linterna interactivo resolviendo los 6 misterios e hitos históricos del Sanatorio Carlos Durán (1918) con efectos `31`, `32` y `42`. |
| **2. Cartago** | `CT_Volcanes` | *Volcanoes of Cartago* | `1` (Center) | Control geotérmico de presión en tiempo real de los 5 volcanes (*Irazú, Turrialba, Poás, Arenal, Rincón de la Vieja*) evitando que lleguen al 100% de erupción. |
| **2. Cartago** | `CT_Volcanes2` | *Volcanoes of Costa Rica II* | `2` (Right) | Segunda misión volcánica y de cordilleras con control sísmico y fichas educativas de altitud y cráteres. |
| **2. Cartago** | `CT_Basilica_Angeles` | *Basílica de los Ángeles* | Bonus | Rompecabezas arquitectónico interactivo (`3x3` / 9 piezas) con botón de pista (*Pista*) y reseña cultural de *La Negrita* y la Romería del 2 de agosto. |
| **3. Alajuela** | `AL_Ciclismo` | *Triathlon: Cycling* | `0` (Left) | Carrera de ciclismo contra 6 rivales (7 competidores, `PosicionController` `1st..7th`), barra de energía/hidratación, sprint y premios de podio (`1000/500/100/50`). |
| **3. Alajuela** | `AL_Correr` | *Triathlon: Running* | `1` (Center) | Carrera pedestre contra 6 competidores en las faldas del Poás con recolección de botellas de hidratación y salto de vallas. |
| **3. Alajuela** | `Al_Natacion` | *Triathlon: Swimming* | `2` (Right) | Natación en aguas abiertas en la Laguna del Hule contra 6 rivales con audio de brazada (`sfx 41`) y ovación en meta (`sfx 47`). |
| **3. Alajuela** | `AL_Carretas` | *Carretas de Sarchí* | Bonus | Taller artesanal (`PintarCarretaController`): memoriza durante 5s el patrón geométrico de la rueda de carreta típica y píntala con la paleta de 6 colores. |
| **3. Alajuela** | `AL_Mariposario` | *Butterfly Sanctuary* | Bonus | Observación y clasificación científica de mariposas tropicales (*Blue Morpho*, *Glasswing / Espejitos*, *Owl Butterfly*). |
| **3. Alajuela** | `AL_Juan_Santamaria` | *Battle of Rivas 1856* | Bonus | Misión histórica sobre el Héroe Nacional Juan Santamaría (*El Erizo*) y la quema del Mesón de Guerra el 11 de abril de 1856. |
| **4. Puntarenas**| `PR_Manuel_Antonio` | *Manuel Antonio Park* | `0` (Left) | Aventura en 3 etapas: 1) Recolectar 10 frutas/conchas y el tronco, 2) Reparar el puente del río, 3) Seguir las pistas en inglés del Guardaparques para fotografiar a los monos cara blanca. |
| **4. Puntarenas**| `PR_Paseo_Turistas` | *Churchill Express* | `1` (Center) | Gestión en el Paseo de los Turistas preparando Churchills en el carrito de Don Luis Araya (`sfx 43` `raspar.m4a`, máx. 5 en bandeja) y entregándolos a los turistas (`+200` monedas c/u). |
| **4. Puntarenas**| `PR_Tarcoles` | *Clean Tárcoles River* | `2` (Right) | Limpieza ecológica del Río Tárcoles recogiendo bolsas plásticas (`basura.png`) entre los canales mientras se esquivan cocodrilos americanos (`hasta 5,000 monedas`). |
| **5. Guanacaste**| `GN_BarraHonda` | *Barra Honda Caverns* | `0` (Left) | Espeleología por los 3 niveles de las cavernas calcáreas de Barra Honda esquivando murciélagos (`GNBH_Bat01.png`) y estalactitas. |
| **5. Guanacaste**| `GN_Buceo` | *Playas del Coco Scuba* | `1` (Center) | Fotografía submarina (`sfx 40` `Camara V4.m4a`) sumando puntos por Tiburón (`+3`), Mantarraya (`+2`) y Peces de arrecife (`+1`) evitando medusas (`-2`). |
| **5. Guanacaste**| `GN_Surf_Tamarindo` | *Tamarindo Surfing* | `2` (Right) | Surf en las olas de Tamarindo maniobrando entre la cresta, el tubo y la base de la ola para recoger monedas y esquivar rocas de arrecife. |
| **6. Limón** | `Lm_Cocina` | *Caribbean Cuisine* | `0` (Left) | Cocina afrocaribeña interactiva con las **5 recetas reales** (*Rice and Bean, Patty, Rondón, Agua de Sapo, Pan Bon*), despensa de **34 ingredientes con sus sprites originales**, olla de cocción y botón de pista. |
| **6. Limón** | `LM_Tortuguero` | *Tortuguero Canal Boat* | `1` (Center) | Navegación en bote (`bote down_0.png`, `sfx 45`) por los canales de Tortuguero con **Nitro Boost** (`Space`), esquivando troncos hasta encontrar y fotografiar al Manatí del Caribe. |
| **6. Limón** | `LM_Desove` | *Saving Sea Turtles* | `2` (Right) | Defensa ecológica de las 10 tortugas verdes bebé (`Tortu_pequenna-Sheet_7.png`) en la playa de Tortuguero espantando con clic a los zopilotes depredadores (`vulture-Sheet_0.png`) hasta llegar al mar. |

---

## 4. Comandos de Ejecución y Despliegue

Dentro de `c:\xampp\htdocs\costa_rica_puravida_in_many_ways\app\`:

```powershell
# 1. Iniciar servidor de desarrollo interactivo (Hot Module Replacement)
npm.cmd run dev

# 2. Compilar versión optimizada de producción en app/dist/
npm.cmd run build

# 3. Previsualizar el build estático de producción
npm.cmd run preview
```

---

## 5. Certificación de Compilación (`vite build`)

Se ejecutó `npm.cmd run build` dentro de `c:\xampp\htdocs\costa_rica_puravida_in_many_ways\app\`, obteniendo una compilación limpia con **0 errores**:

```text
> costa-rica-pura-vida-in-many-ways@2.0.0 build
> vite build

vite v6.4.6 building for production...
transforming...
✓ 1604 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.63 kB │ gzip:   0.41 kB
dist/bundle/index-B1rdlVgW.css   70.02 kB │ gzip:  11.09 kB
dist/bundle/index-DU2RyopN.js   716.74 kB │ gzip: 164.97 kB
✓ built in 8.60s
```

