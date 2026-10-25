/* ============================================================
   Control de Competencia — sitio estático, solo localStorage
   ============================================================ */

const STORAGE_KEY = "controlCompetencia_v1";

// Estado por defecto
function estadoInicial() {
  return {
    comps: {
      // salida = hora de salida general (respaldo). salidasCat = { "Categoría": "HH:MM:SS" } salidas por categoría
      // paradoEn = segundos del día en que se congeló el crono (null = corriendo)
      1: { nombre: "", distancia: "", salida: "", ciclistas: [], salidasCat: {}, paradoEn: null },
      2: { nombre: "", distancia: "", salida: "", ciclistas: [], salidasCat: {}, paradoEn: null },
    },
    // llegadas: { dorsal, comp, horaLlegada(ISO), nombre, categoria, equipo }
    llegadas: [],
  };
}

let estado = cargar();

function cargar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return estadoInicial();
    const data = JSON.parse(raw);
    const base = estadoInicial();
    // merge defensivo
    base.comps[1] = { ...base.comps[1], ...(data.comps?.[1] || {}) };
    base.comps[2] = { ...base.comps[2], ...(data.comps?.[2] || {}) };
    base.comps[1].ciclistas = data.comps?.[1]?.ciclistas || [];
    base.comps[2].ciclistas = data.comps?.[2]?.ciclistas || [];
    base.comps[1].salidasCat = data.comps?.[1]?.salidasCat || {};
    base.comps[2].salidasCat = data.comps?.[2]?.salidasCat || {};
    base.comps[1].paradoEn = data.comps?.[1]?.paradoEn ?? null;
    base.comps[2].paradoEn = data.comps?.[2]?.paradoEn ?? null;
    base.llegadas = Array.isArray(data.llegadas) ? data.llegadas : [];
    return base;
  } catch (e) {
    console.error("Error al cargar estado", e);
    return estadoInicial();
  }
}

function guardar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
}

/* ---------------- Navegación por pestañas ---------------- */
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
    if (tab.dataset.tab === "resultados") renderResultados();
    if (tab.dataset.tab === "salidas") {
      renderClocks();
      renderSalidasCat();
    }
    if (tab.dataset.tab === "registro") {
      renderClocksRegistro();
      document.getElementById("input-dorsal").focus();
    }
  });
});

/* ---------------- CSV ---------------- */
// Parser CSV delimitado por ; columnas: categoria ; dorsal ; nombre ; equipo
function parseCSV(texto) {
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lineas.length === 0) return { ciclistas: [], error: "El archivo está vacío." };

  // Detectar si la primera línea es encabezado
  const primera = lineas[0].toLowerCase();
  let inicio = 0;
  if (/categor|dorsal|nombre|equipo/.test(primera)) inicio = 1;

  const ciclistas = [];
  for (let i = inicio; i < lineas.length; i++) {
    const partes = lineas[i].split(";").map((p) => p.trim());
    if (partes.length < 3) continue; // fila inválida
    const [categoria, dorsal, nombre, equipo = ""] = partes;
    if (!dorsal) continue;
    ciclistas.push({
      categoria: categoria || "Sin categoría",
      dorsal: String(dorsal).trim(),
      nombre: nombre || "(sin nombre)",
      equipo: equipo || "",
    });
  }
  if (ciclistas.length === 0)
    return { ciclistas: [], error: "No se encontraron filas válidas. Verificá que el separador sea ; y el orden: categoría; dorsal; nombre; equipo" };
  return { ciclistas, error: null };
}

function manejarCSV(compNum, file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const { ciclistas, error } = parseCSV(e.target.result);
    const countEl = document.getElementById(`comp${compNum}-count`);
    if (error) {
      countEl.textContent = "⚠️ " + error;
      countEl.classList.remove("ok");
      return;
    }
    estado.comps[compNum].ciclistas = ciclistas;
    guardar();
    actualizarCount(compNum);
    rellenarFiltroCategorias();
    renderSalidasCat();
    renderTablaCiclistas(compNum);
  };
  reader.readAsText(file, "UTF-8");
}

function actualizarCount(compNum) {
  const countEl = document.getElementById(`comp${compNum}-count`);
  const n = estado.comps[compNum].ciclistas.length;
  if (n > 0) {
    countEl.textContent = `✅ ${n} ciclistas cargados`;
    countEl.classList.add("ok");
  } else {
    countEl.textContent = "Sin ciclistas cargados";
    countEl.classList.remove("ok");
  }
}

