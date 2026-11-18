# Reporte Técnico — Fase 2: Arqueología y Catálogo de Recursos Multimedia y Escenas

**Proyecto:** *Costa Rica Pura Vida in Many Ways* (MEP)  
**Especialista:** `asset-archaeologist`  
**Fecha de Ejecución:** 17 de noviembre de 2026  
**Directorio de Entrada (`unpacked_data`):** `c:\xampp\htdocs\costa_rica_puravida_in_many_ways\app\reverse_engineering\unpacked_data`  
**Directorio de Salida (`extracted_assets`):** `c:\xampp\htdocs\costa_rica_puravida_in_many_ways\app\reverse_engineering\extracted_assets`  
**Herramienta Desarrollada:** `c:\xampp\htdocs\costa_rica_puravida_in_many_ways\app\reverse_engineering\extract_assets_and_scenes.mjs`

---

## 1. Resumen Ejecutivo

Se completó el análisis binario y la extracción forense del **100% de los recursos multimedia, tipografías, activos de texto, bancos de diálogos, bancos de trivia y jerarquías de escenas** a partir de los **113 contenedores `SerializedFile` v17** (`Unity 2017.3.1f1`, plataforma `20` WebGL, Little-Endian) y los **40 bancos de streaming `.resource`** desempaquetados en la Fase 1.

### 1.1 Métricas Globales de Extracción

| Categoría de Activo Unity | `ClassID` | Total Objetos en Proyecto | Archivos Extraídos en Disco | Directorio / Catálogo en `extracted_assets/` |
| :--- | :---: | ---: | ---: | :--- |
| **Escenas del Build (`level0`..`level53`)** | `141` (`BuildSettings`) | **54** | **108 JSON** (`levelN.json` + `levelN_<Nombre>.json`) | `scenes_hierarchy/` + `scenes_index.json` |
| **Texturas 2D (`Texture2D`)** | `28` | **349** *(334 reales + 15 placeholders de fuentes)* | **334 PNG** *(decodificados desde DXT1/DXT5/RGBA32/RGB24/ARGB32)* | `textures/` + `textures_catalog.json` |
| **Recortes / Atlas (`Sprite`)** | `213` | **895** | **895 PNG** *(recortados de su `Texture2D` padre vía `m_Rect`)* | `sprites/` + `sprites_catalog.json` |
| **Clips de Audio (`AudioClip`)** | `83` | **422** | **422 M4A** *(cortados por `m_Offset`/`m_Size` desde `.resource` `ftypmp42`)* | `audio/` + `audio_catalog.json` |
| **Fuentes Tipográficas (`Font`)** | `128` | **15** *(+1 `Arial` built-in)* | **15 archivos** (**4 `.otf`** + **11 `.ttf`**) | `fonts/` + `fonts_catalog.json` |
| **Activos de Texto (`TextAsset`)** | `49` | **5** | **5 archivos** (**3 `.lua`** + **2 `.json`**) | `text_assets/` + `text_assets_catalog.json` |
| **`GameObject` en Escenas** | `1` | **14,557** | Volcados en árbol jerárquico (`Transform`: 7,623 / `RectTransform`: 6,934) | `scenes_hierarchy/*.json` |
| **`MonoBehaviour` en Proyecto** | `114` | **16,592** | Vinculados a **1,079 `MonoScript`** (`ClassID 115`) | `monoscripts_registry.json` |
| **Bancos de Trivia Provincial (`PopQuiz`)** | `114` | **7 bancos** (**68 preguntas**) | **1 JSON maestro** con preguntas, respuestas, bandera correcta y audio | `popquiz_database.json` |
| **Líneas de Diálogo (`Fungus.Say`)** | `114` | **380 líneas** | **1 JSON maestro** con textos narrativos, personajes y locuciones (`voiceOverClip`) | `fungus_dialogues.json` |

---

## 2. Índice Oficial de las 54 Escenas del Build (`BuildSettings` en `globalgamemanagers`)

El objeto `BuildSettings` (`ClassID 141`, `PathID 11` en `globalgamemanagers`) define el orden exacto de compilación de las **54 escenas** (`level0` a `level53`). La arquitectura se compone de:
- **12 escenas de sistema, autenticación, creación de avatar, menú principal y mapa general** (`level0`..`level10` y `level53`, donde `level53` es una entrada duplicada de `SelecGenero.unity`).
- **42 escenas de minijuegos regionales** (**7 provincias × 3 minijuegos por provincia = 21 minijuegos**, cada uno dividido en una escena narrativa de introducción `*_Intro.unity` con diálogos de *Fungus* y una escena jugable `*.unity`).

### 2.1 Tabla Maestra de Escenas (`level0` a `level53`)

