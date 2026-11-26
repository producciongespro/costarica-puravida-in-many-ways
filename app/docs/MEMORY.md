# Memoria del Proyecto (`MEMORY.md`)

## Información General
- **Proyecto:** Reingeniería Inversa de *Costa Rica Pura Vida in Many Ways* (MEP)
- **URL Original:** https://recursos.mep.go.cr/costa-rica-pura-vida-in-many-ways/
- **Tecnología Original:** Unity WebGL (~2018)
- **Stack Destino Acordado:** **React + JavaScript + Vite + Tailwind CSS + JSON** (100% Client-Side, sin base de datos ni backend).

---

## Bitácora de Decisiones y Avances

### [2026-11-17] 1. Definición de Viabilidad y Equipo de Subagentes
- Se validó la viabilidad técnica al 100% para recuperar todos los recursos multimedia (`*.data.unityweb`) y la estructura lógica/metadatos C# (`global-metadata.dat` + `.wasm`) del juego original en Unity WebGL.
- Se definió un equipo de 6 subagentes especializados (`webgl-extractor`, `asset-archaeologist`, `il2cpp-reverser`, `gameplay-analyst`, `lead-reconstructor`, `qa-documenter`).
- Documentado en: `app/docs/01_EQUIPO_Y_VIABILIDAD_REINGENIERIA.md`.

### [2026-11-17] 2. Convenio de Estructura de Carpetas del Proyecto
- **`documentacion/`:** Carpeta exclusiva del usuario/sponsor. **Estrictamente intocable** por los agentes salvo indicación expresa para leer algún recurso puntual.
- **`app/`:** Carpeta de implementación y desarrollo del proyecto. Contiene `AGENTS.md` con los contratos y convenios de desarrollo.
- **`app/docs/`:** **Única Fuente de Verdad** del proyecto. Contiene toda la documentación técnica numerada y este archivo `MEMORY.md`.

### [2026-11-17] 3. Definición del Stack Destino y Plan de Ejecución
- El usuario definió el stack objetivo para la reconstrucción: **React + JavaScript + Vite + Tailwind CSS + JSON**, sin bases de datos ni backend.
- Se elaboró el plan maestro de ejecución en 6 fases dentro de `app/docs/02_PLAN_EJECUCION_REINGENIERIA.md` y se formalizaron los contratos en `app/AGENTS.md`.

### [2026-11-17] 4. Fase 1 Completada (`webgl-extractor`) e Inicio Paralelo de Fases 2 y 3
- **`webgl-extractor` completó la Fase 1 con éxito:**
  - Se descargaron los paquetes originales `.unityweb` desde `https://recursos.mep.go.cr/costa-rica-pura-vida-in-many-ways/` en `app/reverse_engineering/raw_build/`.
  - Se desempaquetó el contenedor `UnityWebData1.0` (`96.47 MB`) y el paquete interno `UnityFS` `data.unity3d` (`318.25 MB` en 2,429 bloques LZ4HC) hacia `app/reverse_engineering/unpacked_data/`.
  - **Hallazgos técnicos clave:**
    - Versión exacta del motor: **Unity `2017.3.1f1`** (`SerializedFile` v17, compilación IL2CPP a `asm.js`).
    - **54 escenas** (`level0` a `level53`) y **54 archivos de assets** (`sharedassets0.assets` a `sharedassets53.assets`).
    - **40 bancos multimedia `.resource`** con streams de audio/video MP4 (`ftypmp42`).
    - **`global-metadata.dat`** (`4.39 MB`, IL2CPP Metadata v24) + `methods_pointedto_by_uievents.xml` (`73 KB`) + `build.asm.js` (`35.9 MB`).
  - Documentado en: `app/docs/03_REPORTE_FASE1_EXTRACCION_WEBGL.md`.
- **Estado actual:** Se lanzaron en paralelo la **Fase 2 (`asset-archaeologist`)** y la **Fase 3 (`il2cpp-reverser`)** para extraer todos los sprites, audios, fuentes, jerarquías de las 54 escenas y el código C# (`dump.cs` y strings).

