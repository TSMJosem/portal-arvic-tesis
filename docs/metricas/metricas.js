// Diagnóstico de mantenibilidad del núcleo operativo (OP2)
// Uso: node metricas.js <raiz_del_repo> <directorio_salida>
const esc = require('typhonjs-escomplex');
const fs = require('fs'), path = require('path');
const ROOT = process.argv[2], OUT = process.argv[3];
fs.mkdirSync(OUT, { recursive: true });

const FILES = {
  'admin/admin.js': 'clasificar', 'consultor/consultor.js': 'clasificar', 'js/databaseMongoDB.js': 'clasificar',
  'js/auth.js': 'Usuarios', 'js/modules/users/UserRepository.js': 'Usuarios', 'js/modules/users/UserValidator.js': 'Usuarios',
  'js/modules/users/UserService.js': 'Usuarios', 'js/modules/users/UserModal.js': 'Usuarios', 'js/modules/users/index.js': 'Usuarios',
  'api/index.js': 'Compartido', 'api/middleware/auth.js': 'Usuarios',
  'api/routes/auth.js': 'Usuarios', 'api/routes/users.js': 'Usuarios',
  'api/routes/companies.js': 'Catálogos', 'api/routes/projects.js': 'Catálogos', 'api/routes/supports.js': 'Catálogos', 'api/routes/modules.js': 'Catálogos',
  'api/routes/assignments.js': 'Asignaciones', 'api/routes/projectAssignments.js': 'Asignaciones', 'api/routes/taskAssignments.js': 'Asignaciones',
  'api/routes/tarifario.js': 'Tarifario', 'api/routes/reports.js': 'Timesheet',
  'api/models/User.js': 'Usuarios', 'api/models/Company.js': 'Catálogos', 'api/models/Project.js': 'Catálogos', 'api/models/Support.js': 'Catálogos',
  'api/models/Module.js': 'Catálogos', 'api/models/Assignment.js': 'Asignaciones', 'api/models/ProjectAssignment.js': 'Asignaciones',
  'api/models/TaskAssignment.js': 'Asignaciones', 'api/models/Tarifario.js': 'Tarifario', 'api/models/Report.js': 'Timesheet',
};
const NUCLEO = ['Usuarios', 'Catálogos', 'Asignaciones', 'Tarifario', 'Timesheet'];

// Reglas de clasificación por nombre de función (se aplican en orden; la primera que coincide gana)
const RULES = [
  ['Fuera', /Excel|Remanente|remanente|PDF|ActivityReport|activityReport|ReportSelector|ReportConfig|Preview|preview|GeneratedReport|generatedReport|Difference|ProjectCell|ProjectRow|RowCalculation|RowTotalDisplay|RemanenteRow|GeneralTotals|restoreOriginal|generateFinalReport|generateFileName|saveToReportHistory|getDateRangeText|ReportType|getReportDataByType|applyTimeFilter|SoporteData|calculateMonthWeek|getDayWeekNumber|ProyectoData|processDataForReport|EditableData|generate(Editable|Standard)Table|generateProjectsSection|extraerDatos|populateFilterDropdowns|handleClientFilterChange|FilterByClient|validateRequiredFilters|handleTimeFilterChange|resetReport|clearPreview|selectNewReportType|loadTimesheetWeeksForConsultor|Help|Faq|Notif|notif|timeAgo|diagnostic|debug|verifyDOMState|exportData|importData|loadCurrentData|clearAllData|resetToDefaults|Animation|generarDetalleContextual|generarBadgeOrigen|generarLineaReporteMejorada|Chat|chat|Calendar|calendar|SupportEmail|DaySummary|rsvp|Expediente|Billing|incrementDownloadCount/],
  ['Tarifario', /Tarif|tarif|Margen|margen|formatCurrency|ConsultoresTable|ConsultoresResumen/],
  ['Timesheet', /Timesheet|timesheet|Report|report|Week|week|Draft|draft|Monday|Sunday|ShortDate|RowId|ISODate|DayIndex|isDayEditable|onHour|Detail\b|saveDetail|Popover|updateRowTotal|addEmptyRow|deleteRow|onTicketChange|PendingAlert|Submit|Historial|Description|switchConsultorView/],
  ['Asignaciones', /Assign|assign|Task|task|Asignacion|loadSupportsByCompany|loadEdit(Support|Project)ModalOptions|onAssignmentChange/],
  ['Usuarios', /User|user|Consultor|consultor|Password|Credentials|validateToken|getHeaders/],
  ['Catálogos', /Compan|Empresa|Project|Proyecto|Support|Soporte|Module|Modulo|Catalog/],
];
const classify = name => { for (const [m, re] of RULES) if (re.test(name)) return m; return 'Compartido'; };
const mi = (V, CC, LOC) => Math.max(0, (171 - 5.2 * Math.log(Math.max(V, 1)) - 0.23 * CC - 16.2 * Math.log(Math.max(LOC, 1))) * 100 / 171);