| Índice | Nodo | Nombre de Escena | Ruta Original en Proyecto Unity (`BuildSettings`) | Región / Módulo | `GameObject` | `UI.Text` | `UI.Image` | `UI.Button` | `SpriteRenderer` | `AudioSource` | Texturas (`sharedassetsN`) | Sprites (`sharedassetsN`) | Audios (`sharedassetsN`) | Controladores y Scripts Clave (`MonoBehaviour`) |
| --: | :--- | :--- | :--- | :--- | --: | --: | --: | --: | --: | --: | --: | --: | --: | :--- |
| **0** | `level0` | `Main` | `Assets/Main Program/Scenes/Main.unity` | Sistema / Menú Principal | 117 | 26 | 70 | 16 | 2 | 4 | 27 | 33 | 59 | `MCR_CargarEscena`, `GameMenu`, `Music_Handler`, `Sound_Handler`, `GameControl` |
| **1** | `level1` | `Login` | `Assets/RC Games Avatar System/Scenes/Login.unity` | Sistema / Login & Creación Avatar | 546 | 70 | 147 | 64 | 2 | 11 | 80 | 50 | 0 | `ManagerLogin`, `AvatarParts`, `SaveGame`, `LocalDataBase`, `ParseManager`, `ChangeLooks` |
| **2** | `level2` | `LoginContinue` | `Assets/RC Games Avatar System/Scenes/LoginContinue.unity` | Sistema / Continuar Sesión & Avatar | 550 | 70 | 150 | 65 | 2 | 11 | 1 | 1 | 0 | `ManagerLogin`, `MenuBar`, `AvatarParts`, `LoadAvatar`, `DatabaseManager` |
| **3** | `level3` | `NewGameWarning` | `Assets/Main Program/Scenes/NewGameWarning.unity` | Sistema / Advertencia Nueva Partida | 120 | 27 | 71 | 16 | 2 | 5 | 1 | 1 | 1 | `MCR_CargarEscena`, `GameMenu`, `VolumeRegulator`, `GameControl` |
| **4** | `level4` | `SelecScreen` | `Assets/Main Program/Scenes/SelecScreen.unity` | Sistema / Selección de Modo | 139 | 31 | 76 | 17 | 6 | 5 | 10 | 10 | 6 | `MCR_CargarEscena`, `GameMenu`, `Music_Handler`, `Sound_Handler` |
| **5** | `level5` | `SelecGenero` | `Assets/Main Program/Scenes/SelecGenero.unity` | Sistema / Selección de Personaje (Mike/Lisa) | 122 | 28 | 73 | 16 | 2 | 5 | 0 | 0 | 1 | `SeleccionarGeneroPersonaje`, `MCR_CargarEscena`, `GameControl` |
| **6** | `level6` | `AdventureStart` | `Assets/Main Program/Scenes/AdventureStart.unity` | Sistema / Intro Narrativa Aeropuerto | 121 | 26 | 72 | 15 | 2 | 6 | 0 | 0 | 2 | `GameControl`, `MCR_CargarEscena`, `TimedOutText`, `AvatarVisibility` |
| **7** | `level7` | `MapaCostaRica` | `Assets/Main Program/Scenes/MapaCostaRica.unity` | Mapa Central y Trivia Provincial | 335 | 85 | 177 | 61 | 2 | 5 | 13 | 23 | 68 | `MCR_GameControl`, `MCR_MostrarJuegos`, `PreguntaController`, `PopQuiz` (×7), `StarMeter` |
| **8** | `level8` | `Glosario` | `Assets/Main Program/Scenes/Glosario.unity` | Sistema / Glosario de Vocabulario | 118 | 29 | 68 | 15 | 2 | 4 | 0 | 0 | 0 | `GameControl`, `GameMenu`, `MCR_CargarEscena`, `MonedaCounter` |
| **9** | `level9` | `Creditos` | `Assets/Main Program/Scenes/Creditos.unity` | Sistema / Créditos Interactivos | 221 | 42 | 71 | 15 | 73 | 4 | 31 | 219 | 0 | `Top_Down_FixDepth`, `GameControl`, `MCR_CargarEscena` |
| **10** | `level10` | `Opciones` | `Assets/Main Program/Scenes/Opciones.unity` | Sistema / Opciones de Audio | 119 | 28 | 70 | 17 | 2 | 4 | 0 | 0 | 0 | `GameControl`, `GameMenu`, `MCR_CargarEscena`, `Music_Handler`, `Sound_Handler` |
| **11** | `level11` | `AL_Ciclismo_Intro` | `Assets/MiniGames/AL_Ciclismo/Scenes/AL_Ciclismo_Intro.unity` | **Alajuela** — Triatlón Laguna del Hule (1: Ciclismo Intro) | 130 | 30 | 71 | 16 | 5 | 6 | 1 | 1 | 3 | `FlowchartStarter`, `SwithSceneUtility`, `Fungus.Flowchart`, `Fungus.Say` (×4) |
| **12** | `level12` | `AL_Ciclismo` | `Assets/MiniGames/AL_Ciclismo/Scenes/AL_Ciclismo.unity` | **Alajuela** — Triatlón Laguna del Hule (1: Ciclismo Juego) | 201 | 44 | 80 | 15 | 11 | 5 | 10 | 23 | 0 | `TayassuGames.HD_StartRace`, `TayassuGames.HD_FinishRace`, `HDM_Enemy` (×6), `Jump`, `Walk` |
| **13** | `level13` | `AL_Correr_Intro` | `Assets/MiniGames/AL_Correr/Scenes/AL_Correr_Intro.unity` | **Alajuela** — Triatlón Laguna del Hule (2: Atletismo Intro) | 130 | 30 | 71 | 16 | 5 | 6 | 0 | 0 | 0 | `FlowchartStarter`, `SwithSceneUtility`, `Fungus.Flowchart`, `Fungus.Say` (×4) |
| **14** | `level14` | `AL_Correr` | `Assets/MiniGames/AL_Correr/Scenes/AL_Correr.unity` | **Alajuela** — Triatlón Laguna del Hule (2: Atletismo Juego) | 202 | 44 | 80 | 15 | 12 | 5 | 6 | 38 | 0 | `TayassuGames.HD_StartRace`, `TayassuGames.HD_FinishRace`, `HDM_Enemy`, `Jump`, `Walk` |
| **15** | `level15` | `AL_Natacion_Intro` | `Assets/MiniGames/AL_Natacion/Scenes/AL_Natacion_Intro.unity` | **Alajuela** — Triatlón Laguna del Hule (3: Natación Intro) | 130 | 30 | 71 | 16 | 5 | 6 | 0 | 0 | 0 | `FlowchartStarter`, `SwithSceneUtility`, `Fungus.Flowchart`, `Fungus.Say` (×4) |
| **16** | `level16` | `Al_Natacion` | `Assets/MiniGames/AL_Natacion/Scenes/Al_Natacion.unity` | **Alajuela** — Triatlón Laguna del Hule (3: Natación Juego) | 246 | 44 | 80 | 15 | 11 | 5 | 2 | 50 | 0 | `TayassuGames.HD_StartRace`, `TayassuGames.HD_FinishRace`, `HDM_Enemy`, `Jump`, `Walk` |
| **17** | `level17` | `CT_Sanatorio_Duran_Intro` | `Assets/MiniGames/CT_Sanatorio_Duran/Scenes/CT_Sanatorio_Duran_Intro.unity` | **Cartago** — Sanatorio Durán (Intro) | 130 | 30 | 70 | 16 | 5 | 6 | 1 | 1 | 1 | `FlowchartStarter`, `SwithSceneUtility`, `Fungus.Flowchart`, `Fungus.Say` (×4) |
| **18** | `level18` | `CT_Sanatorio_Duran` | `Assets/MiniGames/CT_Sanatorio_Duran/Scenes/CT_Sanatorio_Duran.unity` | **Cartago** — Sanatorio Durán (Juego) | 316 | 40 | 83 | 19 | 12 | 9 | 4 | 44 | 24 | `CT_Sanatorio_Duran_GameControl`, `CT_Sanatorio_Duran_Mision_Puertas`, `CT_Sanatorio_Duran_Mision2_Fantasma`, `CT_Sanatorio_Duran_Mision3` |
| **19** | `level19` | `CT_Volcanes_Intro` | `Assets/MiniGames/CT_Volcanes/Scenes/CT_Volcanes_Intro.unity` | **Cartago** — Volcán Irazú (Intro) | 124 | 27 | 67 | 15 | 6 | 5 | 2 | 2 | 4 | `FlowchartStarter`, `SwithSceneUtility`, `Fungus.Flowchart`, `Fungus.Say` (×10) |
| **20** | `level20` | `CT_Volcanes` | `Assets/MiniGames/CT_Volcanes/Scenes/CT_Volcanes.unity` | **Cartago** — Volcán Irazú (Juego) | 162 | 33 | 74 | 17 | 19 | 5 | 7 | 18 | 4 | `CT_Volcanes_GameControl`, `CT_Volcanes_Generador`, `CT_Volcanes_Roca`, `CT_Volcanes_Player` |
| **21** | `level21` | `CT_Volcanes2_Intro` | `Assets/MiniGames/CT_Volcanes2/Scenes/CT_Volcanes2_Intro.unity` | **Cartago** — Volcán Turrialba (Intro) | 124 | 27 | 67 | 15 | 6 | 5 | 0 | 0 | 0 | `FlowchartStarter`, `SwithSceneUtility`, `Fungus.Flowchart`, `Fungus.Say` (×10) |
| **22** | `level22` | `CT_Volcanes2` | `Assets/MiniGames/CT_Volcanes2/Scenes/CT_Volcanes2.unity` | **Cartago** — Volcán Turrialba (Juego) | 254 | 33 | 74 | 17 | 68 | 5 | 0 | 0 | 0 | `CT_Volcanes_GameControl`, `CT_Volcanes_Generador`, `CT_Volcanes_Player` |
| **23** | `level23` | `GN_BarraHonda_Intro` | `Assets/MiniGames/GN_BarraHonda/Scenes/GN_BarraHonda_Intro.unity` | **Guanacaste** — Cavernas de Barra Honda (Intro) | 124 | 27 | 67 | 15 | 6 | 5 | 2 | 2 | 4 | `FlowchartStarter`, `SwithSceneUtility`, `Fungus.Flowchart`, `Fungus.Say` (×8) |
| **24** | `level24` | `GN_BarraHonda` | `Assets/MiniGames/GN_BarraHonda/Scenes/GN_BarraHonda.unity` | **Guanacaste** — Cavernas de Barra Honda (Juego) | 283 | 33 | 75 | 17 | 62 | 5 | 4 | 9 | 2 | `GNBH_GameControl`, `GNBH_Vuelo`, `GNBH_Caminar`, `GNBH_Saltar`, `GNBH_Colisiones` |
| **25** | `level25` | `GN_Buceo_Intro` | `Assets/MiniGames/GN_Buceo/Scenes/GN_Buceo_Intro.unity` | **Guanacaste** — Buceo en Islas Catalinas (Intro) | 130 | 30 | 71 | 16 | 5 | 6 | 1 | 1 | 2 | `FlowchartStarter`, `SwithSceneUtility`, `Fungus.Flowchart`, `Fungus.Say` (×4) |
| **26** | `level26` | `GN_Buceo` | `Assets/MiniGames/GN_Buceo/Scenes/GN_Buceo.unity` | **Guanacaste** — Buceo en Islas Catalinas (Juego) | 344 | 32 | 71 | 17 | 146 | 8 | 14 | 42 | 5 | `GN_Buceo_GameController`, `Diving_Player`, `GN_Tomar_Fotos`, `GN_Buceo_ScrollingObject` |
| **27** | `level27` | `GN_Surf_Tamarindo_Intro` | `Assets/MiniGames/GN_Surf_Tamarindo/Scenes/GN_Surf_Tamarindo_Intro.unity` | **Guanacaste** — Surf en Tamarindo (Intro) | 130 | 30 | 71 | 16 | 5 | 6 | 1 | 1 | 2 | `FlowchartStarter`, `SwithSceneUtility`, `Fungus.Flowchart`, `Fungus.Say` (×4) |
| **28** | `level28` | `GN_Surf_Tamarindo` | `Assets/MiniGames/GN_Surf_Tamarindo/Scenes/GN_Surf_Tamarindo.unity` | **Guanacaste** — Surf en Tamarindo (Juego) | 322 | 32 | 72 | 16 | 135 | 5 | 3 | 17 | 3 | `GN_ST_GameControl`, `GN_Surf_Player`, `GN_ST_PersigueOla`, `GN_ST_GeneradorObstaculos` |
| **29** | `level29` | `HD_Entregar_Flores_Intro` | `Assets/MiniGames/HD_Entregar_Flores/Scenes/HD_Entregar_Flores_Intro.unity` | **Heredia** — Entrega de Flores (Intro) | 124 | 27 | 67 | 15 | 6 | 5 | 2 | 2 | 8 | `FlowchartStarter`, `SwithSceneUtility`, `Fungus.Flowchart`, `Fungus.Say` (×8) |
| **30** | `level30` | `HD_Entregar_Flores` | `Assets/MiniGames/HD_Entregar_Flores/Scenes/HD_Entregar_Flores.unity` | **Heredia** — Entrega de Flores (Juego) | 611 | 33 | 76 | 17 | 176 | 6 | 6 | 43 | 39 | `HD_Entrega_Flores_Game_Control`, `HD_Entrega_Flores_Recibe_Flores`, `HD_Entrega_Flores_Texto_Personajes` |
| **31** | `level31` | `HD_Mascarada_Intro` | `Assets/MiniGames/HD_Mascarada/Scenes/HD_Mascarada_Intro.unity` | **Heredia** — Mascarada Tradicional Barva (Intro) | 124 | 27 | 67 | 15 | 6 | 5 | 1 | 1 | 5 | `FlowchartStarter`, `SwithSceneUtility`, `Fungus.Flowchart`, `Fungus.Say` (×6) |
| **32** | `level32` | `HD_Mascarada` | `Assets/MiniGames/HD_Mascarada/Scenes/HD_Mascarada.unity` | **Heredia** — Mascarada Tradicional Barva (Juego) | 1,309 | 34 | 76 | 17 | 1,001 | 5 | 8 | 23 | 4 | `HD_MascaradaController`, `HDM_Enemy`, `HDM_EnemyReact`, `HDM_ActivateEnemy` |
| **33** | `level33` | `HD_Mountainbike_Intro` | `Assets/MiniGames/HD_MountainBike/Scenes/HD_Mountainbike_Intro.unity` | **Heredia** — Mountain Bike Braulio Carrillo (Intro) | 129 | 30 | 70 | 16 | 5 | 6 | 1 | 1 | 2 | `FlowchartStarter`, `SwithSceneUtility`, `Fungus.Flowchart`, `Fungus.Say` (×4) |
| **34** | `level34` | `HD_Mountainbike` | `Assets/MiniGames/HD_MountainBike/Scenes/HD_Mountainbike.unity` | **Heredia** — Mountain Bike Braulio Carrillo (Juego) | 389 | 35 | 78 | 17 | 103 | 5 | 7 | 5 | 2 | `TayassuGames.HD_MontainBikeController`, `HD_Parallax`, `TayassuGames.HD_GrabCoin`, `ReSpawm` |
| **35** | `level35` | `Lm_Cocina_Intro` | `Assets/MiniGames/LM_Cocina/Scenes/Lm_Cocina_Intro.unity` | **Limón** — Cocina Caribeña (Intro stub) | 5 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | `AvatarVisibility` *(el diálogo de intro está integrado directamente en `level36`)* |
| **36** | `level36` | `Lm_Cocina` | `Assets/MiniGames/LM_Cocina/Scenes/Lm_Cocina.unity` | **Limón** — Cocina Caribeña (Juego + Intro) | 290 | 63 | 196 | 37 | 2 | 12 | 8 | 45 | 24 | `LM_Cocina_Controller`, `LM_Recipes`, `LM_DragHandler`, `LM_SlotDrop`, `PlayAudioAyudas` |
| **37** | `level37` | `LM_Tortuguero_Intro` | `Assets/MiniGames/LM_Tortuguero/Scenes/LM_Tortuguero_Intro.unity` | **Limón** — Canales de Tortuguero (Intro) | 131 | 30 | 71 | 16 | 5 | 6 | 1 | 1 | 2 | `FlowchartStarter`, `SwithSceneUtility`, `Fungus.Flowchart`, `Fungus.Say` (×4) |
| **38** | `level38` | `LM_Tortuguero` | `Assets/MiniGames/LM_Tortuguero/Scenes/LM_Tortuguero.unity` | **Limón** — Canales de Tortuguero (Juego) | 326 | 33 | 80 | 17 | 105 | 5 | 8 | 6 | 6 | `LM_T_GameControl`, `LM_T_Manati`, `LM_T_Mov_Bote`, `LM_T_Tronco` |
| **39** | `level39` | `LM_Desove_Intro` | `Assets/MiniGames/LM_Desove/Scenes/LM_Desove_Intro.unity` | **Limón** — Desove de Tortugas (Intro) | 124 | 27 | 67 | 15 | 6 | 5 | 2 | 2 | 8 | `FlowchartStarter`, `SwithSceneUtility`, `Fungus.Flowchart`, `Fungus.Say` (×8) |
| **40** | `level40` | `LM_Desove` | `Assets/MiniGames/LM_Desove/Scenes/LM_Desove.unity` | **Limón** — Desove de Tortugas (Juego) | 176 | 33 | 76 | 18 | 17 | 5 | 5 | 18 | 4 | `LM_DV_GameController`, `LM_DV_BabyTurtle`, `LM_DV_Predator`, `LM_DV_Flashlight` |
| **41** | `level41` | `PR_Manuel_Antonio_Intro` | `Assets/MiniGames/PR_Manuel_Antonio/Scenes/PR_Manuel_Antonio_Intro.unity` | **Puntarenas** — Parque Nac. Manuel Antonio (Intro) | 124 | 27 | 67 | 15 | 6 | 5 | 1 | 1 | 5 | `FlowchartStarter`, `SwithSceneUtility`, `Fungus.Flowchart`, `Fungus.Say` (×6) |
| **42** | `level42` | `PR_Manuel_Antonio` | `Assets/MiniGames/PR_Manuel_Antonio/Scenes/PR_Manuel_Antonio.unity` | **Puntarenas** — Parque Nac. Manuel Antonio (Juego) | 676 | 30 | 82 | 16 | 256 | 6 | 5 | 21 | 42 | `PR_MA_Game_Control`, `PR_MA_MisionArboles`, `PR_MA_Mision_Frutas`, `PR_MA_Mision_Tronco` |
| **43** | `level43` | `PR_Paseo_Turistas_Intro` | `Assets/MiniGames/PR_Paseo_Turistas/Scenes/PR_Paseo_Turistas_Intro.unity` | **Puntarenas** — Paseo de los Turistas / Churchill (Intro) | 124 | 27 | 67 | 15 | 6 | 5 | 2 | 2 | 11 | `FlowchartStarter`, `SwithSceneUtility`, `Fungus.Flowchart`, `Fungus.Say` (×12) |
| **44** | `level44` | `PR_Paseo_Turistas` | `Assets/MiniGames/PR_Paseo_Turistas/Scenes/PR_Paseo_Turistas.unity` | **Puntarenas** — Paseo de los Turistas / Churchill (Juego) | 548 | 35 | 75 | 16 | 92 | 5 | 4 | 13 | 13 | `PR_PT_GameControl`, `PR_PT_Generar_Pedido_Churchill`, `PR_PT_Recibe_Churchill`, `PR_PT_Preparar_Churchill` |
| **45** | `level45` | `PR_Tarcoles_Intro` | `Assets/MiniGames/PR_Tarcoles/Scenes/PR_Tarcoles_Intro.unity` | **Puntarenas** — Río Tárcoles (Intro) | 124 | 27 | 67 | 15 | 6 | 5 | 1 | 1 | 6 | `FlowchartStarter`, `SwithSceneUtility`, `Fungus.Flowchart`, `Fungus.Say` (×8) |
| **46** | `level46` | `PR_Tarcoles` | `Assets/MiniGames/PR_Tarcoles/Scenes/PR_Tarcoles.unity` | **Puntarenas** — Río Tárcoles (Juego) | 239 | 33 | 74 | 16 | 48 | 5 | 5 | 29 | 2 | `PR_Tarcoles_GameCotroller`, `Frog`, `PR_T_LogDriver`, `PR_T_BagCounter`, `PR_T_Respawn` |
| **47** | `level47` | `SJ_FincaCafetalera_Intro` | `Assets/MiniGames/SJ_Finca_Cafetalera/Scenes/SJ_FincaCafetalera_Intro.unity` | **San José** — Finca Cafetalera (Intro) | 124 | 27 | 67 | 15 | 6 | 5 | 2 | 2 | 11 | `FlowchartStarter`, `SwithSceneUtility`, `Fungus.Flowchart`, `Fungus.Say` (×12) |
| **48** | `level48` | `SJ_FincaCafetalera` | `Assets/MiniGames/SJ_Finca_Cafetalera/Scenes/SJ_FincaCafetalera.unity` | **San José** — Finca Cafetalera (Juego) | 1,527 | 38 | 90 | 19 | 738 | 7 | 5 | 41 | 6 | `SJ_FC_GameController`, `SJ_FC_Generador_De_Cafe`, `SJ_FC_Cafe`, `SJ_FC_Player` |
| **49** | `level49` | `SJ_Museo_Oro_Intro` | `Assets/MiniGames/SJ_MuseoOro/Scenes/SJ_Museo_Oro_Intro.unity` | **San José** — Museo del Oro Precolombino (Intro) | 130 | 30 | 71 | 16 | 5 | 6 | 1 | 1 | 3 | `FlowchartStarter`, `SwithSceneUtility`, `Fungus.Flowchart`, `Fungus.Say` (×4) |
| **50** | `level50` | `SJ_Museo_Oro` | `Assets/MiniGames/SJ_MuseoOro/Scenes/SJ_Museo_Oro.unity` | **San José** — Museo del Oro Precolombino (Juego) | 434 | 34 | 77 | 19 | 113 | 5 | 5 | 7 | 19 | `SJ_Museo_Oro_GameControl`, `SJ_MO_PiezaOro`, `SJ_MO_Vitrina`, `SJ_MO_FechaHelp` |
| **51** | `level51` | `SJ_Rafting_Intro` | `Assets/MiniGames/SJ_Rafting/Scenes/SJ_Rafting_Intro.unity` | **San José** — Rafting Río General (Intro) | 129 | 30 | 70 | 16 | 5 | 6 | 1 | 1 | 2 | `FlowchartStarter`, `SwithSceneUtility`, `Fungus.Flowchart`, `Fungus.Say` (×4) |
| **52** | `level52` | `SJ_Rafting` | `Assets/MiniGames/SJ_Rafting/Scenes/SJ_Rafting.unity` | **San José** — Rafting Río General (Juego) | 424 | 35 | 76 | 17 | 105 | 5 | 5 | 24 | 0 | `TayassuGames.HD_MontainBikeController`, `HD_Parallax`, `TayassuGames.HD_GrabCoin`, `ReSpawm` |
| **53** | `level53` | `SelecGenero` | `Assets/Main Program/Scenes/SelecGenero.unity` | Sistema / Selección de Personaje (Duplicado) | 122 | 28 | 73 | 16 | 2 | 5 | 0 | 0 | 0 | `SeleccionarGeneroPersonaje`, `MCR_CargarEscena`, `GameControl` |