/* ---------------- Agregar / editar participantes ---------------- */
function agregarParticipante(n) {
  const cat = document.getElementById(`comp${n}-add-cat`).value.trim();
  const dorsal = document.getElementById(`comp${n}-add-dorsal`).value.trim();
  const nombre = document.getElementById(`comp${n}-add-nombre`).value.trim();
  const equipo = document.getElementById(`comp${n}-add-equipo`).value.trim();
  const msg = document.getElementById(`comp${n}-add-msg`);

  if (!dorsal || !nombre) {
    msg.innerHTML = `<span class="err">⚠️ Dorsal y Nombre son obligatorios.</span>`;
    return;
  }
  // dorsal repetido en esta competencia
  if (estado.comps[n].ciclistas.some((c) => c.dorsal === dorsal)) {
    msg.innerHTML = `<span class="err">⚠️ El dorsal <b>${dorsal}</b> ya existe en esta competencia.</span>`;
    return;
  }

  estado.comps[n].ciclistas.push({
    categoria: cat || "Sin categoría",
    dorsal,
    nombre,
    equipo,
  });
  guardar();
  actualizarCount(n);
  rellenarFiltroCategorias();
  renderSalidasCat();
  renderTablaCiclistas(n);

  msg.innerHTML = `<span class="ok">✅ Agregado: dorsal ${dorsal} — ${nombre}.</span>`;
  // limpiar campos (deja la categoría para agregar varios de la misma)
  document.getElementById(`comp${n}-add-dorsal`).value = "";
  document.getElementById(`comp${n}-add-nombre`).value = "";
  document.getElementById(`comp${n}-add-equipo`).value = "";
  document.getElementById(`comp${n}-add-dorsal`).focus();
  setTimeout(() => (msg.innerHTML = ""), 4000);
}

function renderTablaCiclistas(n) {
  const tbody = document.querySelector(`#comp${n}-tabla-ciclistas tbody`);
  if (!tbody) return;
  const lista = estado.comps[n].ciclistas;
  tbody.innerHTML = "";
  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty">Sin ciclistas.</td></tr>`;
    return;
  }
  // ordenar por dorsal numérico para que sea fácil de encontrar
  const orden = [...lista].sort((a, b) => Number(a.dorsal) - Number(b.dorsal) || a.dorsal.localeCompare(b.dorsal));
  orden.forEach((c) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><b>${c.dorsal}</b></td>
      <td>${c.nombre}</td>
      <td>${c.categoria}</td>
      <td>${c.equipo || "—"}</td>
      <td>
        <button class="link-edit" data-comp="${n}" data-dorsal="${c.dorsal}">✏️</button>
        <button class="link-del" data-comp="${n}" data-dorsal="${c.dorsal}">🗑️</button>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".link-del").forEach((b) =>
    b.addEventListener("click", () => eliminarParticipante(Number(b.dataset.comp), b.dataset.dorsal)));
  tbody.querySelectorAll(".link-edit").forEach((b) =>
    b.addEventListener("click", () => editarParticipanteInline(Number(b.dataset.comp), b.dataset.dorsal)));
}

function eliminarParticipante(n, dorsal) {
  if (!confirm(`¿Eliminar al ciclista con dorsal ${dorsal} de esta competencia?`)) return;
  estado.comps[n].ciclistas = estado.comps[n].ciclistas.filter((c) => c.dorsal !== dorsal);
  guardar();
  actualizarCount(n);
  rellenarFiltroCategorias();
  renderSalidasCat();
  renderTablaCiclistas(n);
}

function editarParticipanteInline(n, dorsal) {
  const c = estado.comps[n].ciclistas.find((x) => x.dorsal === dorsal);
  if (!c) return;
  const tbody = document.querySelector(`#comp${n}-tabla-ciclistas tbody`);
  // buscar la fila
  const filas = [...tbody.querySelectorAll("tr")];
  const tr = filas.find((f) => f.querySelector("b") && f.querySelector("b").textContent === dorsal);
  if (!tr) return;
  tr.innerHTML = `
    <td><input class="ed-dorsal" type="number" value="${c.dorsal}" style="width:70px" /></td>
    <td><input class="ed-nombre" type="text" value="${c.nombre.replace(/"/g, "&quot;")}" /></td>
    <td><input class="ed-cat" type="text" value="${c.categoria.replace(/"/g, "&quot;")}" /></td>
    <td><input class="ed-equipo" type="text" value="${(c.equipo || "").replace(/"/g, "&quot;")}" /></td>
    <td>
      <button class="link-edit ed-ok">✅</button>
      <button class="link-del ed-cancel">✖️</button>
    </td>`;
  tr.querySelector(".ed-ok").addEventListener("click", () => {
    const nuevoDorsal = tr.querySelector(".ed-dorsal").value.trim();
    const nuevoNombre = tr.querySelector(".ed-nombre").value.trim();
    if (!nuevoDorsal || !nuevoNombre) { alert("Dorsal y Nombre son obligatorios."); return; }
    // si cambió el dorsal, verificar que no choque con otro
    if (nuevoDorsal !== dorsal && estado.comps[n].ciclistas.some((x) => x.dorsal === nuevoDorsal)) {
      alert(`El dorsal ${nuevoDorsal} ya existe en esta competencia.`);
      return;
    }
    c.dorsal = nuevoDorsal;
    c.nombre = nuevoNombre;
    c.categoria = tr.querySelector(".ed-cat").value.trim() || "Sin categoría";
    c.equipo = tr.querySelector(".ed-equipo").value.trim();
    guardar();
    actualizarCount(n);
    rellenarFiltroCategorias();
    renderSalidasCat();
    renderTablaCiclistas(n);
  });
  tr.querySelector(".ed-cancel").addEventListener("click", () => renderTablaCiclistas(n));
}

