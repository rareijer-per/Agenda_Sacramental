# Agenda Reunión Sacramental — Barrio Burgos

Aplicación web sencilla para preparar y conducir la **Reunión Sacramental** del Barrio Burgos de La Iglesia de Jesucristo de los Santos de los Últimos Días.

## Características

- Secciones completas: Preludio, Anuncios, Apertura, Asuntos, Santa Cena, Programa Principal y Cierre
- Campos editables para todos los participantes e información de la reunión
- Agregar y eliminar anuncios, relevos, sostenimientos y elementos del programa
- Cálculo automático del **tiempo total** de la reunión
- Selector de tiempo para el mensaje de cierre
- Botón de **Imprimir** y guía para **Exportar PDF**
- Botón de **Agenda en Blanco** para reiniciar todos los campos
- Soporte para **modo oscuro** automático según preferencias del sistema
- Diseño **responsivo** para móvil y escritorio
- **Sin dependencias externas** — HTML, CSS y JS puros

## Uso

### Opción 1 — Abrir directamente

Descarga el repositorio y abre `index.html` en cualquier navegador moderno. No requiere servidor.

### Opción 2 — Publicar en GitHub Pages

1. Sube el repositorio a GitHub.
2. Ve a **Settings → Pages**.
3. En "Source", selecciona la rama `main` y la carpeta `/ (root)`.
4. Guarda. GitHub te dará una URL pública en pocos segundos.

## Estructura

```
agenda-barrio-burgos/
├── index.html   # Estructura de la página
├── style.css    # Estilos (modo claro/oscuro, impresión)
├── app.js       # Lógica interactiva
└── README.md    # Este archivo
```

## Personalización

- Para cambiar el nombre del barrio o estaca, edita las líneas en `index.html` que contienen `Barrio Burgos`.
- Para ajustar los tiempos fijos (apertura, cierre), modifica los valores en `app.js` dentro de la función `calcTotal()`.

## Licencia

Uso libre para fines de la Iglesia y comunidad.