const fns = [], files = [];
for (const [rel, mode] of Object.entries(FILES)) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const r = esc.analyzeModule(src);
  let ms = [...r.methods, ...r.classes.flatMap(c => c.methods.map(m => ({ ...m, name: m.name })))];
  ms.sort((a, b) => a.lineStart - b.lineStart || b.lineEnd - a.lineEnd);
  // Las funciones anónimas heredan el módulo de la función con nombre que las contiene
  const named = ms.filter(m => !/^<anon/.test(m.name));
  for (const m of ms) {
    let mod = mode;
    let owner = m.name;
    if (mode === 'clasificar') {
      if (/^<anon/.test(m.name)) {
        const enc = named.filter(n => n.lineStart <= m.lineStart && n.lineEnd >= m.lineEnd).sort((a, b) => (a.lineEnd - a.lineStart) - (b.lineEnd - b.lineStart))[0];
        owner = enc ? enc.name : null;
      }
      mod = owner ? classify(owner) : 'Compartido';
    }
    const topLevel = !ms.some(o => o !== m && o.lineStart <= m.lineStart && o.lineEnd >= m.lineEnd && (o.lineStart < m.lineStart || o.lineEnd > m.lineEnd));
    fns.push({ file: rel, name: m.name, owner, module: mod, line: m.lineStart, cc: m.cyclomatic, loc: m.sloc.physical,
      volume: m.halstead.volume, mi: mi(m.halstead.volume, m.cyclomatic, m.sloc.physical), topLevel });
  }
  const agg = r.aggregate;
  const fileFns = fns.filter(f => f.file === rel);
  files.push({ file: rel, sloc: src.split(/\r?\n/).length, functions: fileFns.length,
    ccAvg: fileFns.length ? fileFns.reduce((s, f) => s + f.cc, 0) / fileFns.length : 0,
    ccMax: fileFns.length ? Math.max(...fileFns.map(f => f.cc)) : 0,
    miFile: mi(agg.halstead.volume, agg.cyclomatic, agg.sloc.physical),
    miFnAvg: fileFns.length ? fileFns.reduce((s, f) => s + f.mi, 0) / fileFns.length : 0,
    modules: [...new Set(fileFns.map(f => f.module))].sort(),
    windowAssign: (src.match(/window\.[A-Za-z_$][\w$]*\s*=(?!=)/g) || []).length,
    topLevelDecl: (src.match(/^(async\s+)?function\s+[A-Za-z_$]/gm) || []).length });
}

// Acoplamiento entre módulos funcionales en el navegador: llamadas entre funciones con nombre de distinto módulo
const callEdges = {};
for (const rel of ['admin/admin.js', 'consultor/consultor.js']) {
  const lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split(/\r?\n/);
  const named = fns.filter(f => f.file === rel && f.owner === f.name && f.topLevel);
  const byName = new Map(named.map(f => [f.name, f.module]));
  for (const f of named) {
    const end = fns.find(x => x.file === rel && x.name === f.name && x.line === f.line);
    const body = lines.slice(f.line, f.line + f.loc).join('\n');
    for (const [callee, mod] of byName) {
      if (callee === f.name || mod === f.module) continue;
      if (new RegExp('\\b' + callee.replace(/\$/g, '\\$') + '\\s*\\(').test(body)) {
        const k = f.module + ' → ' + mod; callEdges[k] = (callEdges[k] || 0) + 1;
      }
    }
  }
}

// Agregados por módulo (solo funciones del núcleo)
const summarize = list => {
  const n = list.length; if (!n) return null;
  const s = (k) => list.reduce((a, f) => a + f[k], 0);
  return { n, loc: s('loc'), ccAvg: s('cc') / n, ccMax: Math.max(...list.map(f => f.cc)),
    pctCC10: 100 * list.filter(f => f.cc > 10).length / n, miAvg: s('mi') / n, pctMI20: 100 * list.filter(f => f.mi < 20).length / n };
};
const byModule = {};
for (const m of [...NUCLEO, 'Compartido', 'Fuera']) byModule[m] = summarize(fns.filter(f => f.module === m));
byModule['Núcleo (total)'] = summarize(fns.filter(f => NUCLEO.includes(f.module)));
const byModuleSide = {};
for (const m of NUCLEO) {
  byModuleSide[m] = { navegador: summarize(fns.filter(f => f.module === m && !f.file.startsWith('api/'))),
                      servidor: summarize(fns.filter(f => f.module === m && f.file.startsWith('api/'))) };
}

fs.writeFileSync(path.join(OUT, 'funciones.json'), JSON.stringify(fns, null, 1));
fs.writeFileSync(path.join(OUT, 'resumen.json'), JSON.stringify({ files, byModule, byModuleSide, callEdges }, null, 1));
console.log(JSON.stringify({ byModule, callEdges }, null, 1));
