# Banco de trabajo OpenDSS en la nube (OpenDSS Cloud Workbench)

[繁體中文](README.md) | [简体中文](README.zh-CN.md) | [English](README.en.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md) | [Português (Brasil)](README.pt-BR.md)

Sitio oficial: https://opendss.esperar-ai.org

Interfaz web que conserva los menús nativos de OpenDSS y su flujo de trabajo con scripts. Usa una versión WASM de EPRI OpenDSS (la versión oficial en C++, VersionC) y calcula en Cloudflare Workers. El sitio es público y no requiere iniciar sesión.

## Uso

Abra un archivo `.dss` con los archivos que referencia, o una carpeta de modelo completa; elija el script principal y compile. Puede ejecutar un flujo de potencia (Snapshot) o un estudio de fallas (FaultStudy), o usar «Según el script» para ejecutar modos como Daily o Harmonics. Consulte las tensiones en barras (Bus Voltages), las corrientes y potencias de los elementos en el terminal 1 y las corrientes de falla (Fault Currents), y exporte reportes en CSV, JSON o texto de Show/Export.

La pestaña «Graficar» ofrece un gráfico de tensiones en barras, un diagrama del circuito (Plot Circuit, requiere Buscoords), un perfil de tensión (Plot Profile, requiere un EnergyMeter) y curvas (Plot Monitor, puede graficar cualquier reporte CSV).

Cada operación vuelve a compilar el script principal y luego aplica los comandos adicionales. Para generar un reporte de texto después de modificar elementos, escriba en orden `Edit …`, `Solve`, `Show …`. El botón Resolver resuelve en el modo seleccionado después de ejecutar los comandos adicionales.

Los borradores se guardan en el navegador actual y no se sincronizan entre dispositivos. Guárdelos con «Archivo → Descargar proyecto completo» y abra el `.opendss.json` en otro dispositivo. El modelo solo se envía a la nube al compilar o resolver, y nunca se guarda en almacenamiento permanente.

Las rutas del modelo deben ser relativas. Cada ejecución admite hasta 100 archivos y 2 MB; la salida se limita a 2.000 barras y 5.000 elementos. Los cálculos grandes o largos siguen sujetos a los límites de CPU y memoria del Worker. No se admiten DLL nativas, COM, comandos externos del sistema ni Actors en paralelo. La compatibilidad completa con todas las funciones nativas aún no se ha verificado.

## Idiomas de la interfaz

La interfaz admite 7 idiomas: 繁體中文, 简体中文, English, 日本語, 한국어, Español y Português (Brasil). Por defecto sigue el idioma del navegador (las configuraciones de Taiwán, Hong Kong y chino tradicional muestran chino tradicional; otras configuraciones de chino muestran chino simplificado; si no hay un idioma correspondiente se usa el inglés). Puede cambiarlo en la esquina superior derecha de la barra de título, y la elección queda guardada en el navegador. En las interfaces que no están en inglés, los términos técnicos llevan el inglés al lado (por ejemplo «Tensiones en barras Bus Voltages»); los comandos de OpenDSS, los nombres de elementos y el contenido de los reportes se mantienen en inglés.

Los diccionarios de textos están en [lib/i18n.ts](lib/i18n.ts) y [lib/locales/](lib/locales/): el código se escribe con el texto original en chino tradicional dentro de `t()`, y cada diccionario usa ese texto original como clave. Los mensajes de error del servidor también se traducen allí. Para agregar un idioma, añada una entrada en `languages`, un diccionario en `lib/locales/` y actualice `detectLang` y `legacyEncoding`. Los idiomas distintos del chino tradicional y el inglés fueron traducidos por Claude y aún no han sido revisados por hablantes nativos; se agradecen los comentarios sobre la terminología.

Este README también está disponible en los idiomas listados arriba. La versión en chino tradicional es la de referencia.

## Desarrollo local

```sh
npm ci
npm run dev -- --host 127.0.0.1
npx tsc --noEmit
python scripts/check-engine.py   # requiere el servidor dev en marcha
node engine/port/test/run.mjs    # verifica el WASM directamente: fuente 500.21 kW, falla en el extremo de carga 22,902.3 A
npx tsx scripts/check-i18n.ts     # completitud de los diccionarios de cada idioma
node scripts/visual-check.mjs    # requiere el servidor dev en marcha: pruebas de interacción y capturas en escritorio/portátil/tableta/teléfono (incluye gráficos y cambio a inglés)
npm run build
```

Todas las verificaciones se ejecutan localmente (o en un entorno de desarrollo en la nube); GitHub Actions solo se encarga del despliegue.

La página principal y la API de cálculo pueden usarse de forma anónima. Cada solicitud ejecuta el modelo en su propia instancia WASM; la API mantiene la verificación de mismo origen y la validación de rutas y tamaños de archivo, y no almacena tablas de usuarios ni archivos de modelo.

El origen del WASM, cómo reconstruirlo, los avisos de licencia y la validación numérica están en [engine/port/README.md](engine/port/README.md).

## Despliegue

Al hacer push a `main`, `.github/workflows/deploy.yml` compila el sitio y lo publica con `wrangler deploy` como el Cloudflare Worker `opendss` (el nombre se define en `vite.config.ts`), vinculado a `opendss.esperar-ai.org` mediante un dominio personalizado de Workers. Los cambios que solo afectan a la documentación o a `.claude/` no generan un despliegue; también puede ejecutarse manualmente desde la página de Actions.

Secrets del repo necesarios: `CLOUDFLARE_API_TOKEN` (un token de API creado con la plantilla «Edit Cloudflare Workers» de Cloudflare) y `CLOUDFLARE_ACCOUNT_ID`.

## Licencia

El motor OpenDSS es © Electric Power Research Institute, Inc., bajo licencia BSD-3; el texto completo está en [engine/port/OPENDSS_LICENSE.txt](engine/port/OPENDSS_LICENSE.txt). Los componentes de matrices dispersas como KLU tienen licencia LGPL 2.1; consulte [engine/port/licenses/](engine/port/licenses/). Este sitio es una adaptación experimental y no es una versión certificada ni respaldada por EPRI.
