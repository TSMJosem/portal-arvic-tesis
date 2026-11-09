// Acoplamiento del servidor (grafo de require) y duplicación por archivo.
// Uso: node servidor_y_duplicacion.js <raiz_repo> <salida>  (requiere depcruise.json y jscpd/jscpd-report.json en <salida>)
const fs = require('fs'), path = require('path');
const ROOT = process.argv[2], OUT = process.argv[3];
const MOD = {"api/index.js":"Compartido","api/middleware/auth.js":"Usuarios","api/routes/auth.js":"Usuarios","api/routes/users.js":"Usuarios",
 "api/routes/companies.js":"Catálogos","api/routes/projects.js":"Catálogos","api/routes/supports.js":"Catálogos","api/routes/modules.js":"Catálogos",
 "api/routes/assignments.js":"Asignaciones","api/routes/projectAssignments.js":"Asignaciones","api/routes/taskAssignments.js":"Asignaciones",
 "api/routes/tarifario.js":"Tarifario","api/routes/reports.js":"Timesheet","api/models/User.js":"Usuarios","api/models/Company.js":"Catálogos",
 "api/models/Project.js":"Catálogos","api/models/Support.js":"Catálogos","api/models/Module.js":"Catálogos","api/models/Assignment.js":"Asignaciones",
 "api/models/ProjectAssignment.js":"Asignaciones","api/models/TaskAssignment.js":"Asignaciones","api/models/Tarifario.js":"Tarifario","api/models/Report.js":"Timesheet"};
const dc = JSON.parse(fs.readFileSync(path.join(OUT, 'depcruise.json'), 'utf8'));
const ce = {}, ca = {}, cross = {};
for (const m of dc.modules) {
  if (!(m.source in MOD) || m.source === 'api/index.js') continue;   // index.js es el punto de composición
  for (const d of m.dependencies) {
    if (d.coreModule || d.couldNotResolve || !d.resolved.startsWith('api/')) continue;
    ce[m.source] = (ce[m.source] || 0) + 1; ca[d.resolved] = (ca[d.resolved] || 0) + 1;
    const a = MOD[m.source], b = MOD[d.resolved] || 'Fuera/utilidades';
    if (a !== b) { const k = `${a} → ${b}`; (cross[k] = cross[k] || []).push(`${m.source} → ${d.resolved}`); }
  }
}
// Duplicación: unión de líneas duplicadas por archivo
const jr = JSON.parse(fs.readFileSync(path.join(OUT, 'jscpd', 'jscpd-report.json'), 'utf8'));
const all = Object.keys(MOD).concat(['admin/admin.js','consultor/consultor.js','js/databaseMongoDB.js','js/auth.js',
  'js/modules/users/UserRepository.js','js/modules/users/UserValidator.js','js/modules/users/UserService.js','js/modules/users/UserModal.js','js/modules/users/index.js']);
const resolve = (n, loc) => { const c = all.filter(a => a === n || a.endsWith('/' + n)); return c.length === 1 ? c[0] : (loc && loc.path ? loc.path : n); };
const sets = {};
for (const d of jr.duplicates) for (const s of [d.firstFile, d.secondFile]) {
  const f = resolve(s.name); (sets[f] = sets[f] || new Set()); for (let i = s.start; i <= s.end; i++) sets[f].add(i);
}
const dup = {};
for (const [f, set] of Object.entries(sets)) { try { const n = fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/).length; dup[f] = { lineas: n, duplicadas: set.size, pct: 100 * set.size / n }; } catch (e) {} }
const totalDup = jr.statistics.total;
// Verificación de administrador duplicada en rutas del núcleo
const rutas = Object.keys(MOD).filter(f => f.startsWith('api/routes/'));
const isAdmin = rutas.filter(f => /^function isAdmin\b/m.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
fs.writeFileSync(path.join(OUT, 'servidor_duplicacion.json'), JSON.stringify({ ce, ca, cross, dup, totalDup: { lineas: totalDup.lines, duplicadas: totalDup.duplicatedLines, pct: totalDup.percentage, clones: totalDup.clones }, isAdmin }, null, 1));
console.log('isAdmin en', isAdmin.length, 'de', rutas.length, 'rutas del núcleo');