### [2026-11-17] 5. Fase 2 Completada (`asset-archaeologist`)
- **`asset-archaeologist` completó la Fase 2 al 100%**, extrayendo todos los activos en `app/reverse_engineering/extracted_assets/` y documentando el catálogo en `app/docs/04_REPORTE_FASE2_CATALOGO_ASSETS_Y_ESCENAS.md`:
  - **54 Escenas Identificadas (`scenes_index.json`):**
    - 12 escenas de sistema/flujo (`Main`, `Login`, `LoginContinue`, `NewGameWarning`, `SelecScreen`, `SelecGenero`, `AdventureStart`, `MapaCostaRica`, `Glosario`, `Creditos`, `Opciones`).
    - 42 escenas correspondientes a **21 minijuegos regionales** (7 provincias × 3 minijuegos por provincia, cada uno con escena `_Intro` + escena jugable):
      - **Alajuela:** `AL_Ciclismo`, `AL_Correr`, `AL_Natacion`
      - **Cartago:** `CT_Sanatorio_Duran`, `CT_Volcanes`, `CT_Volcanes2`
      - **Guanacaste:** `GN_BarraHonda`, `GN_Buceo`, `GN_Surf_Tamarindo`
      - **Heredia:** `HD_Entregar_Flores`, `HD_Mascarada`, `HD_Mountainbike`
      - **Limón:** `Lm_Cocina`, `LM_Tortuguero`, `LM_Desove`
      - **Puntarenas:** `PR_Manuel_Antonio`, `PR_Paseo_Turistas`, `PR_Tarcoles`
      - **San José:** `SJ_FincaCafetalera`, `SJ_Museo_Oro`, `SJ_Rafting`
  - **Activos Multimedia Recuperados sin Pérdida:**
    - **334 Texturas PNG** (`textures/` + `textures_catalog.json`)
    - **895 Sprites PNG recortados individualmente** (`sprites/` + `sprites_catalog.json`)
    - **422 Audios `.m4a` AAC** (`audio/` + `audio_catalog.json`)
    - **15 Fuentes tipográficas `.otf` y `.ttf`** (`fonts/` + `fonts_catalog.json`: *Amaranth*, *Exo2*, *Hanken*, *FredokaOne*, *OpenSans*)
    - **68 Preguntas completas de trivia `PopQuiz`** (`popquiz_database.json`) y **380 líneas de diálogo `Fungus.Say`** (`fungus_dialogues.json`).
    - **Jerarquía completa de las 54 escenas** (`14,557 GameObjects`, `16,592 MonoBehaviours`, `1,079 MonoScripts`).
- **Estado actual:** Esperando la finalización de `il2cpp-reverser` (Fase 3) para iniciar la Fase 4 (`gameplay-analyst`).

### [2026-11-17] 6. Fase 3 Completada (`il2cpp-reverser`) e Inicio de Fase 4 (`gameplay-analyst`)
- **`il2cpp-reverser` completó la Fase 3 al 100%**, generando los artefactos en `app/reverse_engineering/reverse_code/` y el informe técnico en `app/docs/05_REPORTE_FASE3_LOGICA_IL2CPP_Y_CLASES.md`:
  - **`dump.cs` (`22,758` líneas):** Reconstrucción completa de las **1,133 clases C#** (`Assembly-CSharp.dll` y `Assembly-CSharp-firstpass.dll`).
  - **`string_literals.json`:** Extracción del 100% de los **5,491 String Literals** de `global-metadata.dat`.
  - **`ui_events_map.json`:** Mapeo de eventos de botones e interfaz en 25 escenas desde `methods_pointedto_by_uievents.xml`.
  - **`game_only_decompiled.txt` (`16,253` líneas):** Decompilación estática anotada de `build.asm.js`.
  - **Reglas de Negocio Reconstruidas:**
    - Estado global `GameControl` con persistencia en `CRPVMW_monedas` (inicia en `5,000`), `CRPVMW_personaje` (`Lisa` / `Mike`), `CRPVMW_location` (`0..6`) y `CRPVMW_level_0..7` (**21 piezas de estrella** en 7 provincias + estado de victoria `GameEnding`).
    - Viajes entre provincias (`costoViaje = 5,000` monedas) condicionados por trivia en inglés (`PopQuiz` + `PreguntaController`, preguntas de selección única o múltiple con audio).
    - Mecánicas exactas, tiempos, costos de pistas y fórmulas de recompensa en monedas de los **21 minijuegos regionales**.
- **Estado actual:** `gameplay-analyst` se encuentra ejecutando la **Fase 4**, generando la base de datos estática en `app/src/data/*.json` y el GDD inverso en `app/docs/06_REPORTE_FASE4_GDD_INVERSO_Y_DATOS_JSON.md`.

### [2026-11-17] 7. Fase 4 Completada (`gameplay-analyst`) e Inicio de Fase 5 (`lead-reconstructor`)
- **`gameplay-analyst` completó la Fase 4 al 100%:**
  - Creó el script `app/reverse_engineering/build_json_database.mjs`, corrigiendo la alineación binaria de `FontData` (`+56` bytes) en `level0..level53` para recuperar el 100% de los textos `UnityEngine.UI.Text` y extrayendo de `level0` las 29 pistas musicales (`Music_Handler.Songs`) y los 62 efectos/voces (`Sound_Handler.sounds`).
  - Generó la **Base de Conocimiento 100% en JSON (`1.20 MB` en `app/src/data/`)**:
    - `gameConfig.json` (`29.9 KB`), `provinces.json` (`26.1 KB`), `popquiz.json` (`188.8 KB`), `minigames.json` (`325.7 KB`), `glossary.json` (`36.2 KB`), `dialogues.json` (`191.7 KB`) y `assetsManifest.json` (`402.6 KB`).
  - Documentó el GDD Inverso completo en `app/docs/06_REPORTE_FASE4_GDD_INVERSO_Y_DATOS_JSON.md`.