---

## 3. Catálogo Detallado de Recursos Multimedia Extraídos

Todos los recursos fueron extraídos en `c:\xampp\htdocs\costa_rica_puravida_in_many_ways\app\reverse_engineering\extracted_assets\` junto con sus catálogos JSON estructurados.

### 3.1 Texturas (`Texture2D` — `extracted_assets/textures/` y `textures_catalog.json`)

- **Total de objetos `Texture2D` (`ClassID 28`):** `349`
  - **Texturas reales con imagen decodificada:** `334 archivos PNG`
  - **Placeholders de fuentes dinámicas (`Font Texture`, `0x0 px`):** `15 objetos` (generados en runtime por Unity para cada `Font`).
- **Distribución por formato de compresión nativo de Unity (`TextureFormat`):**
  - `RGBA32` (`Format 4`): **177** *(162 texturas reales + 15 placeholders de fuente)*
  - `DXT5 / BC3` (`Format 12`): **119** *(texturas comprimidas con canal alfa interpolado de 8 bytes + color 4x4)*
  - `DXT1 / BC1` (`Format 10`): **34** *(texturas comprimidas 4x4 sin canal alfa o alfa 1-bit)*
  - `RGB24` (`Format 3`): **17** *(texturas sin canal alfa de 24 bits por píxel)*
  - `ARGB32` (`Format 5`): **2** *(texturas de 32 bits con orden A-R-G-B)*
- **Contenedores principales de texturas:**
  - `globalgamemanagers.assets`: 1 textura (`Logo Costa Rica Loading B.png`, `512x512`, `DXT1`)
  - `resources.assets`: 26 texturas reales (iconos de Fungus, partículas VFX, `FungusLogo.png`, `Background.png`, cursores)
  - `sharedassets0.assets`: 27 texturas (fondos de menú principal, banderas, UI general, avatares Mike/Lisa)
  - `sharedassets1.assets`: 80 texturas (`74.6 MB` — texturas del sistema de creación de avatar 3D/2D RC Games, prendas, cabello, calzado, piel y accesorios)
  - `sharedassets7.assets`: 13 texturas (mapa interactivo de Costa Rica, iconos de provincias, medallas, popups de trivia)
  - `sharedassets9.assets`: 31 texturas (escena de créditos, tilesets y sprites de desarrolladores)
  - `sharedassets12..52.assets`: 156 texturas específicas de los 21 minijuegos regionales (mapas Tiled2Unity, fondos parallax, hojas de sprites de personajes, fauna, flora y obstáculos).

### 3.2 Recortes y Sprites (`Sprite` — `extracted_assets/sprites/` y `sprites_catalog.json`)

- **Total de objetos `Sprite` (`ClassID 213`):** **895 PNG recortados** (`100%` resueltos contra su `Texture2D` padre mediante `PPtr<Texture2D>` en `m_RD.texture`).
- Cada entrada en `sprites_catalog.json` preserva:
  - `rect` (`x, y, width, height` en coordenadas de píxel de la textura origen)
  - `pivot` (`x, y` normalizado)
  - `pixelsToUnits` (escala física a unidades del mundo Unity, típicamente `100` o `32`)
  - `border` (`9-slice` borders `x, y, z, w` para paneles de UI escalables)
  - `textureName` y `textureExtractedFile` (enlace directo al PNG de la textura completa).

### 3.3 Clips de Audio (`AudioClip` — `extracted_assets/audio/` y `audio_catalog.json`)

- **Total de objetos `AudioClip` (`ClassID 83`):** **422 archivos `.m4a`** (`421` nombres únicos `m_Name` + `1` variante con sufijo de contenedor).
- **Formato de Contenedor y Códec:** Todos los 422 clips tienen `m_CompressionFormat = 7` (**AAC encapsulado en contenedor MP4/ISO Media `ftypmp42`**), frecuencia de muestreo de `44,100 Hz` (o `22,050 Hz` / `48,000 Hz` en efectos puntuales) y 16 bits por muestra.
- **Distribución por Banco `.resource` (40 archivos `.resource`):**
  - `resources.resource` (`7 clips`): Efectos de UI y escritura de diálogos Fungus (`Click1`, `Click2`, `Click3`, `Key1`, `Key2`, `LineBeep1`, `Page1`).
  - `sharedassets0.resource` (`59 clips`, `29.38 MB`): Música de fondo principal y pistas musicales globales (`cr song loop`, temas por provincia, sonidos de botones, monedas, victoria/derrota y locuciones de `Main`).
  - `sharedassets7.resource` (`68 clips`, `3.38 MB`): Las **68 locuciones en inglés de las preguntas del `PopQuiz`** en el mapa de Costa Rica (`AL_P1`..`AL_P9`, `CT_P1`..`CT_P10`, `GN_P1`..`GN_P10`, `HD_P1`..`HD_P9`, `LM_P1`..`LM_P10`, `PR_P1`..`PR_P10`, `SJ_P1`..`SJ_P10`).
  - `sharedassets3..51.resource` (`288 clips`): Locuciones narrativas de **Mike**, **Lisa** y personajes locales (NPCs) en las escenas `_Intro` y misiones top-down (`CT_Sanatorio_Duran`, `HD_Entregar_Flores`, `LM_Cocina`, `PR_Manuel_Antonio`, `PR_Paseo_Turistas`, `SJ_FincaCafetalera`, `SJ_Museo_Oro`), además de efectos ambientales (olas, selva, animales, motores, agua).

### 3.4 Fuentes Tipográficas (`Font` — `extracted_assets/fonts/` y `fonts_catalog.json`)

Se extrajeron los **15 activos `Font` (`ClassID 128`)** embebidos en el juego (13 tipografías únicas y 2 instancias duplicadas en `sharedassets0.assets`), más la referencia a la fuente built-in `Arial`:

| # | Nombre del Activo (`m_Name`) | Contenedor Origen | `PathID` | Formato Binario | Pares de Kerning | Tamaño (Bytes) | Archivo Extraído en `extracted_assets/fonts/` |
| --: | :--- | :--- | --: | :--- | --: | --: | :--- |
| 1 | `Amaranth-BoldItalic` | `resources.assets` | 67 | OpenType (`OTTO`) | 354 | 56,700 | `fonts/Amaranth-BoldItalic.otf` |
| 2 | `Exo2-Bold` | `resources.assets` | 68 | TrueType (`TTF`) | 0 | 109,136 | `fonts/Exo2-Bold.ttf` |
| 3 | `Amaranth-Bold` | `resources.assets` | 69 | OpenType (`OTTO`) | 277 | 48,760 | `fonts/Amaranth-Bold.otf` |
| 4 | `Exo2-Regular` | `resources.assets` | 70 | TrueType (`TTF`) | 0 | 106,380 | `fonts/Exo2-Regular.ttf` |
| 5 | `Amaranth-Italic` | `resources.assets` | 71 | OpenType (`OTTO`) | 354 | 56,056 | `fonts/Amaranth-Italic.otf` |
| 6 | `Amaranth-Regular` | `resources.assets` | 72 | OpenType (`OTTO`) | 277 | 48,732 | `fonts/Amaranth-Regular.otf` |
| 7 | `Hanken-Light` | `sharedassets0.assets` | 108 | TrueType (`TTF`) | 116 | 46,044 | `fonts/Hanken-Light.ttf` |
| 8 | `Hanken-Light` *(instancia 2)* | `sharedassets0.assets` | 109 | TrueType (`TTF`) | 116 | 46,044 | `fonts/Hanken-Light__sharedassets0_109.ttf` |
| 9 | `FredokaOne-Regular` | `sharedassets0.assets` | 110 | TrueType (`TTF`) | 0 | 43,500 | `fonts/FredokaOne-Regular.ttf` |
| 10 | `Hanken-Book` | `sharedassets0.assets` | 111 | TrueType (`TTF`) | 116 | 35,364 | `fonts/Hanken-Book.ttf` |
| 11 | `Hanken-Book` *(instancia 2)* | `sharedassets0.assets` | 112 | TrueType (`TTF`) | 116 | 35,364 | `fonts/Hanken-Book__sharedassets0_112.ttf` |
| 12 | `OpenSansSemibold` | `sharedassets12.assets` | 64 | TrueType (`TTF`) | 2,122 | 221,328 | `fonts/OpenSansSemibold.ttf` |
| 13 | `OpenSansLight` | `sharedassets12.assets` | 65 | TrueType (`TTF`) | 2,122 | 222,412 | `fonts/OpenSansLight.ttf` |
| 14 | `OpenSansBold` | `sharedassets12.assets` | 66 | TrueType (`TTF`) | 2,122 | 224,592 | `fonts/OpenSansBold.ttf` |
| 15 | `OpenSansRegular` | `sharedassets12.assets` | 67 | TrueType (`TTF`) | 2,122 | 217,360 | `fonts/OpenSansRegular.ttf` |

### 3.5 Activos de Texto (`TextAsset` — `extracted_assets/text_assets/` y `text_assets_catalog.json`)

Se extrajeron los **5 objetos `TextAsset` (`ClassID 49`)**, todos alojados en `resources.assets`:

| # | Nombre (`m_Name`) | Contenedor | `PathID` | Ruta `ResourceManager` | Tamaño (Bytes) | Archivo Extraído | Propósito |
| --: | :--- | :--- | --: | :--- | --: | :--- | :--- |
| 1 | `inspect` | `resources.assets` | 54 | `lua/inspect` | 9,587 | `text_assets/inspect.lua` | Librería Lua `inspect.lua 3.0.2` para serialización de tablas en Fungus. |
| 2 | `FungusTypes` | `resources.assets` | 55 | — | 887 | `text_assets/FungusTypes.json` | Registro JSON de tipos de Fungus expuestos al intérprete MoonSharp Lua. |
| 3 | `UnityTypes` | `resources.assets` | 56 | — | 5,814 | `text_assets/UnityTypes.json` | Registro JSON de tipos de `UnityEngine` y `System` expuestos a Lua. |
| 4 | `junglestory` | `resources.assets` | 57 | `lua/junglestory` | 1,762 | `text_assets/junglestory.lua` | Módulo Lua de ejemplo incluido en el plugin FungusLua. |
| 5 | `fungus` | `resources.assets` | 58 | `lua/fungus` | 11,087 | `text_assets/fungus.lua` | API principal de utilidades Lua para corrutinas, diálogos y menús de Fungus. |

---

## 4. Estructura Visual y Funcional por Escena y Módulo

Cada una de las 54 escenas cuenta con su volcado completo en `extracted_assets/scenes_hierarchy/level<N>_<Nombre>.json` (y copia canónica `level<N>.json`). A continuación se documenta la estructura visual y funcional extraída de las jerarquías.

### 4.1 Escenas de Sistema, Avatar y Navegación Principal (`level0`..`level10`, `level53`)

1. **`level0` — `Main.unity` (Menú Principal):**
   - **Estructura UI (`117 GameObjects`, `26 UI.Text`, `70 UI.Image`, `16 UI.Button`):** Contiene el `Canvas` principal con `Panel Menu Principal`, botones de navegación (`Start / Play`, `Options`, `Credits`, `Glossary`, `Exit`), barra superior persistente (`MenuBar` con contadores de monedas/ítems coleccionables `MonedaCounter`, `FlowerIcon`, `BasketIcon`, `Dollicon`, `Logicon`, control de volumen y salida) y panel modal de confirmación (`ShowConfirmCancelPanel`).
2. **`level1` (`Login.unity`) y `level2` (`LoginContinue.unity`) — Sistema RC Games Avatar & Autenticación:**
   - **Estructura UI (`546` y `550 GameObjects`, `70 UI.Text`, `147–150 UI.Image`, `64–65 UI.Button`):** Implementan el inicio de sesión local/remoto (`ManagerLogin`, `LocalDataBase`, `ParseManager`) y el editor completo de avatar (`AvatarParts`, `ChangeLooks`, `SaveGame`), permitiendo personalizar género, tono de piel, peinado, camisa, pantalón, zapatos y accesorios con previsualización en tiempo real.
3. **`level3` (`NewGameWarning.unity`), `level4` (`SelecScreen.unity`), `level5` / `level53` (`SelecGenero.unity`), `level6` (`AdventureStart.unity`):**
   - Flujo de inicio de nueva partida: advertencia de sobrescritura de progreso (`level3`), selección de modo historia/libre (`level4`), elección de protagonista entre **Mike** y **Lisa** (`level5` / `level53`), e introducción en el aeropuerto al llegar a Costa Rica (`level6`).
4. **`level7` — `MapaCostaRica.unity` (Hub Central del Juego y Sistema `PopQuiz`):**
   - **Estructura UI (`335 GameObjects`, `85 UI.Text`, `177 UI.Image`, `61 UI.Button`):**
     - `Map Scene Canvas/Panel/MapaCostaRica`: Contiene los **7 nodos provinciales** (`NivelAlajuela`, `NivelCartago`, `NivelGuanacaste`, `NivelHeredia`, `NivelLimon`, `NivelPuntarenas`, `NivelSanJose`).
     - Al seleccionar una provincia, despliega sus **3 minijuegos regionales** (`MCR_MostrarJuegos`) con indicadores de estrellas obtenidas (`StarMeter`) y el examen de trivia provincial (`PopQuiz` + `PreguntaController`).
   - **Base de Datos de Trivia Extraída (`extracted_assets/popquiz_database.json`):**
     Se extrajeron íntegramente los **7 bancos `PopQuiz`** con **68 preguntas en inglés**, sus opciones de respuesta, banderas booleanas `isCorrect` y su archivo de audio `.m4a` asociado:
     - `NivelPuntarenas`: **10 preguntas** (Parque Nacional Corcovado, San Vito, Isla del Coco, grupos indígenas Boruca/Bribri, Cola de la Ballena, etc.)
     - `NivelLimon`: **10 preguntas** (Cordillera de Talamanca, Parque Nacional Tortuguero, fauna de Cahuita, Carnavales, playas Manzanillo/Cocles/Punta Uva, gastronomía caribeña Rice & Beans / Rondón / Patí)
     - `NivelCartago`: **10 preguntas** (Ruinas de Santiago Apóstol, Volcán Irazú, Basílica de los Ángeles, Valle de Orosi, Monumento Nacional Guayabo, Sanatorio Durán)
     - `NivelAlajuela`: **9 preguntas** (Volcán Poás, Juan Santamaría, Sarchí y carretas típicas, Ciudad Quesada, Rescate Wildlife Center / ZooAve, Laguna del Hule)
     - `NivelSanJose`: **10 preguntas** (Teatro Nacional, Museo del Oro Precolombino, Parque Nacional Chirripó, Valle del General, Museo de los Niños, cultura cafetalera)
     - `NivelGuanacaste`: **10 preguntas** (Liberia, gastronomía a base de maíz, Santa Cruz, Zona Azul de Nicoya, Anexión del Partido de Nicoya el 25 de julio de 1824, Chorotegas, Cavernas de Barra Honda)
     - `NivelHeredia`: **9 preguntas** (Bosque de la Hoja, Ciudad de las Flores, Parque Nacional Braulio Carrillo, Mercado Central, Picadillo de arracache, Volcán Barva, Mascaradas).
5. **`level8` (`Glosario.unity`), `level9` (`Creditos.unity`), `level10` (`Opciones.unity`):**
   - `Glosario.unity`: Diccionario interactivo de expresiones costarricenses y vocabulario cultural.
   - `Creditos.unity`: Escena interactiva con `73 SpriteRenderers` y `219 Sprites` en `sharedassets9.assets` que presenta al equipo del MEP y desarrolladores.
   - `Opciones.unity`: Ajuste global de volumen de música y efectos (`Music_Handler`, `Sound_Handler`).

---

### 4.2 Los 21 Minijuegos Regionales por Provincia (`level11`..`level52`)

Cada provincia cuenta con **3 minijuegos** (una escena `*_Intro` basada en `Fungus.Flowchart` donde **Mike**, **Lisa** o un guía local introducen el contexto geográfico y cultural en inglés con audio hablado, seguida de la escena de juego):

#### A. Provincia de Alajuela (`AL_*` — Triatlón en Laguna del Hule, Río Cuarto)
1. **Ciclismo (`level11` `AL_Ciclismo_Intro` / `level12` `AL_Ciclismo`):**
   - **Mecánica:** Carrera lateral de ciclismo (`TayassuGames.HD_StartRace`, `HD_FinishRace`, `Jump`, `Walk`) contra 6 competidores (`HDM_Enemy`) sobre mapa importado con `Tiled2Unity` (`TiledMap`, `7 TileLayers`), recolectando monedas y esquivando obstáculos.
2. **Atletismo / Correr (`level13` `AL_Correr_Intro` / `level14` `AL_Correr`):**
   - **Mecánica:** Segunda etapa del triatlón a pie (`202 GameObjects`, `38 Sprites` en `sharedassets14.assets`), con salto de obstáculos y rivales controlados por `HDM_Enemy`.
3. **Natación (`level15` `AL_Natacion_Intro` / `level16` `Al_Natacion`):**
   - **Mecánica:** Etapa final de natación en la Laguna del Hule (`246 GameObjects`, `50 Sprites` en `sharedassets16.assets`).

#### B. Provincia de Cartago (`CT_*`)
4. **Sanatorio Durán (`level17` `CT_Sanatorio_Duran_Intro` / `level18` `CT_Sanatorio_Duran`):**
   - **Mecánica:** Exploración top-down en 3 misiones (`CT_Sanatorio_Duran_Mision_Puertas`, `CT_Sanatorio_Duran_Mision2_Fantasma`, `CT_Sanatorio_Duran_Mision3`) dentro de los pabellones del Sanatorio Durán con teletransportadores entre pisos (`Top_Down_Warps`) y `24 AudioClips` de diálogos y efectos de puertas/fantasmas.
5. **Volcán Irazú (`level19` `CT_Volcanes_Intro` / `level20` `CT_Volcanes`):**
   - **Mecánica:** Ascenso y esquiva de rocas volcánicas (`CT_Volcanes_GameControl`, `CT_Volcanes_Generador`, `CT_Volcanes_Roca`, `CT_Volcanes_Player`).
6. **Volcán Turrialba (`level21` `CT_Volcanes2_Intro` / `level22` `CT_Volcanes2`):**
   - **Mecánica:** Segunda variante de ascenso volcánico (`254 GameObjects`, `68 SpriteRenderers`) reutilizando los activos gráficos de `CT_Volcanes`.

#### C. Provincia de Guanacaste (`GN_*`)
7. **Cavernas de Barra Honda (`level23` `GN_BarraHonda_Intro` / `level24` `GN_BarraHonda`):**
   - **Mecánica:** Exploración subterránea y vuelo de murciélago (`GNBH_GameControl`, `GNBH_Vuelo`, `GNBH_Caminar`, `GNBH_Saltar`, `GNBH_Colisiones`) esquivando estalactitas y estalagmitas.
8. **Buceo en Guanacaste (`level25` `GN_Buceo_Intro` / `level26` `GN_Buceo`):**
   - **Mecánica:** Fotografía submarina de fauna marina (`GN_Buceo_GameController`, `Diving_Player`, `GN_Tomar_Fotos`, `GN_Buceo_ScrollingObject`, con `14 texturas` y `42 sprites` de especies marinas en `sharedassets26.assets`).
9. **Surf en Tamarindo (`level27` `GN_Surf_Tamarindo_Intro` / `level28` `GN_Surf_Tamarindo`):**
   - **Mecánica:** Acción sobre olas en Playa Tamarindo (`GN_ST_GameControl`, `GN_Surf_Player`, `GN_ST_PersigueOla`, `GN_ST_GeneradorObstaculos`).

#### D. Provincia de Heredia (`HD_*`)
10. **Entrega de Flores (`level29` `HD_Entregar_Flores_Intro` / `level30` `HD_Entregar_Flores`):**
    - **Mecánica:** Aventura top-down por la ciudad de Heredia (`611 GameObjects`, `176 SpriteRenderers`, `39 AudioClips`) donde el jugador recibe pedidos en inglés de los habitantes (`HD_Entrega_Flores_Texto_Personajes`, `Text_Top_Down_Fungus`) y entrega los arreglos florales correctos (`HD_Entrega_Flores_Recibe_Flores`).
11. **Mascarada Tradicional (`level31` `HD_Mascarada_Intro` / `level32` `HD_Mascarada`):**
    - **Mecánica:** Recorrido por las calles de Barva (`1,309 GameObjects`, `1,001 SpriteRenderers`) interactuando con gigantas y cabezudos (`HD_MascaradaController`, `HDM_EnemyReact`, `HDM_ActivateEnemy`).
12. **Mountain Bike en Braulio Carrillo (`level33` `HD_Mountainbike_Intro` / `level34` `HD_Mountainbike`):**
    - **Mecánica:** Descenso en bicicleta de montaña con física 2D y fondos parallax (`TayassuGames.HD_MontainBikeController`, `HD_Parallax`, `ReSpawm`).

#### E. Provincia de Limón (`LM_*`)
13. **Cocina Caribeña (`level35` `Lm_Cocina_Intro` / `level36` `Lm_Cocina`):**
    - **Mecánica:** Juego interactivo de arrastrar y soltar ingredientes (`LM_Cocina_Controller`, `LM_Recipes`, `LM_DragHandler`, `LM_SlotDrop`, `PlayAudioAyudas`, con `196 UI.Image`, `63 UI.Text`, `45 Sprites` y `24 AudioClips`) para preparar platillos caribeños siguiendo recetas en inglés.
14. **Canales de Tortuguero (`level37` `LM_Tortuguero_Intro` / `level38` `LM_Tortuguero`):**
    - **Mecánica:** Navegación en bote por los canales de Tortuguero (`LM_T_GameControl`, `LM_T_Mov_Bote`, `LM_T_Tronco`) para avistar manatíes (`LM_T_Manati`).
15. **Desove de Tortugas (`level39` `LM_Desove_Intro` / `level40` `LM_Desove`):**
    - **Mecánica:** Protección nocturna de neonatos de tortuga marina hacia el mar (`LM_DV_GameController`, `LM_DV_BabyTurtle`, `LM_DV_Predator`, `LM_DV_Flashlight`).

#### F. Provincia de Puntarenas (`PR_*`)
16. **Parque Nacional Manuel Antonio (`level41` `PR_Manuel_Antonio_Intro` / `level42` `PR_Manuel_Antonio`):**
    - **Mecánica:** Exploración top-down con 3 misiones ecológicas (`PR_MA_Game_Control`, `PR_MA_MisionArboles`, `PR_MA_Mision_Frutas`, `PR_MA_Mision_Tronco`, `676 GameObjects`, `256 SpriteRenderers`, `42 AudioClips`).
17. **Paseo de los Turistas — Preparación de Churchill (`level43` `PR_Paseo_Turistas_Intro` / `level44` `PR_Paseo_Turistas`):**
    - **Mecánica:** Atención de pedidos de clientes en el Paseo de los Turistas (`PR_PT_GameControl`, `PR_PT_Generar_Pedido_Churchill`, `PR_PT_Preparar_Churchill`, `PR_PT_Recibe_Churchill`, `548 GameObjects`).
18. **Río Tárcoles (`level45` `PR_Tarcoles_Intro` / `level46` `PR_Tarcoles`):**
    - **Mecánica:** Cruce del río y recolección de residuos esquivando cocodrilos y troncos (`PR_Tarcoles_GameCotroller`, `Frog`, `PR_T_LogDriver`, `PR_T_BagCounter`, `PR_T_Respawn`).

#### G. Provincia de San José (`SJ_*`)
19. **Finca Cafetalera (`level47` `SJ_FincaCafetalera_Intro` / `level48` `SJ_FincaCafetalera`):**
    - **Mecánica:** La escena con mayor densidad de objetos del juego (`1,527 GameObjects`, `738 SpriteRenderers`), ambientada en una finca cafetalera de Los Santos / Valle Central (`SJ_FC_GameController`, `SJ_FC_Generador_De_Cafe`, `SJ_FC_Cafe`, `SJ_FC_Player`).
20. **Museo del Oro Precolombino (`level49` `SJ_Museo_Oro_Intro` / `level50` `SJ_Museo_Oro`):**
    - **Mecánica:** Exploración de salas del museo, lectura de pistas históricas y colocación de piezas precolombinas en sus vitrinas (`SJ_Museo_Oro_GameControl`, `SJ_MO_PiezaOro`, `SJ_MO_Vitrina`, `SJ_MO_FechaHelp`, con `19 AudioClips` de descripciones históricas).
21. **Rafting en el Río General (`level51` `SJ_Rafting_Intro` / `level52` `SJ_Rafting`):**
    - **Mecánica:** Descenso de rápidos en balsa (`424 GameObjects`, `105 SpriteRenderers`, `24 Sprites` en `sharedassets52.assets`).

---

## 5. Resumen de Archivos Generados en `extracted_assets/`

| Ruta en `app/reverse_engineering/extracted_assets/` | Contenido |
| :--- | :--- |
| `textures/*.png` | **334 archivos PNG** correspondientes a todas las texturas `Texture2D` del juego. |
| `sprites/*.png` | **895 archivos PNG** recortados individualmente a partir de las coordenadas `m_Rect` de cada `Sprite`. |
| `audio/*.m4a` | **422 archivos de audio M4A (`ftypmp42`)** extraídos de los 40 bancos `.resource`. |
| `fonts/*.ttf`, `fonts/*.otf` | **15 archivos de fuentes tipográficas** (`4 .otf` + `11 .ttf`). |
| `text_assets/*` | **5 archivos `TextAsset`** (`3 .lua` + `2 .json`). |
| `scenes_hierarchy/level0.json` .. `level53.json` | **54 volcados JSON canónicos** + **54 volcados con nombre de escena (`levelN_<Nombre>.json`)** con el árbol completo de `GameObjects`, `RectTransforms`, `UI.Text`, `UI.Image`, `UI.Button`, `SpriteRenderer`, `AudioSource` y `MonoBehaviour`. |
| `scenes_index.json` | Índice maestro de las 54 escenas con conteos de objetos y scripts personalizados por escena. |
| `textures_catalog.json` | Catálogo detallado de los 349 objetos `Texture2D` (dimensiones, formato original, SHA-256, ruta PNG). |
| `sprites_catalog.json` | Catálogo detallado de los 895 objetos `Sprite` (rectángulo, pivote, `pixelsToUnits`, textura padre, SHA-256). |
| `audio_catalog.json` | Catálogo detallado de los 422 objetos `AudioClip` (duración, frecuencia, canales, offset/size en `.resource`, SHA-256). |
| `fonts_catalog.json` | Catálogo detallado de las 15 fuentes tipográficas embebidas. |
| `text_assets_catalog.json` | Catálogo detallado de los 5 `TextAsset` y sus rutas en `ResourceManager`. |
| `popquiz_database.json` | Base de datos íntegra con los 7 bancos provinciales de trivia (`68 preguntas`, opciones, respuesta correcta y audio). |
| `fungus_dialogues.json` | Base de datos íntegra con las **380 líneas de diálogo `Fungus.Say`** de todas las escenas, incluyendo personaje y locución. |
| `monoscripts_registry.json` | Registro completo de los **1,079 `MonoScript`** (`ClassID 115`) con su `namespace`, `className` y `assemblyName`. |