document.querySelectorAll(".add-btn").forEach((b) =>
  b.addEventListener("click", () => agregarParticipante(Number(b.dataset.comp))));
// Enter en los campos de agregar participante
[1, 2].forEach((n) => {
  ["cat", "dorsal", "nombre", "equipo"].forEach((campo) => {
    const el = document.getElementById(`comp${n}-add-${campo}`);
    if (el) el.addEventListener("keydown", (e) => { if (e.key === "Enter") agregarParticipante(n); });
  });
});

document.getElementById("comp1-csv").addEventListener("change", (e) => {
  if (e.target.files[0]) manejarCSV(1, e.target.files[0]);
});
document.getElementById("comp2-csv").addEventListener("change", (e) => {
  if (e.target.files[0]) manejarCSV(2, e.target.files[0]);
});

/* ---------------- Guardar configuración ---------------- */
function leerConfigEnEstado() {
  for (const n of [1, 2]) {
    estado.comps[n].nombre = document.getElementById(`comp${n}-nombre`).value.trim();
    estado.comps[n].distancia = document.getElementById(`comp${n}-distancia`).value.trim();
    estado.comps[n].salida = document.getElementById(`comp${n}-salida`).value;
  }
}

document.getElementById("btn-guardar-config").addEventListener("click", () => {
  leerConfigEnEstado();
  guardar();
  const hint = document.getElementById("config-hint");
  hint.textContent = "✅ Configuración guardada.";
  setTimeout(() => (hint.textContent = ""), 2500);
  renderClocks();
  renderClocksRegistro();
  renderSalidasCat();
  rellenarFiltroCategorias();
});

/* ---------------- Pintar config al abrir ---------------- */
function pintarConfig() {
  for (const n of [1, 2]) {
    document.getElementById(`comp${n}-nombre`).value = estado.comps[n].nombre || "";
    document.getElementById(`comp${n}-distancia`).value = estado.comps[n].distancia || "";
    document.getElementById(`comp${n}-salida`).value = estado.comps[n].salida || "";
    actualizarCount(n);
    renderTablaCiclistas(n);
  }
}

/* ---------------- Reloj en vivo ---------------- */
function dosDig(n) { return String(n).padStart(2, "0"); }

function horaActualStr() {
  const d = new Date();
  return `${dosDig(d.getHours())}:${dosDig(d.getMinutes())}:${dosDig(d.getSeconds())}`;
}

// Convierte "HH:MM" o "HH:MM:SS" a segundos del día
function horaASegundos(hhmmss) {
  if (!hhmmss) return null;
  const partes = hhmmss.split(":").map(Number);
  const [h, m, s = 0] = partes;
  if ([h, m].some((x) => isNaN(x))) return null;
  return h * 3600 + m * 60 + s;
}

// Formatea segundos a HH:MM:SS
function segundosAStr(seg) {
  if (seg == null || seg < 0) return "—";
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = Math.floor(seg % 60);
  return `${dosDig(h)}:${dosDig(m)}:${dosDig(s)}`;
}

function tiempoDelDiaSeg(dateObj) {
  return dateObj.getHours() * 3600 + dateObj.getMinutes() * 60 + dateObj.getSeconds();
}

function tickClock() {
  const ahoraStr = horaActualStr();
  const el = document.getElementById("live-clock");
  if (el) el.textContent = ahoraStr;
  const el2 = document.getElementById("live-clock-salidas");
  if (el2) el2.textContent = ahoraStr;
  // actualizar cronómetros de cada competencia (en tab Salidas y tab Registro)
  document.querySelectorAll(".comp-clock").forEach((box) => {
    const n = box.dataset.comp;
    const bEl = box.querySelector("b");
    const salSeg = salidaMasTempranaSeg(n);
    if (salSeg == null) {
      bEl.textContent = "--:--:--";
      box.classList.add("waiting");
      return;
    }
    const paradoEn = estado.comps[n].paradoEn;
    const refAhora = (paradoEn != null) ? paradoEn : tiempoDelDiaSeg(new Date());
    const transcurrido = refAhora - salSeg;
    if (transcurrido < 0) {
      bEl.textContent = "Falta " + segundosAStr(-transcurrido);
      box.classList.add("waiting");
      box.classList.remove("parado");
    } else {
      bEl.textContent = segundosAStr(transcurrido) + (paradoEn != null ? " ⏹️" : "");
      box.classList.remove("waiting");
      box.classList.toggle("parado", paradoEn != null);
    }
  });
}

