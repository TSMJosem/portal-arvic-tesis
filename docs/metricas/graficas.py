import json, sys, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
plt.rcParams.update({"font.family": "Liberation Sans", "font.size": 9, "hatch.linewidth": 0.6})
out = sys.argv[1]
f = json.load(open(out + "/funciones.json"))
N = ["Usuarios", "Catálogos", "Asignaciones", "Tarifario", "Timesheet"]
big = {"admin/admin.js", "consultor/consultor.js", "js/databaseMongoDB.js"}

def chart(vals, xlabel, fname, xmax):
    fig, ax = plt.subplots(figsize=(6.0, 2.6), dpi=300)
    y = list(range(len(N)))[::-1]
    ax.barh(y, vals, height=0.55, color="white", edgecolor="black", hatch="///", linewidth=0.8)
    for yi, v in zip(y, vals):
        ax.text(v + xmax * 0.012, yi, f"{v:.1f} %", va="center", fontsize=8.5)
    ax.set_yticks(y); ax.set_yticklabels(N)
    ax.set_xlim(0, xmax); ax.set_xlabel(xlabel, fontsize=8.5)
    for s in ["top", "right"]: ax.spines[s].set_visible(False)
    ax.xaxis.grid(True, color="#bbbbbb", linewidth=0.4); ax.set_axisbelow(True)
    plt.tight_layout(); plt.savefig(out + "/" + fname, facecolor="white"); plt.close()

pct10 = [100 * sum(1 for x in f if x["module"] == m and x["cc"] > 10) / sum(1 for x in f if x["module"] == m) for m in N]
conc = [100 * sum(1 for x in f if x["module"] == m and x["file"] in big) / sum(1 for x in f if x["module"] == m) for m in N]
chart(pct10, "Funciones con complejidad ciclomática mayor a 10 (%)", "Grafico_7_2_complejidad_mayor_10.png", 14)
chart(conc, "Funciones ubicadas en admin.js, consultor.js o databaseMongoDB.js (%)", "Grafico_7_1_concentracion.png", 105)
print([round(v, 1) for v in pct10], [round(v, 1) for v in conc])
