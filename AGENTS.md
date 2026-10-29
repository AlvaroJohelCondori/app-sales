# Instrucciones para trabajar en App Sales

## Entorno y alcance

- Usa Node 24 de nvm: ejecuta `nvm use` antes de usar npm. La versión está en `.nvmrc`.
- Conserva Angular 21, PrimeNG 21, Tailwind CSS 4 y Font Awesome Free.
- Organiza las páginas en `src/app/features` y la estructura compartida en `src/app/layout`.
- Usa servicios y señales de Angular para el estado compartido; no añadas NgRx sin solicitud del usuario.
- Productos y Ventas consumen la API real; el carrito registra ventas con POST y usuario fijo 1. Ventas permite eliminación con confirmación. No implementes edición u otros endpoints sin solicitud del usuario.
- Respeta cambios existentes del usuario. No hagas commits ni descartes archivos sin autorización.

## Formato y calidad obligatorios

Los agentes que editan archivos no disparan necesariamente el formato al guardar de VS Code. Por eso, aplica estas comprobaciones desde la terminal:

1. Tras modificar archivos, aplica Prettier a los archivos modificados compatibles: `npx prettier --write <rutas>`.
2. Si modificas TypeScript o plantillas Angular, ejecuta `npm run lint`. Para correcciones automáticas, usa `npm run lint:fix` y revisa el resultado.
3. Antes de terminar, ejecuta `npm run check` (comprueba formato y lint de todo el proyecto).
4. Si cambias código, rutas, dependencias o configuración de compilación, ejecuta `npm run build`. Si cambia comportamiento, ejecuta también `npm run test:ci`.
5. Corrige los errores de tus cambios y reporta los resultados reales. Si algo no puede verificarse, explica el bloqueo. No declares comprobaciones aprobadas sin ejecutarlas.

No desactives reglas de ESLint, no introduzcas `any` ni exclusiones para ocultar errores sin una justificación concreta. Prettier es responsable del formato; ESLint verifica TypeScript y plantillas Angular, incluida accesibilidad. No edites archivos generados en `dist`, `.angular` o `node_modules`. `package-lock.json` se actualiza mediante npm. `FRONTEND.md` está excluido del formato porque es un documento de referencia del usuario.

## Tema claro y oscuro

- Todo componente nuevo o modificado debe funcionar en ambos modos, incluidos formularios, tablas, diálogos, menús, estados vacíos, carga y errores cuando correspondan.
- Usa el `ThemeService` existente en `src/app/core/theme/theme.service.ts`. La clase `.app-dark` del elemento HTML es el selector compartido por PrimeNG Aura y Tailwind. No crees selectores, servicios ni preferencias de tema independientes por componente.
- Prioriza los componentes y colores semánticos de PrimeNG y las utilidades de Tailwind. Si usas colores explícitos para fondos, textos, bordes o estados interactivos, añade sus variantes `dark:` cuando sea necesario. Evita CSS personalizado salvo necesidad concreta que las herramientas existentes no cubran.
- Conserva la preferencia guardada en `app-sales-theme`; sin una preferencia guardada, se toma el modo del sistema al iniciar.
- Para cambios visuales, comprueba en navegador ambos modos: legibilidad y contraste de textos e iconos, fondos, bordes, foco de teclado, selección, hover y controles deshabilitados. Comprueba también los overlays de PrimeNG que se rendericen fuera del componente.
- Si modificas el selector o la inicialización del tema, verifica la alternancia en ambos sentidos, la navegación entre páginas y la persistencia tras recargar, con las pruebas automatizadas correspondientes.

## Fechas y zona horaria global

- Mantén los valores UTC originales de la API. Para mostrarlos, utiliza `TimeZoneService` de `src/app/core/date-time/time-zone.service.ts`; no fijes una zona por componente ni sumes o restes horas manualmente.
- El selector global admite Automática, Bolivia, Perú y Argentina. Automática utiliza la zona IANA detectada del navegador, con Bolivia como respaldo. La preferencia se guarda en `app-sales-time-zone`.
- Las nuevas vistas y diálogos con fechas deben reaccionar al cambio de zona sin recargar ni volver a consultar la API. Muestra la zona activa cuando ayude a interpretar la fecha.
- Si modificas esta funcionalidad, verifica la conversión entre las zonas, cambios de día, restauración al recargar, retorno a Automática y el selector en claro/oscuro y móvil/tablet/escritorio.