- **Estado actual:** Se dio paso a `lead-reconstructor` para la **Fase 5**.

### [2026-11-17] 8. Fase 5 Completada (`lead-reconstructor`) e Inicio de Fase 6 (`qa-documenter`)
- **`lead-reconstructor` completó la Fase 5 al 100%**, construyendo la aplicación web moderna en `c:\xampp\htdocs\costa_rica_puravida_in_many_ways\app\`:
  - **Stack Implementado:** React 18 + JavaScript (ES2023) + Vite 6 + Tailwind CSS + Base de Conocimiento 100% JSON (`app/src/data/*.json`), 100% Client-Side sin base de datos ni backend.
  - **Activos Integrados en `app/public/assets/`:** `895` sprites `.png`, `334` texturas `.png`, `422` clips de audio `.m4a` y `15` fuentes `.ttf/.otf` (`1,666` archivos físicos en total).
  - **Componentes Implementados:**
    - `GameContext.jsx` (persistencia en `localStorage` compatible 1:1 con `CRPVMW_*` + Exportar/Importar JSON) y `AudioContext.jsx` (`MusicHandler` 29 pistas, `SoundHandler` 62 efectos y `VoicePlayer` `Fungus.Say`).
    -Las 12 pantallas del sistema (`Main`, `NewGameWarning`, `SelecGenero`, `SelecScreen`, `AdventureStart`, `MapaCostaRica`, `PopQuiz`, `Glosario`, `Opciones`, `Creditos`, `GameEnding`).
    - Los **25 motores de minijuegos regionales** (`21` oficiales de campaña + `4` variantes culturales/históricas rescatadas) con su pantalla `_Intro` interactiva (`Fungus.Say`), juego activo y modal de resultados (`Well done!`).
  - Documentado en: `app/docs/07_REPORTE_FASE5_ARQUITECTURA_REACT_VITE.md`.

### [2026-11-17] 9. Fase 6 Completada (`qa-documenter`) — Auditoría QA 1:1, Cero Enlaces Rotos y Cierre del Proyecto
- **`qa-documenter` completó la Fase 6 al 100%**, certificando la integridad total del proyecto:
  - **Auditoría Automatizada (`app/reverse_engineering/audit_phase6_qa.mjs`):**
    - Verificación física de los `1,666` activos en `app/public/assets/`.
    - **`3,930` referencias en `app/src/data/*.json`:** `3,930` coincidencias exactas, `0` diferencias de mayúsculas/minúsculas, `0` rutas rotas (tras corregir `MASTER MENU MIKE OO3.m4a` en `gameConfig.json` y vincular las 58 locuciones `.m4a` reales en `glossary.json` y `build_json_database.mjs`).
    - **`145` referencias en `app/src/**/*.{js,jsx,css}`:** `145` coincidencias exactas, `0` diferencias de mayúsculas/minúsculas, `0` rutas rotas (tras alinear todas las rutas de sprites y locuciones en `MinigameRunner.jsx`, `SanJoseMinigames.jsx`, `HerediaMinigames.jsx`, `CartagoMinigames.jsx`, `PuntarenasMinigames.jsx`, `GuanacasteMinigames.jsx`, `LimonMinigames.jsx`, `SystemScreens.jsx` y `CostaRicaMapScreen.jsx`).
    - **`113` llamadas `playSfx(index)`:** `113` válidas contra los índices reales de `SoundHandler`, `0` inválidas.
    - **Compilación de producción (`npm.cmd run build`):** Exitosa en `app/dist/` con **0 errores** (`1,604` módulos transformados).
  - Documentado en: `app/docs/08_REPORTE_FASE6_AUDITORIA_QA_Y_MANUAL.md`.
- **Estado Final del Proyecto:** **COMPLETADO AL 100% (Fases 1 a 6 Cerradas y Certificadas).**

### [2026-11-26] 10. Depuración de Interfaz Principal para Fidelidad 1:1 con el Original
- Se eliminaron elementos añadidos en la reconstrucción que no existían en la versión original de Unity WebGL (2018):
  - **Panel derecho *Costa Rica Passport*** y **barra flotante inferior** (*"Click [Provincia] to play..."* + accesos duplicados) en `app/src/components/screens/CostaRicaMapScreen.jsx`, dejando el mapa a ancho completo.
  - **Barra superior (`TopHudBar.jsx`):** eliminados el contador global `X / 21` y el botón rápido `Keywords` (el glosario sigue accesible desde el Menú Principal, igual que en el original).
  - **Modo Docente / Explorador MEP (`MEP Mode`)**: eliminado el botón en `TopHudBar.jsx`, el modal `TeacherDebugPanel` en `GlobalModals.jsx`, los estados `showTeacherPanel` / `teacherFreeTravel` en `GameContext.jsx` y el botón `★ Quick Complete` en `MinigameRunner.jsx`.
- Se depuró la documentación en `app/docs/07_REPORTE_FASE5_ARQUITECTURA_REACT_VITE.md`, `app/docs/08_REPORTE_FASE6_AUDITORIA_QA_Y_MANUAL.md` y este archivo `MEMORY.md`.

### [2026-11-26] 11. Implementación de App Shell Institucional (`AppShell.jsx`)
- Se implementó `app/src/components/layout/AppShell.jsx` a pantalla completa (`h-dvh w-screen overflow-hidden flex flex-col`):
  - **Encabezado fijo (`TopHudBar.jsx`):** Contextual (en `MapaCostaRica` y `Minigame` muestra menú hamburguesa, personaje/provincia, monedas, audio y salir; en pantallas de inicio/sistema muestra identidad y control de audio).
  - **Área central (`<main>`):** Scroll selectivo (`overflow-hidden` en `MapaCostaRica` y `Minigame`, `overflow-y-auto` en pantallas informativas).
  - **Pie de página fijo y compacto (`h-8`):** `Ministerio de Educación Pública — GESPRO`.
- Se limpió el botón flotante residual de `MEP Mode` en `app/src/App.jsx`.

### [2026-11-26] 12. Secuencia de Inicio 1:1 (Splash Screen 4s + Menú Principal)
- Se creó `app/src/components/screens/SplashScreen.jsx` con fondo negro (`#000000`), el logo original `textures/Logo Costa Rica Loading B.png` y animación `splashZoom` de **4 segundos** antes de mostrar el menú principal.
- Se limpió `app/src/components/screens/MainScreen.jsx` para igualar 1:1 al original: solo fondo `sprites/fondo.png`, logo central `sprites/Logo Costa Rica Final Grande.png` y los dos botones `New Game` y `Continue` (`sprites/boton_2.png`), eliminando logo MEP superior, botón de Modo Docente, barra de progreso guardado y botones inferiores de Glosario/Opciones/Créditos.

