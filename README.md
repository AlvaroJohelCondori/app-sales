# App Sales

Frontend de la prueba técnica de ventas, desarrollado con **Angular 21**, **PrimeNG 21 (Aura)**, **Tailwind CSS 4** y **Font Awesome Free**. Permite consultar productos, registrar ventas con un carrito, consultar el historial y eliminar ventas. Incluye un panel de resumen, modo claro/oscuro y selección de zona horaria.

La aplicación consume una **API Laravel independiente**. Este repositorio contiene el frontend; la base de datos, las migraciones y los seeders pertenecen al backend. El contrato de integración está en [FRONTEND.md](./FRONTEND.md).

## Requisitos

- Git.
- **Node.js 24** y npm. La versión de referencia es **24.22.1**, indicada en [.nvmrc](./.nvmrc). Se recomienda nvm para seleccionarla.
- Un navegador actualizado.
- El backend Laravel de la prueba, con su base de datos configurada, productos iniciales y el usuario con ID `1` disponibles. Para los requisitos de PHP, Composer y PostgreSQL, sigue el README del backend.

No necesitas instalar Angular CLI globalmente, configurar un archivo `.env` en este frontend ni disponer de una licencia de PrimeNG o Font Awesome Pro.

## 1. Preparar e iniciar el backend

En una terminal, abre **la carpeta del backend Laravel** y sigue su README para instalar dependencias, configurar `.env`, crear la base de datos y generar la clave de aplicación.

En una instalación nueva, el backend proporciona estos comandos para cargar los datos iniciales e iniciar la API:

```bash
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

Si ya cargaste los datos iniciales, ejecuta `php artisan migrate` en lugar de `php artisan migrate --seed`: los seeders no están diseñados para repetirse. Mantén esta terminal abierta.

Comprueba que la API responda antes de iniciar el frontend:

```bash
curl -i -H 'Accept: application/json' http://127.0.0.1:8000/api/products
curl -i -H 'Accept: application/json' http://127.0.0.1:8000/api/sales
```

Ambas consultas deben devolver **HTTP 200** y un arreglo JSON. Un historial de ventas vacío (`[]`) es válido; necesitas productos con stock para probar una venta.

## 2. Instalar y ejecutar el frontend

En **otra terminal**, clona este repositorio y entra a su carpeta. Si ya lo descargaste, abre directamente la carpeta que contiene `package.json`.

```bash
git clone https://github.com/AlvaroJohelCondori/app-sales.git
cd app-sales
```

Selecciona la versión de Node e instala las dependencias del archivo de bloqueo:

```bash
nvm install
nvm use
node --version
npm ci
npm start
```

Si no utilizas nvm, instala Node 24 por tu medio habitual y ejecuta `npm ci` y `npm start` desde esta carpeta. `npm ci` utiliza las versiones registradas en `package-lock.json`.

Abre **http://localhost:4200**. La aplicación redirige a **`/resumen`**. Mantén los dos servidores activos durante la evaluación. Para detenerlos, usa `Ctrl+C` en cada terminal.

Si el puerto 4200 está ocupado:

```bash
npm start -- --port 4201
```

En ese caso, abre http://localhost:4201 y permite ese origen en el CORS del backend.

## 3. Configurar la conexión con la API

La configuración local ya apunta a **`http://127.0.0.1:8000/api`**. Si utilizas ese servidor, no necesitas cambiar nada.

Para cambiar el host o el puerto, edita [src/environments/environment.development.ts](./src/environments/environment.development.ts):

```ts
export const environment = {
  apiUrl: 'http://127.0.0.1:8000/api',
};
```

Conserva el sufijo `/api`. Los servicios añaden `/products` o `/sales`; no incluyas esos segmentos en `apiUrl`. Reinicia `npm start` después de cambiar la configuración.

El frontend llama directamente a Laravel; **no hay un proxy de desarrollo configurado**. El backend debe permitir el origen `http://localhost:4200` mediante CORS, así como los métodos GET, POST y DELETE y los encabezados `Accept` y `Content-Type`. Si cambias el puerto o abres el frontend con `127.0.0.1` en lugar de `localhost`, autoriza también ese origen concreto.