## Diseño adaptable y verificación visual

- Construye las interfaces desde móvil y amplíalas con los breakpoints de Tailwind. Los componentes deben funcionar en móviles, tablets y escritorio.
- Prioriza distribuciones flexibles con grid, flex, anchos adaptables y límites de ancho. Evita dimensiones fijas que recorten contenido o generen desbordamiento horizontal de la página.
- Mantén accesibles la navegación, las acciones y los controles táctiles en pantallas pequeñas. No dependas exclusivamente de hover ni ocultes funciones esenciales sin alternativa.
- Las tablas anchas pueden desplazarse horizontalmente dentro de su contenedor; no deben ensanchar toda la página. Revisa también textos largos, tarjetas, formularios y diálogos.
- Para cada cambio visual, verifica en navegador al menos móvil (390 px), tablet (768 px) y escritorio (1440 px), en modo claro y oscuro: seis combinaciones. Si el cambio afecta un breakpoint, revisa además sus alrededores.
- En esas verificaciones, revisa distribución, texto legible, ausencia de recortes o superposiciones, desbordamientos y acceso a las acciones. Prueba las interacciones afectadas y comprueba que no haya errores nuevos en la consola.
- Inspecciona visualmente las pantallas o capturas; que la compilación y las pruebas pasen no demuestra que la interfaz se vea correctamente.
- Antes de terminar, informa qué tamaños, modos e interacciones verificaste. Si no pudiste hacer una comprobación visual, dilo explícitamente; no afirmes que quedó validada.

## Carrito y registro de ventas

- Usa `CartService` para el carrito compartido y conserva servicios y señales sin NgRx. El estado del carrito es en memoria y debe sobrevivir a la navegación entre rutas.
- Respeta el contrato de `FRONTEND.md`: usuario 1, solo identificador y cantidad por línea, importes en centavos, stock y límites de cantidades/total. No añadas el usuario 2 sin un cambio explícito del contrato del backend.
- Bloquea envíos duplicados y modificaciones durante el POST. No reintentes automáticamente una creación. Ante un resultado incierto, conserva el carrito y solicita revisar Ventas antes de permitir reenviar.
- Limpia el carrito solo después del éxito. Conserva el mensaje, ID y total del servidor; los errores de recarga del catálogo o historial no deben mostrarse como fallos de creación ni provocar un nuevo POST.
- Verifica el flujo de creación con HTTP simulado sin generar registros en el backend real solo para probar. Incluye 201, 422, red/timeout, navegación con carrito y recarga fallida después del éxito.

## Eliminación de ventas

- Usa `SaleDeletionService` y `SalesService.deleteSale` para DELETE por ID, con confirmación explícita y bloqueo de duplicados.
- La eliminación es lógica y no devuelve stock. Explica esto en la confirmación; no modifiques productos ni el carrito al eliminar.
- HTTP 200 devuelve JSON con mensaje; HTTP 404 indica que la venta ya no está disponible. Actualiza listado y resumen solo ante un resultado confirmado o tras verificar su ausencia.
- Conserva el registro ante resultados inciertos. Comprueba con GET y no reenvíes DELETE automáticamente. Verifica cancelación, 200, 404, errores, foco del diálogo y ambos temas/tamaños.
- Prueba las mutaciones con HTTP simulado; no elimines registros reales solo para validar la implementación.

## Comandos

- `npm run format`: formatea los archivos del proyecto no excluidos.
- `npm run format:check`: comprueba formato sin escribir.
- `npm run lint`: verifica TypeScript y HTML; falla también si hay advertencias.
- `npm run lint:fix`: aplica las correcciones automáticas disponibles.
- `npm run check`: comprueba formato y lint.
- `npm run build`: compila para producción.
- `npm run test:ci`: ejecuta las pruebas sin modo observación.

No añadas dependencias o herramientas para resolver problemas que ya cubren estas configuraciones sin necesidad concreta.
