# Métricas de mantenibilidad (OP2 y OP5)

Diagnóstico reproducible de complejidad ciclomática, índice de mantenibilidad,
acoplamiento y duplicación del núcleo operativo.

## Uso

```bash
./docs/metricas/ejecutar.sh <raiz_del_repo> <carpeta_de_salida>
```

- Línea base: haz `git worktree add ../linea-base tesis-linea-base` y ejecuta el script sobre `../linea-base`.
- Versión reestructurada (OP5): ejecútalo sobre la raíz de la rama de tesis. En el OP5 hay que
  actualizar en `metricas.js` y `servidor_y_duplicacion.js` la lista de archivos para incluir los archivos nuevos.

Versiones fijas: typhonjs-escomplex 0.1.0, dependency-cruiser 18.7.2, jscpd 5.4.3, Node.js 22.
La primera ejecución instala las herramientas en `docs/metricas/herramientas/` (agrégala a `.gitignore`).