// Segundos de la salida más temprana de una competencia (general o cualquier categoría)
function salidaMasTempranaSeg(n) {
  const c = estado.comps[n];
  const horas = [];
  if (c.salida) horas.push(horaASegundos(c.salida));
  if (c.salidasCat) Object.values(c.salidasCat).forEach((h) => horas.push(horaASegundos(h)));
  const validas = horas.filter((x) => x != null);
  if (validas.length === 0) return null;
  return Math.min(...validas);
}

function renderClocks() {
  const cont = document.getElementById("comp-clocks");
  pintarCronometros(cont, true); // con botón parar/reanudar
  tickClock();
}

// Cronómetros en el tab Registro (tiempo transcurrido desde la primera salida)
function renderClocksRegistro() {
  const cont = document.getElementById("comp-clocks-registro");
  if (!cont) return;
  pintarCronometros(cont, false); // solo visual, sin botón
  tickClock();
}

// Pinta las cajitas de cronómetro para cada competencia en el contenedor dado
function pintarCronometros(cont, conBoton) {
  cont.innerHTML = "";
  for (const n of [1, 2]) {
    const c = estado.comps[n];
    if (!c.nombre && !c.salida && c.ciclistas.length === 0 && (!c.salidasCat || Object.keys(c.salidasCat).length === 0)) continue;
    const div = document.createElement("div");
    div.className = "comp-clock";
    div.dataset.comp = n;
    const nombre = c.nombre || `Competencia ${n}`;
    const salMin = salidaMasTempranaSeg(n);
    const etiqueta = salMin == null ? "sin salida" : `desde ${segundosAStr(salMin)}`;
    const parado = c.paradoEn != null;
    const btn = conBoton
      ? `<button class="btn-parar ${parado ? "reanudar" : ""}" data-comp="${n}">${parado ? "▶️ Reanudar" : "⏹️ Parar"}</button>`
      : "";
    div.innerHTML = `
      <span>${nombre} <small>(${etiqueta})</small></span>
      <b>--:--:--</b>
      ${btn}`;
    cont.appendChild(div);
  }
  if (conBoton) {
    cont.querySelectorAll(".btn-parar").forEach((b) =>
      b.addEventListener("click", () => toggleParar(Number(b.dataset.comp))));
  }
}

// Para / reanuda el cronómetro visual de una competencia (no afecta los tiempos de los ciclistas)
function toggleParar(n) {
  const c = estado.comps[n];
  if (c.paradoEn != null) {
    c.paradoEn = null; // reanudar
  } else {
    c.paradoEn = tiempoDelDiaSeg(new Date()); // congelar en la hora actual
  }
  guardar();
  renderClocks();
  renderClocksRegistro();
}

// Da salida general a toda la competencia (hora actual)
function darSalidaGeneral(n) {
  const c = estado.comps[n];
  const ahora = new Date();
  c.salida = `${dosDig(ahora.getHours())}:${dosDig(ahora.getMinutes())}:${dosDig(ahora.getSeconds())}`;
  // reflejar en el campo de Configuración
  const campo = document.getElementById(`comp${n}-salida`);
  if (campo) campo.value = c.salida;
  return c.salida;
}

