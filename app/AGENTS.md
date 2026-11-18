# Contratos, Convenios y Arquitectura de Agentes (`AGENTS.md`)

## 1. Propósito del Proyecto
Realizar la **ingeniería inversa y reingeniería completa** del recurso educativo del MEP **"Costa Rica Pura Vida in Many Ways"** (`https://recursos.mep.go.cr/costa-rica-pura-vida-in-many-ways/`), originalmente compilado en **Unity WebGL (~2018)** y cuyos códigos fuente originales se extraviaron, para reconstruirlo en una arquitectura web moderna, autónoma y mantenible.

---

## 2. Reglas Estrictas de Estructura de Directorios (Convenio del Proyecto)

1. **`c:\xampp\htdocs\costa_rica_puravida_in_many_ways\documentacion\` (INTOCABLE):**
   - Carpeta exclusiva del usuario/sponsor/departamento.
   - **Prohibido** crear, modificar, mover o eliminar archivos dentro de esta carpeta.
   - Solo se podrá leer algún recurso específico de esta carpeta si el usuario lo autoriza explícitamente.
2. **`c:\xampp\htdocs\costa_rica_puravida_in_many_ways\app\` (DIRECTORIO DE IMPLEMENTACIÓN):**
   - Todo el trabajo de extracción, análisis, código fuente y activos del nuevo proyecto se desarrolla aquí.
   - Este archivo (`app/AGENTS.md`) centraliza los acuerdos, contratos técnicos, stack y definición del equipo de subagentes.
3. **`c:\xampp\htdocs\costa_rica_puravida_in_many_ways\app\docs\` (ÚNICA FUENTE DE VERDAD):**
   - Toda la documentación técnica, planes, inventarios de ingeniería inversa, GDD inverso y bitácora del proyecto (`MEMORY.md`) deben residir única y exclusivamente en `app/docs/`.

---

## 3. Contrato de Stack Tecnológico Destino

La nueva aplicación reconstruida debe cumplir estrictamente con el siguiente stack **100% Frontend / Client-Side**:

- **Framework UI:** React (con JavaScript ES6+)
- **Bundler / Entorno de Desarrollo:** Vite
- **Estilos y Diseño UI:** Tailwind CSS
- **Capa de Datos y Contenido:** Archivos **JSON** estáticos estructurados (`src/data/*.json`)
- **Persistencia Local:** `localStorage` del navegador (para guardar progreso del estudiante, monedas, provincias desbloqueadas y preferencias de audio)
- **Restricción Arquitectónica:** **Cero bases de datos y cero backend.** La aplicación debe ser 100% autónoma, estática, rápida y desplegable en cualquier servidor web estático (como `recursos.mep.go.cr`).

---

## 4. Equipo de Trabajo de Subagentes

| # | Subagente | Rol | Responsabilidad |
| :-: | :--- | :--- | :--- |
| **1** | `webgl-extractor` | **Especialista en Adquisición y Desempaquetado WebGL** | Descargar los paquetes `.unityweb`, `.json` y `UnityLoader.js` del servidor del MEP y descomprimir el contenedor `UnityWebData1.0`. |
| **2** | `asset-archaeologist` | **Arqueólogo de Recursos Multimedia y Escenas** | Extraer y catalogar el 100% de sprites/texturas (PNG), locuciones/música/efectos (WAV/MP3/OGG), fuentes tipográficas, `TextAssets` y jerarquías de escenas usando `UnityPy` / `AssetRipper`. |
| **3** | `il2cpp-reverser` | **Analista de Lógica IL2CPP / WebAssembly** | Analizar `global-metadata.dat` y el binario `.wasm` para recuperar nombres de clases C#, métodos, estados, strings de preguntas/diálogos y reglas algorítmicas de cada minijuego. |
| **4** | `gameplay-analyst` | **Analista Funcional y Modelador JSON** | Documentar el GDD inverso pantalla por pantalla y estructurar todos los datos pedagógicos (provincias, atractivos, diálogos, preguntas, minijuegos) en esquemas **JSON** limpios. |
| **5** | `lead-reconstructor` | **Arquitecto React + JS + Vite + Tailwind + JSON** | Construir la aplicación web moderna utilizando el stack acordado, integrando los assets originales recuperados y los motores de minijuegos alimentados por JSON. |
| **6** | `qa-documenter` | **Auditor de Paridad 1:1 y Documentación** | Auditar que la experiencia visual, sonora, funcional y pedagógica iguale o supere al original de 2018, manteniendo actualizada la Única Fuente de Verdad en `app/docs/`. |
