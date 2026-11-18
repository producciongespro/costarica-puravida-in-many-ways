# Reporte Técnico — Fase 1: Adquisición Forense y Desempaquetado WebGL

**Proyecto:** *Costa Rica Pura Vida in Many Ways* (MEP)  
**Especialista:** `webgl-extractor`  
**Fecha de Ejecución:** 17 de noviembre de 2026  
**Directorio de Trabajo Técnico:** `c:\xampp\htdocs\costa_rica_puravida_in_many_ways\app\reverse_engineering`

---

## 1. Resumen Ejecutivo

Se completó la adquisición forense íntegra del build de producción alojado en `https://recursos.mep.go.cr/costa-rica-pura-vida-in-many_ways/` y su desempaquetado en dos niveles:

1. **Nivel 1 — Descompresión Gzip y extracción del contenedor `UnityWebData1.0` (`3f4e1de2ed256064ef2b4df785daf649.unityweb`):** Se descomprimieron los 4 paquetes `.unityweb` (todos comprimidos con **Gzip**, magic `0x1F8B`) y se extrajeron los **48 archivos** empaquetados en el contenedor `UnityWebData1.0` (`96,478,582 bytes`), incluyendo `Il2CppData/Metadata/global-metadata.dat`, `data.unity3d`, descriptores XML del linker IL2CPP y 40 bancos multimedia `.resource` (contenedores MP4/ISO Media `ftypmp42`).
2. **Nivel 2 — Desempaquetado del bundle interno `UnityFS` (`data.unity3d`):** Se detectó que Unity 2017.3 empaquetó los activos serializados dentro de un contenedor `UnityFS` v6 comprimido con **LZ4HC** (`flags = 0x43`, `2,429 bloques`). Se desarrolló y ejecutó un descompresor específico (`unpack_unityfs.mjs`) que extrajo los **112 nodos internos** (`318,251,828 bytes` / ~303.51 MB descomprimidos), liberando directamente `globalgamemanagers`, `globalgamemanagers.assets`, `resources.assets`, `Resources/unity_builtin_extra`, las **54 escenas (`level0` a `level53`)** y los **54 archivos `sharedassets0.assets` a `sharedassets53.assets`**.

---

## 2. Metadatos del Host y Manifiesto del Build

### 2.1 Parámetros de `index.html` y Servidor Remoto
- **URL Base:** `https://recursos.mep.go.cr/costa-rica-pura-vida-in-many-ways/`
- **Título del Documento:** `Unity WebGL Player | Pura Vida In Many Ways`
- **Dimensiones Nativas del Canvas (`#gameContainer`):** `960 x 620 px`
- **Fecha de Compilación/Publicación (`Last-Modified`):** `Mon, 21 Jan 2019 21:31:35 GMT`
- **Script Cargador (`UnityLoader.js`):** `Build/b14b32a200649d0650c1a6ff3db39cf4.js` (`155,979 bytes`)
- **Manifiesto JSON:** `Build/e3bd147cb76cb3d8c5882b29795ab98e.json` (`494 bytes`)
- **Verificación de `StreamingAssets/`:** El servidor responde `HTTP/1.1 404 Not Found` ante `HEAD /costa-rica-pura-vida-in-many-ways/StreamingAssets/`. No se utilizan `StreamingAssets` externos; todos los recursos de streaming de audio/video (`.resource`) están embebidos dentro del contenedor `UnityWebData1.0`.

### 2.2 Contenido de `Build/e3bd147cb76cb3d8c5882b29795ab98e.json`
```json
{
  "companyName": "MEP",
  "productName": "Pura Vida In Many Ways",
  "dataUrl": "3f4e1de2ed256064ef2b4df785daf649.unityweb",
  "asmCodeUrl": "7023bf65fe7e685ba87e9e53540076d1.unityweb",
  "asmMemoryUrl": "ce4318b8118e49aa68e866606e3dd9a1.unityweb",
  "asmFrameworkUrl": "da52a19b01e5fa7edc94771fe74e44b2.unityweb",
  "TOTAL_MEMORY": 268435456,
  "graphicsAPI": ["WebGL 2.0", "WebGL 1.0"],
  "webglContextAttributes": {"preserveDrawingBuffer": false},
  "splashScreenStyle": "Dark",
  "backgroundColor": "#000000"
}
```