/* ---------------- Salidas por categoría ---------------- */
// Categorías presentes en la base de datos de una competencia
function categoriasDeComp(n) {
  const set = new Set();
  estado.comps[n].ciclistas.forEach((c) => set.add(c.categoria));
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

function renderSalidasCat() {
  const cont = document.getElementById("salidas-cat");
  if (!cont) return;
  cont.innerHTML = "";

  for (const n of [1, 2]) {
    const cats = categoriasDeComp(n);
    if (cats.length === 0) continue;
    const c = estado.comps[n];
    const nombre = c.nombre || `Competencia ${n}`;

    const panel = document.createElement("div");
    panel.className = "salidas-panel";

    // Ordenar: primero las pendientes (sin salida), luego las ya largadas; alfabético dentro de cada grupo
    const ordenadas = [...cats].sort((a, b) => {
      const sa = c.salidasCat[a] ? 1 : 0;
      const sb = c.salidasCat[b] ? 1 : 0;
      if (sa !== sb) return sa - sb; // pendientes (0) antes que largadas (1)
      return a.localeCompare(b, "es");
    });

    const salidas = cats.filter((cat) => c.salidasCat[cat]).length;
    const total = cats.length;

    const filas = ordenadas.map((cat) => {
      const hora = c.salidasCat[cat];
      const estadoTxt = hora
        ? `<span class="sal-hora">salió ${hora}</span>`
        : `<span class="sal-pend">sin salida</span>`;
      return `
        <label class="sal-item ${hora ? "ya-salio" : ""}">
          <input type="checkbox" class="chk-cat" data-comp="${n}" data-cat="${encodeURIComponent(cat)}" />
          <span class="sal-nombre">${cat}</span>
          ${estadoTxt}
          ${hora ? `<button class="sal-reset" data-comp="${n}" data-cat="${encodeURIComponent(cat)}" title="Quitar salida">✖</button>` : ""}
        </label>`;
    }).join("");

    const todasSalieron = salidas === total && total > 0;

    panel.innerHTML = `
      <div class="salidas-head">
        <h4>${nombre}</h4>
        <div class="salidas-acciones">
          <button class="btn-mini sel-all" data-comp="${n}">Marcar todas</button>
          <button class="btn-mini sel-none" data-comp="${n}">Desmarcar</button>
        </div>
      </div>
      <div class="sal-contador ${todasSalieron ? "completo" : ""}">
        ${todasSalieron ? "✅ Todas las categorías ya salieron" : `🚩 ${salidas} de ${total} categorías ya salieron`}
      </div>
      <div class="sal-lista">${filas}</div>
      <button class="btn-salida-grande dar-sal" data-comp="${n}">▶️ DAR SALIDA</button>
      <small class="muted sal-ayuda" data-comp="${n}"></small>`;
    cont.appendChild(panel);
  }

  // listeners
  cont.querySelectorAll(".sel-all").forEach((b) =>
    b.addEventListener("click", () => marcarCats(Number(b.dataset.comp), true)));
  cont.querySelectorAll(".sel-none").forEach((b) =>
    b.addEventListener("click", () => marcarCats(Number(b.dataset.comp), false)));
  cont.querySelectorAll(".dar-sal").forEach((b) =>
    b.addEventListener("click", () => darSalida(Number(b.dataset.comp))));
  cont.querySelectorAll(".chk-cat").forEach((chk) =>
    chk.addEventListener("change", () => actualizarAyudaSalida(Number(chk.dataset.comp))));
  cont.querySelectorAll(".sal-reset").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.preventDefault();
      quitarSalidaCategoria(Number(b.dataset.comp), decodeURIComponent(b.dataset.cat));
    }));

  [1, 2].forEach((n) => actualizarAyudaSalida(n));
}

function marcarCats(n, valor) {
  document.querySelectorAll(`.chk-cat[data-comp="${n}"]`).forEach((chk) => (chk.checked = valor));
  actualizarAyudaSalida(n);
}

// Muestra qué hará el botón grande según lo marcado
function actualizarAyudaSalida(n) {
  const ayuda = document.querySelector(`.sal-ayuda[data-comp="${n}"]`);
  if (!ayuda) return;
  const marcadas = document.querySelectorAll(`.chk-cat[data-comp="${n}"]:checked`).length;
  ayuda.textContent = marcadas > 0
    ? `El botón dará salida a ${marcadas} categoría(s) marcada(s).`
    : "Sin categorías marcadas: el botón dará salida general a toda la competencia.";
}

// Botón grande: da salida a las categorías marcadas, o general si no hay ninguna marcada
function darSalida(n) {
  const c = estado.comps[n];
  const nombre = c.nombre || `Competencia ${n}`;
  const marcadas = [...document.querySelectorAll(`.chk-cat[data-comp="${n}"]:checked`)]
    .map((chk) => decodeURIComponent(chk.dataset.cat));

  const ahora = new Date();
  const hora = `${dosDig(ahora.getHours())}:${dosDig(ahora.getMinutes())}:${dosDig(ahora.getSeconds())}`;

  let mensaje;
  if (marcadas.length > 0) {
    // Salida por categorías marcadas (hora exacta del clic, sin desfase)
    marcadas.forEach((cat) => (c.salidasCat[cat] = hora));
    mensaje = `▶️ Salida dada a las <b>${hora}</b> para ${marcadas.length} categoría(s): ${marcadas.join(", ")}.`;
  } else {
    // Salida general a toda la competencia
    darSalidaGeneral(n);
    mensaje = `▶️ Salida GENERAL de <b>${nombre}</b> dada a las <b>${hora}</b>.`;
  }
  guardar();
  renderSalidasCat();
  renderTablaRegistro();
  const hint = document.getElementById("salidas-hint");
  if (hint) {
    hint.innerHTML = mensaje;
    setTimeout(() => (hint.innerHTML = ""), 6000);
  }
}

function quitarSalidaCategoria(n, cat) {
  if (!confirm(`¿Quitar la hora de salida de la categoría "${cat}"? Volverá a usar la salida general si existe.`)) return;
  delete estado.comps[n].salidasCat[cat];
  guardar();
  renderSalidasCat();
  renderTablaRegistro();
}

/* ---------------- Registro de llegada ---------------- */
// Busca un ciclista por dorsal en ambas competencias
function buscarPorDorsal(dorsal) {
  const d = String(dorsal).trim();
  for (const n of [1, 2]) {
    const c = estado.comps[n].ciclistas.find((x) => x.dorsal === d);
    if (c) return { ...c, comp: n };
  }
  return null;
}