La API actual no requiere token ni cookies de autenticación. La creación envía `user_id: 1`. Nunca coloques credenciales de la base de datos ni secretos del backend en los archivos del frontend.

## 4. Recorrido sugerido para evaluar

Las operaciones de creación y eliminación desde la interfaz **sí modifican los datos del backend local**.

1. **Resumen (`/resumen`)**: revisa importe vendido, cantidad de ventas, unidades vendidas, stock, productos destacados y últimas ventas. Pulsa **Actualizar** para volver a consultar los datos.
2. **Productos (`/productos`)**: consulta el catálogo y añade uno o varios productos con stock al carrito.
3. **Carrito del encabezado**: ajusta cantidades y comprueba el total estimado. Navega entre secciones para comprobar que los productos seleccionados se conservan.
4. **Registrar venta**: confirma desde el carrito. Se muestra el mensaje del backend, el ID y el total definitivo; el carrito se vacía tras el éxito.
5. **Ventas (`/ventas`)**: comprueba que aparece la venta y abre **Ver detalle** para consultar sus productos, cantidades e importes.
6. **Eliminar venta**: pulsa la papelera. Puedes cancelar sin enviar la solicitud o confirmar la eliminación. Tras el éxito, se actualizan el historial y su resumen. La eliminación es lógica y **no devuelve stock**.
7. **Preferencias**: alterna el modo claro/oscuro y cambia la zona horaria entre Automática, Bolivia, Perú y Argentina. Las fechas se actualizan sin recargar la página. Prueba también una ventana de tamaño móvil.

### Comportamientos a tener en cuenta

- El carrito se conserva al navegar mediante un servicio con señales; **se reinicia al recargar la página**. No utiliza NgRx ni almacenamiento permanente.
- Tema y zona horaria se guardan en `localStorage`. Sin elección previa se usan el tema del sistema y la zona del navegador, con Bolivia como respaldo horario.
- Las cantidades deben ser enteros positivos y no superar el stock. El servidor valida nuevamente la venta y determina precios, subtotales, total y disponibilidad definitiva.
- Los errores HTTP 422 conservan el carrito y muestran las validaciones. Si una operación tiene un resultado incierto por pérdida de conexión o timeout, revisa el historial antes de repetirla; no hay reintentos automáticos de POST o DELETE.
- El resumen utiliza todo el historial disponible, sin filtro de fechas, y excluye ventas eliminadas. Los rankings comparan productos del catálogo actual por unidades vendidas, incluyendo productos sin ventas; los empates se ordenan por ID.
- Los importes se muestran con dos decimales, sin asumir una moneda. Las fechas UTC se presentan con la zona horaria global seleccionada.
- Las imágenes externas pueden no corresponder al producto o no estar disponibles; en caso de fallo se muestra una alternativa visual.
- No se implementan mantenimiento de productos, edición de ventas, autenticación ni descuentos opcionales.

## Endpoints utilizados

Todas las solicitudes envían `Accept: application/json`; el POST también envía `Content-Type: application/json`.

| Método | Ruta              | Uso                              | Respuesta de éxito                 |
| ------ | ----------------- | -------------------------------- | ---------------------------------- |
| GET    | `/api/products`   | Consultar catálogo y stock       | 200, arreglo de productos          |
| GET    | `/api/sales`      | Consultar historial con detalles | 200, arreglo de ventas             |
| POST   | `/api/sales`      | Registrar venta, usuario fijo 1  | 201, `message`, `sale_id`, `total` |
| DELETE | `/api/sales/{id}` | Eliminar venta con confirmación  | 200, `message`                     |

El POST envía únicamente el usuario y los identificadores/cantidades de los productos; no envía precios. Consulta los contratos completos, códigos de error y tipos en [FRONTEND.md](./FRONTEND.md).

## Verificaciones automatizadas

Desde la carpeta del frontend, con Node 24 y las dependencias instaladas:

```bash
npm run check
npm run test:ci
npm run build
```

- `check`: comprueba Prettier y ESLint sin modificar archivos.
- `test:ci`: ejecuta las pruebas unitarias y de integración del frontend con Vitest y jsdom, sin Chrome ni Karma. Las peticiones HTTP están simuladas: no requiere el backend activo y no crea ni elimina registros reales.
- `build`: genera la compilación de producción en `dist/app-sales/browser`.