> **Hallazgo Arquitectónico Clave:** El build utiliza el backend **IL2CPP compilado a `asm.js`** (`asmCodeUrl`, `asmMemoryUrl`, `asmFrameworkUrl`) en lugar de WebAssembly (`.wasm`), con un heap preasignado (`TOTAL_MEMORY`) de `268,435,456 bytes` (**256 MB**).

---

## 3. Inventario de Paquetes Adquiridos (`raw_build`) y Descompresión Primitiva

Todos los archivos `.unityweb` tenían cabecera mágica `0x1F 0x8B 0x08` (**Gzip estándar**).

| Rol en Manifiesto | Archivo en `raw_build/Build` | Compresión | Tamaño Comprimido (Bytes) | Tamaño Descomprimido (Bytes) | Archivo de Salida en `unpacked_data` | SHA-256 (Descomprimido) |
| :--- | :--- | :---: | ---: | ---: | :--- | :--- |
| `dataUrl` | `3f4e1de2ed256064ef2b4df785daf649.unityweb` | Gzip | 80,152,660 | 96,478,582 | *(48 archivos extraídos)* | `2f762b1f12ed347a59cbd50cd7bd0496976528ed5bd97810c4042385c398233d` |
| `asmCodeUrl` | `7023bf65fe7e685ba87e9e53540076d1.unityweb` | Gzip | 6,761,484 | 35,945,320 | `build.asm.js` | `dffa28fe9bc9228f08a02a606719578ed383f9f0e8c01259be22ea21fe9139b8` |
| `asmMemoryUrl` | `ce4318b8118e49aa68e866606e3dd9a1.unityweb` | Gzip | 818,523 | 2,884,157 | `build.mem` | `7dad04ae0a922f508230fadd68e2af2d56547e81e0631f10e4fcfbeedbc08bae` |
| `asmFrameworkUrl` | `da52a19b01e5fa7edc94771fe74e44b2.unityweb` | Gzip | 93,804 | 457,970 | `build.framework.js` | `8a7bbd2e18038c73652e481d412988f9135b170dcb5d3de002dc16856fadedbc` |
| `UnityLoader` | `b14b32a200649d0650c1a6ff3db39cf4.js` | Texto JS | 155,979 | 155,979 | *(en `raw_build/Build`)* | — |
| `Manifest` | `e3bd147cb76cb3d8c5882b29795ab98e.json` | JSON | 494 | 494 | *(en `raw_build/Build`)* | — |

Archivos adicionales descargados en `raw_build/TemplateData`:
- `favicon.ico` (`13,275 bytes`)
- `style.css` (`1,686 bytes`)
- `UnityProgress.js` (`1,186 bytes`)
- `progressLogo.Dark.png`, `progressEmpty.Dark.png`, `progressFull.Dark.png`, `progressLogo.Light.png`, `progressEmpty.Light.png`, `progressFull.Light.png`, `webgl-logo.png`, `fullscreen.png`

---

## 4. Identificación Forense de Versiones y Cabeceras Binarias

### 4.1 Versión Exacta de Unity Engine
- **Versión del Editor / Runtime en `data.unity3d` y `globalgamemanagers`:** **`2017.3.1f1`**
- **Versión en `Resources/unity_default_resources`:** `2017.3.0b10` (paquete base de recursos por defecto de la rama 2017.3)
- **Formato de Archivos Serializados (`globalgamemanagers`, `level0..53`, `sharedassets0..53.assets`, `resources.assets`):**
  - `SerializedFile` Format Version: **`17`** (`0x00000011`)
  - Endianness: **`LittleEndian`** (`0x00`)
