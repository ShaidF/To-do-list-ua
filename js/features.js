/**
 * ÓRBITA — Módulo de funcionalidades avanzadas
 */
(function () {
  "use strict";

  var app = null;
  var undoStack = null;
  var calYear, calMonth;
  var pomoInterval = null;
  var pomoSegundos = 25 * 60;
  var pomoActivo = false;
  var focusId = null;
  var deferredInstall = null;

  var STREAK_KEY = "orbita_racha";
  var ACCENT_KEY = "orbita_accent";
  var SONIDO_KEY = "orbita_sonido";

  function getRacha() {
    try {
      var d = JSON.parse(localStorage.getItem(STREAK_KEY) || "{}");
      return d.count || 0;
    } catch (e) { return 0; }
  }

  function registrarCompletado() {
    var hoy = new Date().toISOString().split("T")[0];
    var d = JSON.parse(localStorage.getItem(STREAK_KEY) || "{}");
    if (d.ultimo === hoy) return;
    if (d.ultimo) {
      var ayer = new Date();
      ayer.setDate(ayer.getDate() - 1);
      d.count = d.ultimo === ayer.toISOString().split("T")[0] ? (d.count || 0) + 1 : 1;
    } else {
      d.count = 1;
    }
    d.ultimo = hoy;
    localStorage.setItem(STREAK_KEY, JSON.stringify(d));
    actualizarRachaUI();
    if (d.count >= 3) app.verificarLogros();
  }

  function actualizarRachaUI() {
    var el = document.getElementById("racha-badge");
    if (el) el.textContent = "🔥 " + getRacha() + " día" + (getRacha() !== 1 ? "s" : "");
  }

  function feedbackExito() {
    if (localStorage.getItem(SONIDO_KEY) === "0") return;
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.value = 0.08;
      o.start();
      o.stop(ctx.currentTime + 0.12);
    } catch (e) { /* sin audio */ }
    if (navigator.vibrate) navigator.vibrate(40);
  }

  function aplicarAccent(color) {
    document.documentElement.style.setProperty("--accent-user", color);
    document.documentElement.style.setProperty("--accent-cyan", color);
    localStorage.setItem(ACCENT_KEY, color);
  }

  function renderStatsCategorias() {
    var panel = document.getElementById("stats-categorias");
    if (!panel) return;
    var cats = ["estudio", "trabajo", "personal", "salud"];
    var ms = app.getMisiones();
    var max = 1;
    var counts = {};
    cats.forEach(function (c) {
      counts[c] = ms.filter(function (m) { return m.categoria === c; }).length;
      if (counts[c] > max) max = counts[c];
    });
    panel.innerHTML = cats.map(function (c) {
      var n = counts[c];
      var pct = (n / max) * 100;
      return '<div class="stat-bar-row">' +
        '<span>' + app.capitalizar(c) + "</span>" +
        '<div class="stat-bar-track"><div class="stat-bar-fill" style="width:' + pct + '%"></div></div>' +
        "<span>" + n + "</span></div>";
    }).join("");
  }

  function renderModal(mision) {
    var cr = app.calcularTiempoRestante(mision.fecha);
    var tags = (mision.etiquetas || []).map(function (t) {
      return '<span class="etiqueta-tag">' + app.escaparHTML(t) + "</span>";
    }).join("");
    var subs = (mision.subtareas || []).map(function (s) {
      return '<li class="' + (s.hecha ? "hecha" : "") + '" data-sub-id="' + s.id + '">' +
        '<label><input type="checkbox" ' + (s.hecha ? "checked" : "") + "> " +
        app.escaparHTML(s.texto) + "</label></li>";
    }).join("");

    document.getElementById("modal-cuerpo").innerHTML =
      '<div class="modal-detalle">' +
      "<p><strong>Descripción:</strong> " + (app.escaparHTML(mision.descripcion) || "—") + "</p>" +
      "<p><strong>Categoría:</strong> " + app.capitalizar(mision.categoria) + "</p>" +
      "<p><strong>Prioridad:</strong> " + mision.prioridad + "</p>" +
      "<p><strong>Fecha:</strong> " + app.formatearFecha(mision.fecha) + " — " + cr.texto + "</p>" +
      (tags ? "<p><strong>Etiquetas:</strong></p><div class='etiquetas-row'>" + tags + "</div>" : "") +
      (subs ? "<p><strong>Sub-tareas:</strong></p><ul class='lista-subtareas-modal'>" + subs + "</ul>" : "") +
      "</div>";

    document.getElementById("modal-cuerpo").querySelectorAll("input[type=checkbox]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var li = cb.closest("li");
        var sid = li.dataset.subId;
        var m = app.getMisiones().find(function (x) { return x.id === mision.id; });
        if (!m) return;
        m.subtareas.forEach(function (s) {
          if (s.id === sid) s.hecha = cb.checked;
        });
        app.guardar();
        app.renderizar();
        renderModal(m);
      });
    });

    var editEl = document.getElementById("modal-editar");
    editEl.innerHTML =
      '<div class="campo-grupo"><label>Título</label><input id="edit-titulo"></div>' +
      '<div class="campo-grupo"><label>Descripción</label><textarea id="edit-desc" rows="2"></textarea></div>' +
      '<div class="campo-grupo"><label>Prioridad</label><select id="edit-prio">' +
      ["baja", "media", "alta"].map(function (p) {
        return '<option value="' + p + '">' + p + "</option>";
      }).join("") + "</select></div>" +
      '<div class="campo-grupo"><label>Fecha</label><input type="date" id="edit-fecha"></div>' +
      '<div class="campo-grupo"><label>Categoría</label><select id="edit-cat">' +
      ["estudio", "trabajo", "personal", "salud"].map(function (c) {
        return '<option value="' + c + '">' + c + "</option>";
      }).join("") + "</select></div>" +
      '<div class="campo-grupo"><label>Etiquetas</label><input id="edit-tags"></div>' +
      '<div class="campo-grupo"><label>Sub-tareas (una por línea)</label><textarea id="edit-subs" rows="3"></textarea></div>';
    document.getElementById("edit-titulo").value = mision.titulo;
    document.getElementById("edit-desc").value = mision.descripcion || "";
    document.getElementById("edit-prio").value = mision.prioridad;
    document.getElementById("edit-fecha").value = mision.fecha;
    document.getElementById("edit-cat").value = mision.categoria;
    document.getElementById("edit-tags").value = (mision.etiquetas || []).join(", ");
    document.getElementById("edit-subs").value = (mision.subtareas || []).map(function (s) { return s.texto; }).join("\n");
    document.getElementById("modal-titulo").dataset.editId = mision.id;

    setModalModo("ver");
  }

  function setModalModo(modo) {
    document.querySelectorAll(".modal-tab").forEach(function (t) {
      t.classList.toggle("activo", t.dataset.modo === modo);
    });
    document.getElementById("modal-cuerpo").classList.toggle("oculto", modo === "editar");
    document.getElementById("modal-editar").classList.toggle("oculto", modo !== "editar");
    document.getElementById("modal-guardar").classList.toggle("oculto", modo !== "editar");
    document.getElementById("modal-completar").classList.toggle("oculto", modo === "editar");
  }

  function guardarEdicionModal() {
    var id = document.getElementById("modal-titulo").dataset.editId;
    if (!id) return;
    app.actualizar(id, {
      titulo: document.getElementById("edit-titulo").value,
      descripcion: document.getElementById("edit-desc").value,
      prioridad: document.getElementById("edit-prio").value,
      fecha: document.getElementById("edit-fecha").value,
      categoria: document.getElementById("edit-cat").value,
      etiquetas: app.parsearEtiquetas(document.getElementById("edit-tags").value),
      subtareas: app.parsearSubtareas(document.getElementById("edit-subs").value),
    });
    app.mostrarToastGlobal("✓ Misión actualizada");
    app.cerrarModal();
  }

  function pushUndo(mision) {
    undoStack = mision;
    var btn = document.getElementById("btn-undo");
    if (btn) btn.classList.remove("oculto");
  }

  function initDragDrop() {
    var lista = document.getElementById("lista-activas");
    if (!lista) return;
    var draggedId = null;

    lista.addEventListener("dragstart", function (e) {
      var handle = e.target.closest("[data-drag]");
      if (!handle) { e.preventDefault(); return; }
      var card = handle.closest(".tarjeta-mision");
      if (!card) return;
      draggedId = card.dataset.id;
      card.classList.add("arrastrando");
      e.dataTransfer.effectAllowed = "move";
      if (document.getElementById("orden-misiones")) {
        document.getElementById("orden-misiones").value = "manual";
      }
    });

    lista.addEventListener("dragend", function (e) {
      var card = e.target.closest(".tarjeta-mision");
      if (card) card.classList.remove("arrastrando");
      document.querySelectorAll(".drag-over").forEach(function (el) {
        el.classList.remove("drag-over");
      });
    });

    lista.addEventListener("dragover", function (e) {
      e.preventDefault();
      var card = e.target.closest(".tarjeta-mision");
      document.querySelectorAll(".drag-over").forEach(function (el) {
        el.classList.remove("drag-over");
      });
      if (card) card.classList.add("drag-over");
    });

    lista.addEventListener("drop", function (e) {
      e.preventDefault();
      var target = e.target.closest(".tarjeta-mision");
      if (!target || !draggedId || target.dataset.id === draggedId) return;
      var ms = app.getMisiones();
      var from = ms.findIndex(function (m) { return m.id === draggedId; });
      var to = ms.findIndex(function (m) { return m.id === target.dataset.id; });
      if (from < 0 || to < 0) return;
      var item = ms.splice(from, 1)[0];
      ms.splice(to, 0, item);
      ms.filter(function (m) { return !m.completada; }).forEach(function (m, i) {
        m.orden = i;
      });
      app.setMisiones(ms);
    });
  }

  function renderCalendario() {
    var grid = document.getElementById("calendario-grid");
    var label = document.getElementById("cal-mes-label");
    if (!grid) return;
    var meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    label.textContent = meses[calMonth] + " " + calYear;
    var first = new Date(calYear, calMonth, 1);
    var start = first.getDay();
    var days = new Date(calYear, calMonth + 1, 0).getDate();
    var hoy = new Date().toISOString().split("T")[0];
    var html = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"].map(function (d) {
      return '<div class="cal-dia-nombre">' + d + "</div>";
    }).join("");

    for (var i = 0; i < start; i++) html += '<div class="cal-celda otro-mes"></div>';
    for (var d = 1; d <= days; d++) {
      var iso = calYear + "-" + String(calMonth + 1).padStart(2, "0") + "-" + String(d).padStart(2, "0");
      var delDia = app.getMisiones().filter(function (m) { return m.fecha === iso && !m.completada; });
      var puntos = delDia.map(function (m) {
        return '<span class="cal-punto ' + m.prioridad + '"></span>';
      }).join("");
      html += '<div class="cal-celda' + (iso === hoy ? " hoy" : "") + '" data-fecha="' + iso + '">' +
        '<span class="cal-num">' + d + "</span><div class='cal-puntos'>" + puntos + "</div></div>";
    }
    grid.innerHTML = html;
    grid.querySelectorAll(".cal-celda[data-fecha]").forEach(function (cel) {
      cel.addEventListener("click", function () {
        var f = cel.dataset.fecha;
        var list = app.getMisiones().filter(function (m) { return m.fecha === f; });
        document.getElementById("cal-detalle").textContent = list.length
          ? list.map(function (m) { return m.titulo; }).join(" · ")
          : "Sin misiones este día";
      });
    });
  }

  function exportarJSON() {
    var blob = new Blob([JSON.stringify(app.getMisiones(), null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "orbita-misiones-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    app.mostrarToastGlobal("📁 Exportación completada");
  }

  function importarJSON(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error("Formato inválido");
        app.setMisiones(data);
        app.mostrarToastGlobal("✓ " + data.length + " misiones importadas");
      } catch (err) {
        alert("Error al importar: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  function cargarAPIMock() {
    fetch("data/misiones-ejemplo.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var actuales = app.getMisiones();
        data.forEach(function (d, i) {
          actuales.push(app.normalizar({
            id: app.generarId(),
            titulo: d.titulo,
            descripcion: d.descripcion || "",
            prioridad: d.prioridad,
            fecha: d.fecha,
            categoria: d.categoria,
            etiquetas: d.etiquetas || [],
            subtareas: (d.subtareas || []).map(function (s, j) {
              return { id: "sub-" + j, texto: s.texto || s, hecha: !!s.hecha };
            }),
            completada: false,
            creadaEn: Date.now() - i,
            orden: i,
          }, actuales.length));
        });
        app.setMisiones(actuales);
        app.mostrarToastGlobal("🛰 API mock: " + data.length + " misiones cargadas");
      })
      .catch(function () {
        alert("No se pudo cargar data/misiones-ejemplo.json. Usa un servidor local.");
      });
  }

  function activarNotificaciones() {
    if (!("Notification" in window)) {
      alert("Tu navegador no soporta notificaciones.");
      return;
    }
    Notification.requestPermission().then(function (perm) {
      if (perm === "granted") {
        app.getMisiones().filter(function (m) {
          return !m.completada && app.esFechaHoy(m.fecha);
        }).forEach(function (m) {
          new Notification("ÓRBITA — Vence hoy", { body: m.titulo, icon: "icons/icon-192.svg" });
        });
        app.mostrarToastGlobal("🔔 Notificaciones activadas");
      }
    });
  }

  function compartirResumen() {
    var activas = app.getMisiones().filter(function (m) { return !m.completada; });
    var txt = "ÓRBITA — Misiones activas (" + activas.length + ")\n" +
      activas.map(function (m, i) {
        return i + 1 + ". " + m.titulo + " [" + m.prioridad + "] " + m.fecha;
      }).join("\n");
    navigator.clipboard.writeText(txt).then(function () {
      app.mostrarToastGlobal("📋 Resumen copiado al portapapeles");
    });
  }

  function abrirFocusMode() {
    var activas = app.getMisiones().filter(function (m) { return !m.completada; });
    if (!activas.length) {
      app.mostrarToastGlobal("No hay misiones para enfocar");
      return;
    }
    var m = activas[0];
    if (activas.length > 1) {
      var alta = activas.find(function (x) { return x.prioridad === "alta"; });
      if (alta) m = alta;
    }
    focusId = m.id;
    document.getElementById("focus-titulo").textContent = m.titulo;
    document.getElementById("focus-desc").textContent = m.descripcion || "";
    var ul = document.getElementById("focus-subtareas");
    ul.innerHTML = (m.subtareas || []).map(function (s) {
      return "<li>" + (s.hecha ? "✓ " : "○ ") + app.escaparHTML(s.texto) + "</li>";
    }).join("") || "<li>Sin sub-tareas</li>";
    document.getElementById("focus-overlay").classList.remove("oculto");
    document.body.style.overflow = "hidden";
  }

  function initPomodoro() {
    var panel = document.getElementById("pomo-panel");
    var select = document.getElementById("pomo-select-mision");

    function refill() {
      select.innerHTML = '<option value="">— Misión —</option>';
      app.getMisiones().filter(function (m) { return !m.completada; }).forEach(function (m) {
        var o = document.createElement("option");
        o.value = m.id;
        o.textContent = m.titulo.slice(0, 30);
        select.appendChild(o);
      });
    }

    function tickDisplay() {
      var m = Math.floor(pomoSegundos / 60);
      var s = pomoSegundos % 60;
      document.getElementById("pomo-tiempo").textContent =
        String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    }

    document.getElementById("pomo-toggle").addEventListener("click", function () {
      panel.classList.toggle("oculto");
      refill();
    });

    document.getElementById("pomo-start").addEventListener("click", function () {
      localStorage.setItem("orbita_pomo_usado", "1");
      if (pomoActivo) {
        clearInterval(pomoInterval);
        pomoActivo = false;
        document.getElementById("pomo-start").textContent = "Iniciar";
        return;
      }
      var id = select.value;
      document.getElementById("pomo-mision-label").textContent = id
        ? app.getMisiones().find(function (m) { return m.id === id; }).titulo
        : "Tiempo general";
      pomoActivo = true;
      document.getElementById("pomo-start").textContent = "Pausar";
      pomoInterval = setInterval(function () {
        pomoSegundos--;
        tickDisplay();
        if (pomoSegundos <= 0) {
          clearInterval(pomoInterval);
          pomoActivo = false;
          pomoSegundos = 25 * 60;
          feedbackExito();
          app.mostrarToastGlobal("⏱ ¡Pomodoro completado!");
          document.getElementById("pomo-start").textContent = "Iniciar";
        }
      }, 1000);
    });

    document.getElementById("pomo-reset").addEventListener("click", function () {
      clearInterval(pomoInterval);
      pomoActivo = false;
      pomoSegundos = 25 * 60;
      tickDisplay();
      document.getElementById("pomo-start").textContent = "Iniciar";
    });
    tickDisplay();
  }

  function initAtajos() {
    var ayuda = document.getElementById("atajos-ayuda");
    document.addEventListener("keydown", function (e) {
      if (e.target.matches("input, textarea, select") && e.key !== "Escape") return;
      if (e.key === "?" && ayuda) {
        ayuda.classList.toggle("oculto");
        ayuda.innerHTML = "<strong>Atajos</strong><br>N → Nueva misión<br>/ → Buscar<br>F → Modo foco<br>Esc → Cerrar";
        return;
      }
      if (e.key === "n" || e.key === "N") {
        location.hash = "#nueva-mision";
        document.getElementById("titulo-mision").focus();
      }
      if (e.key === "/") {
        e.preventDefault();
        var b = document.getElementById("buscar-mision");
        if (b) b.focus();
      }
      if (e.key === "f" || e.key === "F") abrirFocusMode();
    });
  }

  function initSyncTabs() {
    window.addEventListener("storage", function (e) {
      if (e.key === "orbita_misiones" && e.newValue) {
        try {
          app.setMisiones(JSON.parse(e.newValue));
          app.mostrarToastGlobal("↻ Datos sincronizados desde otra pestaña");
        } catch (err) { /* ignore */ }
      }
    });
  }

  function registerSW() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    }
  }

  function init(A) {
    app = A;
    var now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth();

    actualizarRachaUI();
    var accent = localStorage.getItem(ACCENT_KEY);
    if (accent) {
      aplicarAccent(accent);
      var picker = document.getElementById("accent-color");
      if (picker) picker.value = accent;
    }

    document.getElementById("accent-color").addEventListener("input", function (e) {
      aplicarAccent(e.target.value);
    });

    document.getElementById("btn-solo-hoy").addEventListener("click", function () {
      var on = !app.getFiltroSoloHoy();
      app.setFiltroSoloHoy(on);
      this.classList.toggle("activo", on);
      this.textContent = on ? "Ver todas" : "Solo hoy";
    });

    document.getElementById("btn-undo").addEventListener("click", function () {
      if (!undoStack) return;
      var ms = app.getMisiones();
      ms.unshift(app.normalizar(undoStack, 0));
      app.setMisiones(ms);
      undoStack = null;
      this.classList.add("oculto");
      app.mostrarToastGlobal("↩ Misión restaurada");
    });

    document.getElementById("btn-focus-mode").addEventListener("click", abrirFocusMode);
    document.getElementById("focus-cerrar").addEventListener("click", function () {
      document.getElementById("focus-overlay").classList.add("oculto");
      document.body.style.overflow = "";
    });
    document.getElementById("focus-completar").addEventListener("click", function () {
      if (focusId) app.completar(focusId, null);
      document.getElementById("focus-overlay").classList.add("oculto");
      document.body.style.overflow = "";
    });

    document.querySelectorAll(".modal-tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        setModalModo(tab.dataset.modo);
      });
    });

    document.getElementById("modal-guardar").addEventListener("click", guardarEdicionModal);

    document.getElementById("cal-prev").addEventListener("click", function () {
      calMonth--;
      if (calMonth < 0) { calMonth = 11; calYear--; }
      renderCalendario();
    });
    document.getElementById("cal-next").addEventListener("click", function () {
      calMonth++;
      if (calMonth > 11) { calMonth = 0; calYear++; }
      renderCalendario();
    });

    document.getElementById("btn-exportar").addEventListener("click", exportarJSON);
    document.getElementById("input-importar").addEventListener("change", function (e) {
      if (e.target.files[0]) importarJSON(e.target.files[0]);
    });
    document.getElementById("btn-cargar-api").addEventListener("click", cargarAPIMock);
    document.getElementById("btn-notificaciones").addEventListener("click", activarNotificaciones);
    document.getElementById("btn-compartir").addEventListener("click", compartirResumen);
    document.getElementById("toggle-sonido").addEventListener("change", function (e) {
      localStorage.setItem(SONIDO_KEY, e.target.checked ? "1" : "0");
    });
    if (localStorage.getItem(SONIDO_KEY) === "0") {
      document.getElementById("toggle-sonido").checked = false;
    }

    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredInstall = e;
    });
    document.getElementById("btn-instalar-pwa").addEventListener("click", function () {
      if (deferredInstall) deferredInstall.prompt();
      else app.mostrarToastGlobal("Usa el menú del navegador → Instalar aplicación");
    });

    initDragDrop();
    initPomodoro();
    initAtajos();
    initSyncTabs();
    registerSW();
    renderCalendario();
    renderStatsCategorias();
  }

  function postRender() {
    renderStatsCategorias();
    renderCalendario();
    initDragDrop();
  }

  window.OrbitaFeatures = {
    init: init,
    postRender: postRender,
    renderModal: renderModal,
    pushUndo: pushUndo,
    registrarCompletado: registrarCompletado,
    feedbackExito: feedbackExito,
    getRacha: getRacha,
  };
})();
