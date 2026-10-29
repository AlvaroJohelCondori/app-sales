# App Sales

Base mínima con Angular 21, PrimeNG 21 (tema Aura), Tailwind CSS 4 y Font Awesome Free.

## Ejecutar con Node 24

```bash
nvm install
nvm use
npm ci
npm start
```

Abre http://localhost:4200. Para detener el servidor, usa Ctrl+C.
Si el puerto está ocupado: `npm start -- --port 4201`.
No hace falta instalar Angular CLI globalmente.

## Comprobaciones

```bash
npm run build
npm run test:ci
```

La compilación se genera en `dist/app-sales/browser`.
Las pruebas usan Vitest con jsdom y no necesitan Chrome ni Karma.

## Ejemplo de integración

La única página, `/`, muestra tarjetas, una etiqueta, un botón y un mensaje de PrimeNG.
Tailwind organiza el diseño adaptable y Font Awesome Free aporta los iconos SVG.
Al pulsar **Comprobar integración**, aparece un mensaje de éxito y el botón se desactiva.
Las rutas desconocidas (incluidas las antiguas `/home`, `/inicio` y `/posts`) redirigen a `/`.

- `src/app/app.config.ts`: proveedores de PrimeNG y tema Aura, con modo claro y capas CSS.
- `src/styles.css`: Tailwind y el plugin `tailwindcss-primeui`, que permite usar colores del tema como `bg-primary` y `text-primary`.
- `.postcssrc.json`: integración de Tailwind 4 con el compilador de Angular.
- `src/app/components/home/`: ejemplo con componentes PrimeNG e iconos gratuitos importados individualmente.
- `src/app/app.routes.ts`: ruta principal y redirección de rutas desconocidas.

Las capas se ordenan `theme, base, primeng, utilities` para que el reset de Tailwind no anule el tema y sus utilidades puedan personalizarlo.
Font Awesome usa `@fortawesome/angular-fontawesome` 4, compatible con Angular 21, y exclusivamente `free-solid-svg-icons`. No requiere un kit ni una suscripción Pro.

## Refactor desde Angular 16

Se reemplazó la configuración de la plantilla inicial por una base standalone de Angular 21 sobre Node 24. No se ejecutó una cadena de migraciones `ng update` por cada versión intermedia; se adaptaron directamente el arranque, las rutas, las pruebas y el compilador debido al alcance mínimo del proyecto.

Se retiraron Bootstrap, jQuery, Popper.js, Remix Icon y Toastify, junto con sus estilos y referencias. También se retiraron los módulos, la navegación y las pruebas de la plantilla anterior. El arranque usa `bootstrapApplication`; Angular 21 funciona sin Zone.js y las pruebas usan Vitest.

Para publicar, configura el hosting para servir `index.html` cuando la ruta solicitada no corresponda a un archivo estático.

## Documentación

- [PrimeNG 21](https://v21.primeng.org/)
- [Tailwind CSS con Angular](https://tailwindcss.com/docs/installation/framework-guides/angular)
- [Font Awesome para Angular](https://github.com/FortAwesome/angular-fontawesome)
- [Compatibilidad de Angular](https://angular.dev/reference/versions)