---

## Índice Completo de Documentación Técnica (`app/docs/`)
1. [`01_EQUIPO_Y_VIABILIDAD_REINGENIERIA.md`](./01_EQUIPO_Y_VIABILIDAD_REINGENIERIA.md) — Estudio de viabilidad y arquitectura de subagentes.
2. [`02_PLAN_EJECUCION_REINGENIERIA.md`](./02_PLAN_EJECUCION_REINGENIERIA.md) — Plan maestro de ejecución en 6 fases.
3. [`03_REPORTE_FASE1_EXTRACCION_WEBGL.md`](./03_REPORTE_FASE1_EXTRACCION_WEBGL.md) — Desempaquetado de contenedores `.unityweb` y `data.unity3d` (Unity 2017.3.1f1).
4. [`04_REPORTE_FASE2_CATALOGO_ASSETS_Y_ESCENAS.md`](./04_REPORTE_FASE2_CATALOGO_ASSETS_Y_ESCENAS.md) — Extracción y catálogo de 54 escenas, 895 sprites, 334 texturas, 422 audios y 15 fuentes.
5. [`05_REPORTE_FASE3_LOGICA_IL2CPP_Y_CLASES.md`](./05_REPORTE_FASE3_LOGICA_IL2CPP_Y_CLASES.md) — Ingeniería inversa de `global-metadata.dat`, `dump.cs` (1,133 clases C#) y `build.asm.js`.
6. [`06_REPORTE_FASE4_GDD_INVERSO_Y_DATOS_JSON.md`](./06_REPORTE_FASE4_GDD_INVERSO_Y_DATOS_JSON.md) — Documento de Diseño de Juego (GDD) Inverso y Base de Datos Estática en JSON (`app/src/data/*.json`).
7. [`07_REPORTE_FASE5_ARQUITECTURA_REACT_VITE.md`](./07_REPORTE_FASE5_ARQUITECTURA_REACT_VITE.md) — Arquitectura e implementación frontend en React 18 + Vite 6 + Tailwind CSS + JSON.
8. [`08_REPORTE_FASE6_AUDITORIA_QA_Y_MANUAL.md`](./08_REPORTE_FASE6_AUDITORIA_QA_Y_MANUAL.md) — Auditoría QA de Paridad 1:1, Certificación de Cero Enlaces Rotos y Manual de Usuario / Mantenimiento / Despliegue.
9. [`MEMORY.md`](./MEMORY.md) — Bitácora central de decisiones, hallazgos e historial completo del proyecto.

