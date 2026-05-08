# Agenda Reunión Sacramental — Barrio Burgos

Aplicación web para planificar y conducir la Reunión Sacramental del Barrio Burgos.

## Características

- ✅ Cálculo automático de tiempos por elemento del programa
- ✅ Barra visual de tiempo con segmentos por bloque (apertura, cena, programa, cierre)
- ✅ Horario de inicio/fin calculado por cada elemento del programa (desde las 10:00)
- ✅ Aviso cuando el programa excede 70 minutos
- ✅ **PDF siempre en una sola página** (escala automática)
- ✅ Modo oscuro automático
- ✅ Sin dependencias externas

## Estructura de tiempos (70 min totales)

| Bloque | Tiempo |
|---|---|
| Apertura (preludio + himno + oración) | 10 min fijos |
| Santa Cena (himno + administración) | 15 min fijos |
| **Programa principal (mensajes/música)** | **hasta 40 min** |
| Cierre (himno + oración) | 5 min fijos |

## Uso

Abre `index.html` en cualquier navegador. No requiere servidor ni conexión a internet.

### Publicar en GitHub Pages

1. Sube el repositorio a GitHub
2. Ve a **Settings → Pages**
3. En *Source*, selecciona rama `main` y carpeta raíz `/`
4. Guarda — obtendrás una URL pública en segundos

## Archivos

```
agenda-barrio-burgos/
├── index.html   # Estructura HTML
├── style.css    # Estilos + print fit-to-page
├── app.js       # Lógica y cálculo de tiempos
└── README.md
```