- **Cabecera de `data.unity3d`:**
  - Magic: `UnityFS\0`
  - Archive Version: `6`
  - Bundle Version: `5.x.x`
  - Minimum Revision: `2017.3.1f1`
  - Tamaño Comprimido: `28,183,211 bytes`
  - Flags: `0x43` (`compressionType = 3` -> **LZ4HC**, directorio al inicio)
  - Bloques LZ4: `2,429 bloques`
  - Tamaño Descomprimido Total: `318,251,828 bytes` (**303.51 MB**)
  - Nodos Internos: **112 archivos**
- **Cabecera de `Il2CppData/Metadata/global-metadata.dat`:**
  - Magic: `0xFAB11BAF` (`af 1b b1 fa` en Little-Endian)
  - Metadata Format Version: **`24`**
  - Tamaño: `4,391,196 bytes` (**4.19 MB**)

---

## 5. Lista Completa de Archivos Extraídos en `unpacked_data`

### 5.1 Nivel 1: Archivos Extraídos del Contenedor `UnityWebData1.0` (48 archivos)

El encabezado `UnityWebData1.0\0` tiene un `head_size` de `1,706 bytes` y contiene los siguientes 48 archivos:

| # | Nombre Interno (`UnityWebData1.0`) | Offset | Tamaño (Bytes) | Formato / Cabecera Detectada | SHA-256 |
| --: | :--- | ---: | ---: | :--- | :--- |
| 1 | `Resources/unity_default_resources` | 1,706 | 3,261,580 | `SerializedFile` v17 (`2017.3.0b10`) | `82203c5931d9be43...` |
| 2 | `Managed/mono/2.0/machine.config` | 3,263,286 | 27,625 | XML Mono Config | `531d0d5bc30466a8...` |
| 3 | `Il2CppData/Metadata/global-metadata.dat` | 3,290,911 | 4,391,196 | `Il2CppGlobalMetadata` v24 (`0xFAB11BAF`) | `a0107c92d7ead335...` |
| 4 | `boot.config` | 7,682,107 | 27 | Texto (`wait-for-native-debugger=0`) | `ca5f05780f0a824b...` |
| 5 | `data.unity3d` | 7,682,134 | 28,183,211 | `UnityFS` v6 LZ4HC (`2017.3.1f1`) | `1b5dd5860cff9d10...` |
| 6 | `methods_pointedto_by_uievents.xml` | 35,865,345 | 73,160 | XML Linker (Eventos UI -> Métodos C#) | `bbc3d21022f443a5...` |
| 7 | `preserved_derived_types.xml` | 35,938,505 | 26,642 | XML Linker (Clases C# preservadas) | `180b6be90be27bce...` |
| 8 | `resources.resource` | 35,965,147 | 12,398 | Stream Multimedia MP4 (`ftypmp42`) | `df7e437087779532...` |
| 9 | `sharedassets0.resource` | 35,977,545 | 29,380,575 | Stream Multimedia MP4 (`ftypmp42`) | `71769b86d3f3511c...` |
| 10 | `sharedassets11.resource` | 65,358,120 | 349,218 | Stream Multimedia MP4 (`ftypmp42`) | `52e68d558cd2daa8...` |
| 11 | `sharedassets17.resource` | 65,707,338 | 63,100 | Stream Multimedia MP4 (`ftypmp42`) | `3eaddb26fb9cc9dc...` |
| 12 | `sharedassets18.resource` | 65,770,438 | 1,299,317 | Stream Multimedia MP4 (`ftypmp42`) | `52f5fb5e17ec2fe5...` |
| 13 | `sharedassets19.resource` | 67,069,755 | 431,221 | Stream Multimedia MP4 (`ftypmp42`) | `4067f14a14c28529...` |
| 14 | `sharedassets20.resource` | 67,500,976 | 172,846 | Stream Multimedia MP4 (`ftypmp42`) | `78937505faa08589...` |
| 15 | `sharedassets23.resource` | 67,673,822 | 294,164 | Stream Multimedia MP4 (`ftypmp42`) | `4b7f836d588a468b...` |
| 16 | `sharedassets24.resource` | 67,967,986 | 236,696 | Stream Multimedia MP4 (`ftypmp42`) | `fd164475ecab582f...` |
| 17 | `sharedassets25.resource` | 68,204,682 | 222,813 | Stream Multimedia MP4 (`ftypmp42`) | `8345ea055ebc1ffe...` |
| 18 | `sharedassets26.resource` | 68,427,495 | 2,388,855 | Stream Multimedia MP4 (`ftypmp42`) | `81d4c39866c6b532...` |
| 19 | `sharedassets27.resource` | 70,816,350 | 346,183 | Stream Multimedia MP4 (`ftypmp42`) | `838d9b10e310d84f...` |
| 20 | `sharedassets28.resource` | 71,162,533 | 123,426 | Stream Multimedia MP4 (`ftypmp42`) | `c88a0f964d1bb9db...` |
| 21 | `sharedassets29.resource` | 71,285,959 | 434,199 | Stream Multimedia MP4 (`ftypmp42`) | `ec4bcd1749c8632a...` |
| 22 | `sharedassets3.resource` | 71,720,158 | 68,879 | Stream Multimedia MP4 (`ftypmp42`) | `6a23935824312d6c...` |
| 23 | `sharedassets30.resource` | 71,789,037 | 4,016,634 | Stream Multimedia MP4 (`ftypmp42`) | `97d2e50a69609870...` |
| 24 | `sharedassets31.resource` | 75,805,671 | 343,444 | Stream Multimedia MP4 (`ftypmp42`) | `701d1228a6933447...` |
| 25 | `sharedassets32.resource` | 76,149,115 | 180,879 | Stream Multimedia MP4 (`ftypmp42`) | `a7f1b98b1cbf1670...` |
| 26 | `sharedassets33.resource` | 76,329,994 | 150,888 | Stream Multimedia MP4 (`ftypmp42`) | `1d1ee5d40f5810dd...` |
| 27 | `sharedassets34.resource` | 76,480,882 | 100,004 | Stream Multimedia MP4 (`ftypmp42`) | `a4d13f25030193a8...` |
| 28 | `sharedassets36.resource` | 76,580,886 | 4,876,304 | Stream Multimedia MP4 (`ftypmp42`) | `d9fe0d40d4dd2fa4...` |
| 29 | `sharedassets37.resource` | 81,457,190 | 611,268 | Stream Multimedia MP4 (`ftypmp42`) | `1df461626dd42f6b...` |
| 30 | `sharedassets38.resource` | 82,068,458 | 191,541 | Stream Multimedia MP4 (`ftypmp42`) | `11036ffd8f550672...` |
| 31 | `sharedassets39.resource` | 82,259,999 | 259,607 | Stream Multimedia MP4 (`ftypmp42`) | `5e95847a8298529b...` |
| 32 | `sharedassets4.resource` | 82,519,606 | 361,361 | Stream Multimedia MP4 (`ftypmp42`) | `ac8ecd86806c524c...` |
| 33 | `sharedassets40.resource` | 82,880,967 | 150,446 | Stream Multimedia MP4 (`ftypmp42`) | `820311935fa2d3cc...` |
| 34 | `sharedassets41.resource` | 83,031,413 | 679,303 | Stream Multimedia MP4 (`ftypmp42`) | `792cfe2375a1414a...` |
| 35 | `sharedassets42.resource` | 83,710,716 | 2,702,774 | Stream Multimedia MP4 (`ftypmp42`) | `10f0f5cb2d757033...` |
| 36 | `sharedassets43.resource` | 86,413,490 | 816,187 | Stream Multimedia MP4 (`ftypmp42`) | `e9bb9f832d6e85e3...` |
| 37 | `sharedassets44.resource` | 87,229,677 | 504,001 | Stream Multimedia MP4 (`ftypmp42`) | `bf3b37cc0ecb1599...` |
| 38 | `sharedassets45.resource` | 87,733,678 | 434,611 | Stream Multimedia MP4 (`ftypmp42`) | `0ec4c51df2f2416b...` |
| 39 | `sharedassets46.resource` | 88,168,289 | 86,738 | Stream Multimedia MP4 (`ftypmp42`) | `ef94e2a5d00070e7...` |
| 40 | `sharedassets47.resource` | 88,255,027 | 648,130 | Stream Multimedia MP4 (`ftypmp42`) | `827d8750c60d8184...` |
| 41 | `sharedassets48.resource` | 88,903,157 | 2,085,618 | Stream Multimedia MP4 (`ftypmp42`) | `f86c4f0fd82d2315...` |
| 42 | `sharedassets49.resource` | 90,988,775 | 409,115 | Stream Multimedia MP4 (`ftypmp42`) | `dfed05c51d5332e3...` |
| 43 | `sharedassets5.resource` | 91,397,890 | 14,448 | Stream Multimedia MP4 (`ftypmp42`) | `c0b137c685786079...` |
| 44 | `sharedassets50.resource` | 91,412,338 | 1,445,840 | Stream Multimedia MP4 (`ftypmp42`) | `cc26f0a1430886ac...` |
| 45 | `sharedassets51.resource` | 92,858,178 | 96,490 | Stream Multimedia MP4 (`ftypmp42`) | `d7f548a281912180...` |
| 46 | `sharedassets6.resource` | 92,954,668 | 140,997 | Stream Multimedia MP4 (`ftypmp42`) | `17d572df532b8177...` |
| 47 | `sharedassets7.resource` | 93,095,665 | 3,382,847 | Stream Multimedia MP4 (`ftypmp42`) | `10ba0b46ebb2e056...` |
| 48 | `UnityEngine.xml` | 96,478,512 | 70 | XML Linker (`UnityEngine`) | `956a33ad3d17c5e2...` |

---

### 5.2 Nivel 2: Nodos Internos Extraídos de `data.unity3d` (112 archivos)

Al descomprimir los 2,429 bloques LZ4HC de `data.unity3d`, se extrajeron en `unpacked_data` los **112 archivos serializados internos** (`318,251,828 bytes` en total), todos con cabecera `SerializedFile` v17 (`2017.3.1f1`):

#### A. Gestores Globales y Recursos Centrales (4 nodos)
| Nombre del Nodo | Offset en Stream | Tamaño (Bytes) | Metadata Size | Data Offset |
| :--- | ---: | ---: | ---: | ---: |
| `globalgamemanagers` | 0 | 92,364 | 1,168 | 4,096 |
| `Resources/unity_builtin_extra` | 92,364 | 330,348 | 677 | 4,096 |
| `globalgamemanagers.assets` | 422,712 | 275,912 | 21,513 | 21,536 |
| `resources.assets` | 310,112,068 | 8,139,760 | 13,251 | 13,280 |

#### B. Escenas (`level0` a `level53` — 54 escenas) y Activos Compartidos (`sharedassets0.assets` a `sharedassets53.assets` — 54 archivos)

| Índice `N` | Escena (`levelN`) | Tamaño `levelN` (Bytes) | Paquete `sharedassetsN.assets` | Tamaño `sharedassetsN` (Bytes) | Stream `.resource` Asociado |
| --: | :--- | ---: | :--- | ---: | :--- |
| 0 | `level0` | 75,116 | `sharedassets0.assets` | 3,584,116 | `sharedassets0.resource` (29.38 MB) |
| 1 | `level1` | 407,468 | `sharedassets1.assets` | 74,637,120 | — |
| 2 | `level2` | 409,972 | `sharedassets2.assets` | 5,639,108 | — |
| 3 | `level3` | 76,984 | `sharedassets3.assets` | 387,236 | `sharedassets3.resource` (68.88 KB) |
| 4 | `level4` | 95,412 | `sharedassets4.assets` | 5,911,660 | `sharedassets4.resource` (361.36 KB) |
| 5 | `level5` | 77,812 | `sharedassets5.assets` | 6,380 | `sharedassets5.resource` (14.45 KB) |
| 6 | `level6` | 76,468 | `sharedassets6.assets` | 6,488 | `sharedassets6.resource` (141.00 KB) |
| 7 | `level7` | 230,700 | `sharedassets7.assets` | 10,696,100 | `sharedassets7.resource` (3.38 MB) |
| 8 | `level8` | 75,260 | `sharedassets8.assets` | 6,172 | — |
| 9 | `level9` | 123,340 | `sharedassets9.assets` | 6,214,928 | — |
| 10 | `level10` | 76,620 | `sharedassets10.assets` | 6,172 | — |
| 11 | `level11` | 91,336 | `sharedassets11.assets` | 116,312 | `sharedassets11.resource` (349.22 KB) |
| 12 | `level12` | 121,420 | `sharedassets12.assets` | 15,953,716 | — |
| 13 | `level13` | 91,488 | `sharedassets13.assets` | 6,628 | — |
| 14 | `level14` | 122,956 | `sharedassets14.assets` | 479,536 | — |
| 15 | `level15` | 91,460 | `sharedassets15.assets` | 6,640 | — |
| 16 | `level16` | 145,596 | `sharedassets16.assets` | 7,373,940 | — |
| 17 | `level17` | 87,084 | `sharedassets17.assets` | 116,000 | `sharedassets17.resource` (63.10 KB) |
| 18 | `level18` | 237,316 | `sharedassets18.assets` | 1,749,000 | `sharedassets18.resource` (1.30 MB) |
| 19 | `level19` | 82,676 | `sharedassets19.assets` | 1,744,688 | `sharedassets19.resource` (431.22 KB) |
| 20 | `level20` | 157,764 | `sharedassets20.assets` | 10,435,724 | `sharedassets20.resource` (172.85 KB) |
| 21 | `level21` | 82,696 | `sharedassets21.assets` | 6,640 | — |
| 22 | `level22` | 387,260 | `sharedassets22.assets` | 7,612 | — |
| 23 | `level23` | 86,068 | `sharedassets23.assets` | 1,340,012 | `sharedassets23.resource` (294.16 KB) |
| 24 | `level24` | 172,324 | `sharedassets24.assets` | 6,807,832 | `sharedassets24.resource` (236.70 KB) |
| 25 | `level25` | 90,792 | `sharedassets25.assets` | 116,172 | `sharedassets25.resource` (222.81 KB) |
| 26 | `level26` | 279,876 | `sharedassets26.assets` | 63,821,528 | `sharedassets26.resource` (2.39 MB) |
| 27 | `level27` | 89,740 | `sharedassets27.assets` | 116,168 | `sharedassets27.resource` (346.18 KB) |
| 28 | `level28` | 237,564 | `sharedassets28.assets` | 1,321,884 | `sharedassets28.resource` (123.43 KB) |
| 29 | `level29` | 86,756 | `sharedassets29.assets` | 1,870,480 | `sharedassets29.resource` (434.20 KB) |
| 30 | `level30` | 488,796 | `sharedassets30.assets` | 7,053,444 | `sharedassets30.resource` (4.02 MB) |
| 31 | `level31` | 86,040 | `sharedassets31.assets` | 1,365,520 | `sharedassets31.resource` (343.44 KB) |
| 32 | `level32` | 556,780 | `sharedassets32.assets` | 1,081,476 | `sharedassets32.resource` (180.88 KB) |
| 33 | `level33` | 89,868 | `sharedassets33.assets` | 116,152 | `sharedassets33.resource` (150.89 KB) |
| 34 | `level34` | 203,540 | `sharedassets34.assets` | 6,801,816 | `sharedassets34.resource` (100.00 KB) |
| 35 | `level35` | 5,844 | `sharedassets35.assets` | 4,216 | — |
| 36 | `level36` | 222,132 | `sharedassets36.assets` | 4,323,000 | `sharedassets36.resource` (4.88 MB) |
| 37 | `level37` | 91,300 | `sharedassets37.assets` | 116,160 | `sharedassets37.resource` (611.27 KB) |
| 38 | `level38` | 206,612 | `sharedassets38.assets` | 2,816,404 | `sharedassets38.resource` (191.54 KB) |
| 39 | `level39` | 86,492 | `sharedassets39.assets` | 1,194,944 | `sharedassets39.resource` (259.61 KB) |
| 40 | `level40` | 116,452 | `sharedassets40.assets` | 213,972 | `sharedassets40.resource` (150.45 KB) |
| 41 | `level41` | 87,180 | `sharedassets41.assets` | 116,556 | `sharedassets41.resource` (679.30 KB) |
| 42 | `level42` | 470,392 | `sharedassets42.assets` | 8,038,644 | `sharedassets42.resource` (2.70 MB) |
| 43 | `level43` | 87,768 | `sharedassets43.assets` | 1,893,852 | `sharedassets43.resource` (816.19 KB) |
| 44 | `level44` | 322,564 | `sharedassets44.assets` | 17,116,748 | `sharedassets44.resource` (504.00 KB) |
| 45 | `level45` | 86,588 | `sharedassets45.assets` | 116,636 | `sharedassets45.resource` (434.61 KB) |
| 46 | `level46` | 133,976 | `sharedassets46.assets` | 3,756,376 | `sharedassets46.resource` (86.74 KB) |
| 47 | `level47` | 87,736 | `sharedassets47.assets` | 2,134,292 | `sharedassets47.resource` (648.13 KB) |
| 48 | `level48` | 652,148 | `sharedassets48.assets` | 878,916 | `sharedassets48.resource` (2.09 MB) |
| 49 | `level49` | 88,204 | `sharedassets49.assets` | 116,276 | `sharedassets49.resource` (409.12 KB) |
| 50 | `level50` | 279,484 | `sharedassets50.assets` | 11,255,612 | `sharedassets50.resource` (1.45 MB) |
| 51 | `level51` | 89,772 | `sharedassets51.assets` | 116,116 | `sharedassets51.resource` (96.49 KB) |
| 52 | `level52` | 238,716 | `sharedassets52.assets` | 8,970,524 | — |
| 53 | `level53` | 77,812 | `sharedassets53.assets` | 6,280 | — |

---

## 6. Hallazgos Preliminares de Arquitectura (Metadata XML de IL2CPP)

Los archivos `preserved_derived_types.xml` y `methods_pointedto_by_uievents.xml` extraídos del contenedor revelan los ensamblados, plugins y módulos de juego antes incluso de decompilar `global-metadata.dat`:

1. **Ensamblados Principales:**
   - `Assembly-CSharp`: Lógica principal del juego, minijuegos por provincia, sistema de trivia (`PopQuiz`, `PreguntaController`), avatar (`AvatarParts`, `LoadAvatar`, `SeleccionarGeneroPersonaje`), mapa principal (`MCR_GameControl`, `MCR_CargarEscena`, `MCR_MostrarJuegos`), persistencia local y remota (`DatabaseManager`, `LocalDataBase`, `ParseManager`, `SaveGame`).
   - `Assembly-CSharp-firstpass`: Controladores base 2D (`PlatformerCharacter2D`, `CrossPlatformInput`, `SimpleMovement`, `Jump`, `Walk`).
   - **Librerías y Frameworks Integrados:**
     - **Fungus** (`Fungus.Flowchart`, `Fungus.SayDialog`, `Fungus.MenuDialog`, `Fungus.Character`, `Fungus.ExecuteLua`): Motor narrativo y de diálogos interactivos.
     - **Tiled2Unity** (`Tiled2Unity.TiledMap`, `TileLayer`, `PolygonObject`, `SpriteDepthInMap`): Importación de mapas ortogonales/top-down diseñados en Tiled.
     - **DOTween / DOTweenPro** y **LeanTween**: Sistemas de interpolación y animación de UI/escena.
     - **Parse.Unity** (`ParseInitializeBehaviour`): SDK de backend Parse.
2. **Módulos de Minijuegos Regionales Identificados en `preserved_derived_types.xml`:**
   - **Mapa Costa Rica (`MCR_*`):** `MCR_GameControl`, `MCR_Activate_Chatacter`, `MCR_CargarEscena`, `MCR_MostrarJuegos`
   - **San José (`SJ_*`):** Finca Cafetalera (`SJ_FC_GameController`, `SJ_FC_Generador_De_Cafe`, `SJ_FC_Player`) y Museo del Oro (`SJ_Museo_Oro_GameControl`, `SJ_MO_FechaHelp`)
   - **Cartago (`CT_*`):** Sanatorio Durán (`CT_Sanatorio_Duran_GameControl`, `CT_Sanatorio_Duran_Mision_Puertas`, `CT_Sanatorio_Duran_Mision2_Fantasma`, `CT_Sanatorio_Duran_Mision3`) y Volcanes (`CT_Volcanes_GameControl`, `CT_Volcanes_Generador`)
   - **Heredia (`HD_*` / `TayassuGames.*`):** Entrega de Flores (`HD_Entrega_Flores_Game_Control`), Mascarada (`HD_MascaradaController`) y Mountain Bike (`TayassuGames.HD_MontainBikeController`)
   - **Guanacaste (`GN_*` / `GNBH_*`):** Barra Honda / Murciélago (`GNBH_Vuelo`, `GNBH_Caminar`, `GNBH_Saltar`), Buceo (`GN_Buceo_GameController`, `Diving_Player`, `GN_Tomar_Fotos`) y Surf en Tamarindo (`GN_ST_GameControl`, `GN_Surf_Player`, `GN_ST_PersigueOla`)
   - **Puntarenas (`PR_*`):** Manuel Antonio (`PR_MA_Game_Control`, `PR_MA_MisionArboles`, `PR_MA_Mision_Frutas`, `PR_MA_Mision_Tronco`), Paseo de los Turistas / Churchill (`PR_PT_GameControl`, `PR_PT_Generar_Pedido_Churchill`) y Río Tárcoles (`PR_Tarcoles_GameCotroller`, `Frog`, `PR_T_LogDriver`)
   - **Limón (`LM_*`):** Cocina Caribeña (`LM_Cocina_Controller`, `LM_Recipes`, `LM_DragHandler`), Desove de Tortugas (`LM_DV_GameController`, `LM_DV_BabyTurtle`, `LM_DV_Predator`) y Canales de Tortuguero / Manatí (`LM_T_GameControl`, `LM_T_Manati`, `LM_T_Mov_Bote`)

---

## 7. Herramientas y Scripts Generados

- `c:\xampp\htdocs\costa_rica_puravida_in_many_ways\app\reverse_engineering\unpack_unityweb.py`: Script en Python para descompresión Gzip/Brotli y extracción del contenedor `UnityWebData1.0`.
- `c:\xampp\htdocs\costa_rica_puravida_in_many_ways\app\reverse_engineering\unpack_unityweb.mjs`: Script ejecutable en Node.js (utilizado en el entorno local) que descomprimió los paquetes `.unityweb`, extrajo los 48 archivos de `UnityWebData1.0` y generó `unpacked_data/extraction_summary.json`.
- `c:\xampp\htdocs\costa_rica_puravida_in_many_ways\app\reverse_engineering\unpack_unityfs.mjs`: Desempaquetador en Node.js con descompresor LZ4/LZ4HC integrado que extrajo los 112 nodos internos de `data.unity3d` (`UnityFS` v6) hacia `unpacked_data` y generó `unpacked_data/data_unity3d_nodes.json`.
