#!/usr/bin/env bash
# Ejecuta el diagnóstico completo de mantenibilidad sobre una versión del repositorio.
# Uso: ./ejecutar.sh <raiz_del_repo> <directorio_salida>
set -euo pipefail
ROOT="$(cd "$1" && pwd)"; OUT="$(mkdir -p "$2" && cd "$2" && pwd)"; HERE="$(cd "$(dirname "$0")" && pwd)"
TOOLS="$HERE/herramientas"
if [ ! -d "$TOOLS/node_modules" ]; then
  mkdir -p "$TOOLS" && (cd "$TOOLS" && printf "{\"name\":\"metricas-tesis\",\"private\":true}" > package.json && npm install --silent typhonjs-escomplex@0.1.0 dependency-cruiser@18.7.2 jscpd@5.4.3)
fi
export NODE_PATH="$TOOLS/node_modules"
FILES="admin/admin.js consultor/consultor.js js/databaseMongoDB.js js/auth.js js/modules/users api/index.js api/middleware/auth.js api/routes/auth.js api/routes/users.js api/routes/companies.js api/routes/projects.js api/routes/supports.js api/routes/modules.js api/routes/assignments.js api/routes/projectAssignments.js api/routes/taskAssignments.js api/routes/tarifario.js api/routes/reports.js api/models/User.js api/models/Company.js api/models/Project.js api/models/Support.js api/models/Module.js api/models/Assignment.js api/models/ProjectAssignment.js api/models/TaskAssignment.js api/models/Tarifario.js api/models/Report.js"
node "$HERE/metricas.js" "$ROOT" "$OUT" > /dev/null
(cd "$ROOT" && "$TOOLS/node_modules/.bin/depcruise" api --no-config --output-type json --exclude node_modules > "$OUT/depcruise.json")
(cd "$ROOT" && "$TOOLS/node_modules/.bin/jscpd" --min-lines 5 --min-tokens 50 --reporters json --output "$OUT/jscpd" --silent $FILES)
node "$HERE/servidor_y_duplicacion.js" "$ROOT" "$OUT"
python3 "$HERE/graficas.py" "$OUT"
echo "Resultados en $OUT"