function registrarLlegada() {
  const input = document.getElementById("input-dorsal");
  const fb = document.getElementById("dorsal-feedback");
  const dorsal = input.value.trim();
  if (!dorsal) return;

  const ciclista = buscarPorDorsal(dorsal);
  if (!ciclista) {
    fb.innerHTML = `<span class="err">⚠️ Dorsal <b>${dorsal}</b> no encontrado en ninguna base de datos.</span>`;
    input.select();
    return;
  }

  // ¿ya registrado?
  const yaExiste = estado.llegadas.find((l) => l.dorsal === ciclista.dorsal && l.comp === ciclista.comp);
  if (yaExiste) {
    fb.innerHTML = `<span class="err">⚠️ El dorsal <b>${dorsal}</b> (${ciclista.nombre}) ya fue registrado a las ${new Date(yaExiste.horaLlegada).toLocaleTimeString("es-CR")}.</span>`;
    input.select();
    return;
  }

  const ahora = new Date();
  const llegada = {
    dorsal: ciclista.dorsal,
    comp: ciclista.comp,
    nombre: ciclista.nombre,
    categoria: ciclista.categoria,
    equipo: ciclista.equipo,
    horaLlegada: ahora.toISOString(),
  };
  estado.llegadas.push(llegada);
  guardar();

  const tiempo = calcularTiempo(llegada);
  fb.innerHTML = `<span class="ok">✅ <b>${ciclista.nombre}</b> (dorsal ${dorsal}, ${ciclista.categoria}) — tiempo <b>${tiempo}</b></span>`;
  input.value = "";
  input.focus();
  renderTablaRegistro();
}

// Hora de salida efectiva de un ciclista: usa la de su categoría si existe, si no la general de la competencia
function salidaEfectiva(comp, categoria) {
  const c = estado.comps[comp];
  const porCat = c.salidasCat && c.salidasCat[categoria];
  return porCat || c.salida || "";
}

// Calcula el tiempo = horaLlegada - horaSalida (de la categoría o general)
function calcularTiempo(llegada) {
  const salida = salidaEfectiva(llegada.comp, llegada.categoria);
  const salSeg = horaASegundos(salida);
  if (salSeg == null) return "sin hora salida";
  const d = new Date(llegada.horaLlegada);
  const llegadaSeg = tiempoDelDiaSeg(d);
  const diff = llegadaSeg - salSeg;
  return segundosAStr(diff);
}

function tiempoSegundos(llegada) {
  const salSeg = horaASegundos(salidaEfectiva(llegada.comp, llegada.categoria));
  if (salSeg == null) return Infinity;
  const llegadaSeg = tiempoDelDiaSeg(new Date(llegada.horaLlegada));
  return llegadaSeg - salSeg;
}

document.getElementById("btn-registrar").addEventListener("click", registrarLlegada);
document.getElementById("input-dorsal").addEventListener("keydown", (e) => {
  if (e.key === "Enter") registrarLlegada();
});