Estas pruebas no sustituyen las del backend. Ejecuta `php artisan test` desde el repositorio Laravel para verificar sus reglas de negocio; la concurrencia y los bloqueos requieren comprobación adicional en PostgreSQL.

## Compilación y publicación

`npm start` usa [environment.development.ts](./src/environments/environment.development.ts). **`npm run build` usa [environment.ts](./src/environments/environment.ts)**, cuya URL de API es `/api`.

Para publicar, sirve la API bajo `/api` en el mismo origen, o configura su URL pública en el entorno de producción **antes de compilar**. Copia el contenido de `dist/app-sales/browser` al servidor web y configura las rutas del frontend para devolver `index.html` cuando no correspondan a archivos estáticos. Las solicitudes a `/api` deben dirigirse al backend. Si la API está en otro origen, configura CORS también para ese despliegue.

## Solución de problemas

| Síntoma                                                    | Qué revisar                                                                                                                       |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `nvm: command not found`                                   | Instala/carga nvm en tu terminal o utiliza una instalación de Node 24.                                                            |
| Error de versión de Node o `EBADENGINE`                    | Ejecuta `nvm use` y comprueba `node --version` antes de `npm ci`.                                                                 |
| `npm ci` falla al descargar paquetes                       | Revisa acceso a Internet, registro de npm y configuración de proxy; conserva `package-lock.json`.                                 |
| Puerto 4200 ocupado                                        | Usa `npm start -- --port 4201` y permite el nuevo origen en CORS.                                                                 |
| No se pueden cargar productos o resumen                    | Confirma que Laravel esté activo, que los GET anteriores respondan y que `apiUrl` corresponda a su host/puerto.                   |
| Los GET funcionan con curl, pero el navegador muestra CORS | Configura el origen exacto del frontend y las peticiones OPTIONS en el backend. `no-cors` no permite consumir el JSON.            |
| No hay productos o no puedes registrar ventas              | Revisa la base de datos, los datos iniciales, el usuario 1 y el stock disponible. No repitas los seeders sobre datos ya cargados. |
| Un producto muestra una imagen alternativa                 | La URL externa falló; esto no impide consultar ni vender el producto.                                                             |
| El resultado del POST es incierto                          | Revisa Ventas antes de reenviar, para evitar registrar dos operaciones.                                                           |
| Una ruta directa falla en el hosting                       | Configura el retorno a `index.html` para las rutas de Angular, exceptuando `/api` y archivos estáticos.                           |

## Organización del proyecto

```text
src/
  app/
    core/                     # Configuración HTTP, tema, zona horaria y eventos
    layout/dashboard-layout/  # Navegación y encabezado compartidos
    shared/                   # Componentes reutilizables
    features/
      overview/               # Panel inicial y cálculos del reporte
      products/               # Catálogo, servicio y tarjetas de producto
      cart/                   # Carrito compartido y registro de ventas
      sales/                  # Historial, detalle y eliminación
    app.routes.ts             # Rutas con carga bajo demanda
    app.config.ts             # Proveedores y configuración de PrimeNG
  environments/               # URL de API por entorno
  styles.css                  # Tailwind e integración con PrimeNG
```

El estado compartido utiliza servicios y señales de Angular. PrimeNG y Tailwind comparten el selector `.app-dark`; Font Awesome utiliza iconos gratuitos importados individualmente. La aplicación usa componentes standalone y no requiere Zone.js.

## Desarrollo y formato

Abre esta carpeta como raíz en VS Code e instala las extensiones recomendadas del workspace: Prettier, ESLint, Error Lens y Angular Language Service. La configuración versionada habilita formato al guardar y correcciones disponibles de ESLint al guardar explícitamente.

```bash
npm run format
npm run lint:fix
npm run check
```

Las instrucciones para agentes y colaboradores están en [AGENTS.md](./AGENTS.md). No hay hooks de Git ni una configuración de CI en este repositorio; ejecuta los comandos de verificación antes de entregar cambios.