function renderTablaRegistro() {
  const tbody = document.querySelector("#tabla-registro tbody");
  tbody.innerHTML = "";
  // más recientes arriba
  const lista = [...estado.llegadas].reverse();
  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty">Aún no hay llegadas registradas.</td></tr>`;
    return;
  }
  lista.forEach((l, idx) => {
    const tr = document.createElement("tr");
    const nombreComp = estado.comps[l.comp].nombre || `Comp ${l.comp}`;
    tr.innerHTML = `
      <td>${lista.length - idx}</td>
      <td><b>${l.dorsal}</b></td>
      <td>${l.nombre}</td>
      <td>${l.categoria}</td>
      <td>${l.equipo || "—"}</td>
      <td>${nombreComp}</td>
      <td>${new Date(l.horaLlegada).toLocaleTimeString("es-CR")}</td>
      <td class="time">${calcularTiempo(l)}</td>
      <td><button class="link-del" data-dorsal="${l.dorsal}" data-comp="${l.comp}">✖ borrar</button></td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll(".link-del").forEach((btn) => {
    btn.addEventListener("click", () => {
      const d = btn.dataset.dorsal, c = Number(btn.dataset.comp);
      if (!confirm(`¿Borrar la llegada del dorsal ${d}?`)) return;
      estado.llegadas = estado.llegadas.filter((l) => !(l.dorsal === d && l.comp === c));
      guardar();
      renderTablaRegistro();
    });
  });
}

/* ---------------- Resultados ---------------- */
function rellenarFiltroCategorias() {
  const sel = document.getElementById("filtro-cat");
  const prev = sel.value;
  const cats = new Set();
  for (const n of [1, 2]) estado.comps[n].ciclistas.forEach((c) => cats.add(c.categoria));
  estado.llegadas.forEach((l) => cats.add(l.categoria));
  sel.innerHTML = `<option value="all">Todas</option>`;
  [...cats].sort((a, b) => a.localeCompare(b, "es")).forEach((cat) => {
    const o = document.createElement("option");
    o.value = cat; o.textContent = cat;
    sel.appendChild(o);
  });
  if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
}

function renderResultados() {
  rellenarFiltroCategorias();
  const compF = document.getElementById("filtro-comp").value;
  const catF = document.getElementById("filtro-cat").value;
  const cont = document.getElementById("resultados-cont");

  let lista = [...estado.llegadas];
  if (compF !== "all") lista = lista.filter((l) => String(l.comp) === compF);
  if (catF !== "all") lista = lista.filter((l) => l.categoria === catF);

  if (lista.length === 0) {
    cont.innerHTML = `<div class="empty">No hay resultados con los filtros seleccionados.</div>`;
    return;
  }

  // Agrupar por competencia y categoría
  const grupos = {};
  lista.forEach((l) => {
    const nombreComp = estado.comps[l.comp].nombre || `Competencia ${l.comp}`;
    const key = `${l.comp}||${nombreComp}||${l.categoria}`;
    (grupos[key] = grupos[key] || []).push(l);
  });

  const keysOrden = Object.keys(grupos).sort((a, b) => {
    const [ca, , cata] = a.split("||");
    const [cb, , catb] = b.split("||");
    if (ca !== cb) return ca.localeCompare(cb);
    return cata.localeCompare(catb, "es");
  });

  cont.innerHTML = "";
  keysOrden.forEach((key) => {
    const [, nombreComp, categoria] = key.split("||");
    const filas = grupos[key].sort((a, b) => tiempoSegundos(a) - tiempoSegundos(b));

    const group = document.createElement("div");
    group.className = "result-group";
    group.innerHTML = `<h3>${nombreComp} — ${categoria}</h3>`;

    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    const table = document.createElement("table");
    table.innerHTML = `
      <thead><tr>
        <th>Pos</th><th>Dorsal</th><th>Nombre</th><th>Equipo</th><th>Hora llegada</th><th>Tiempo</th>
      </tr></thead><tbody></tbody>`;
    const tb = table.querySelector("tbody");
    filas.forEach((l, i) => {
      const tr = document.createElement("tr");
      if (i < 3) tr.className = `podium-${i + 1}`;
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td><b>${l.dorsal}</b></td>
        <td>${l.nombre}</td>
        <td>${l.equipo || "—"}</td>
        <td>${new Date(l.horaLlegada).toLocaleTimeString("es-CR")}</td>
        <td class="time">${calcularTiempo(l)}</td>`;
      tb.appendChild(tr);
    });
    wrap.appendChild(table);
    group.appendChild(wrap);
    cont.appendChild(group);
  });
}

document.getElementById("filtro-comp").addEventListener("change", renderResultados);
document.getElementById("filtro-cat").addEventListener("change", renderResultados);
document.getElementById("btn-imprimir").addEventListener("click", () => window.print());

/* ---------------- Exportar resultados a CSV (Excel) ---------------- */
// Devuelve las llegadas filtradas según los selects de competencia y categoría
function llegadasFiltradas() {
  const compF = document.getElementById("filtro-comp").value;
  const catF = document.getElementById("filtro-cat").value;
  let lista = [...estado.llegadas];
  if (compF !== "all") lista = lista.filter((l) => String(l.comp) === compF);
  if (catF !== "all") lista = lista.filter((l) => l.categoria === catF);
  return { lista, compF, catF };
}

// Escapa un campo para CSV con ; (envuelve en comillas si trae ; " o salto de línea)
function csvCampo(v) {
  const s = String(v == null ? "" : v);
  if (/[;"\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function descargarCSV(nombre, filas) {
  // BOM para que Excel reconozca los acentos (UTF-8)
  const contenido = "\uFEFF" + filas.map((f) => f.map(csvCampo).join(";")).join("\r\n");
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

function nombreComp(n) {
  return estado.comps[n].nombre || `Competencia ${n}`;
}

// Export POR CATEGORÍA: agrupa por competencia+categoría, posición dentro de cada grupo
document.getElementById("btn-export-cat").addEventListener("click", () => {
  const { lista } = llegadasFiltradas();
  if (lista.length === 0) {
    alert("No hay resultados para exportar con los filtros seleccionados.");
    return;
  }
  // Agrupar por competencia+categoría
  const grupos = {};
  lista.forEach((l) => {
    const key = `${l.comp}||${l.categoria}`;
    (grupos[key] = grupos[key] || []).push(l);
  });
  const keys = Object.keys(grupos).sort((a, b) => {
    const [ca, cata] = a.split("||");
    const [cb, catb] = b.split("||");
    if (ca !== cb) return ca.localeCompare(cb);
    return cata.localeCompare(catb, "es");
  });

  const filas = [["Posición", "Dorsal", "Nombre", "Equipo", "Categoría", "Competencia", "Hora llegada", "Tiempo"]];
  keys.forEach((key) => {
    const grupo = grupos[key].sort((x, y) => tiempoSegundos(x) - tiempoSegundos(y));
    grupo.forEach((l, i) => {
      filas.push([
        i + 1,
        l.dorsal,
        l.nombre,
        l.equipo || "",
        l.categoria,
        nombreComp(l.comp),
        new Date(l.horaLlegada).toLocaleTimeString("es-CR"),
        calcularTiempo(l),
      ]);
    });
  });

  const fecha = new Date().toISOString().slice(0, 10);
  descargarCSV(`resultados-por-categoria-${fecha}.csv`, filas);
});

// Export GENERAL por orden de llegada (hora de llegada real, todos juntos)
document.getElementById("btn-export-gral").addEventListener("click", () => {
  const { lista } = llegadasFiltradas();
  if (lista.length === 0) {
    alert("No hay resultados para exportar con los filtros seleccionados.");
    return;
  }
  const orden = [...lista].sort((a, b) => new Date(a.horaLlegada) - new Date(b.horaLlegada));
  const filas = [["Orden de llegada", "Dorsal", "Nombre", "Equipo", "Categoría", "Competencia", "Hora llegada", "Tiempo"]];
  orden.forEach((l, i) => {
    filas.push([
      i + 1,
      l.dorsal,
      l.nombre,
      l.equipo || "",
      l.categoria,
      nombreComp(l.comp),
      new Date(l.horaLlegada).toLocaleTimeString("es-CR"),
      calcularTiempo(l),
    ]);
  });

  const fecha = new Date().toISOString().slice(0, 10);
  descargarCSV(`resultados-por-llegada-${fecha}.csv`, filas);
});

/* ---------------- Exportar / Importar ---------------- */
document.getElementById("btn-exportar").addEventListener("click", () => {
  leerConfigEnEstado();
  guardar();
  const blob = new Blob([JSON.stringify(estado, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const fecha = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `control-competencia-${fecha}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("file-importar").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.comps || !Array.isArray(data.llegadas)) {
        alert("El archivo no tiene el formato esperado.");
        return;
      }
      if (!confirm("Esto REEMPLAZARÁ todos los datos de este dispositivo. ¿Continuar?")) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      estado = cargar();
      pintarConfig();
      renderClocks();
      renderClocksRegistro();
      renderSalidasCat();
      renderTablaRegistro();
      rellenarFiltroCategorias();
      alert("✅ Respaldo importado correctamente.");
    } catch (err) {
      alert("Error al leer el archivo: " + err.message);
    }
  };
  reader.readAsText(file, "UTF-8");
  e.target.value = "";
});

/* ---------------- Borrar salidas (tab Salidas) ---------------- */
document.getElementById("btn-borrar-salidas").addEventListener("click", () => {
  if (!confirm("¿Borrar TODAS las horas de salida (general y por categoría) de ambas competencias?\n\nEsto NO borra la base de datos ni las llegadas registradas.")) return;
  for (const n of [1, 2]) {
    estado.comps[n].salida = "";
    estado.comps[n].salidasCat = {};
    const campo = document.getElementById(`comp${n}-salida`);
    if (campo) campo.value = "";
  }
  guardar();
  renderClocks();
  renderClocksRegistro();
  renderSalidasCat();
  renderTablaRegistro();
  const hint = document.getElementById("salidas-hint");
  if (hint) {
    hint.innerHTML = "🗑️ Salidas borradas.";
    setTimeout(() => (hint.innerHTML = ""), 4000);
  }
});

/* ---------------- Borrar llegadas (tab Registro) ---------------- */
document.getElementById("btn-borrar-llegadas").addEventListener("click", () => {
  if (estado.llegadas.length === 0) {
    alert("No hay llegadas registradas para borrar.");
    return;
  }
  if (!confirm(`¿Borrar las ${estado.llegadas.length} llegada(s) registrada(s)?\n\nEsto NO borra la base de datos ni las horas de salida.`)) return;
  estado.llegadas = [];
  guardar();
  renderTablaRegistro();
  const fb = document.getElementById("dorsal-feedback");
  if (fb) fb.innerHTML = `<span class="ok">🗑️ Llegadas borradas.</span>`;
});

/* ---------------- Borrar todo ---------------- */
document.getElementById("btn-reset").addEventListener("click", () => {
  if (!confirm("¿Seguro que querés borrar TODA la configuración y las llegadas de este dispositivo?")) return;
  localStorage.removeItem(STORAGE_KEY);
  estado = estadoInicial();
  pintarConfig();
  renderClocks();
  renderClocksRegistro();
  renderSalidasCat();
  renderTablaRegistro();
  rellenarFiltroCategorias();
});

/* ---------------- Inicio ---------------- */
pintarConfig();
renderTablaRegistro();
renderClocks();
renderClocksRegistro();
renderSalidasCat();
rellenarFiltroCategorias();
setInterval(tickClock, 1000);
