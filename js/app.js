/**
 * ÓRBITA — Centro de Misiones (Lista de Tareas)
 * Proyecto: Aplicaciones y Programación Web — Fase 2
 * Funcionalidades: validación, show/hide, eventos, localStorage
 */

(function () {
  "use strict";

  const STORAGE_KEY = "orbita_misiones";
  const TEMA_KEY = "orbita_tema";
  const LOGROS_KEY = "orbita_logros";

  const LOGROS_DEF = [
    { id: "primera", titulo: "🛸 Primera misión", desc: "Lanzar tu primera misión" },
    { id: "cinco", titulo: "⭐ 5 completadas", desc: "Completar 5 misiones" },
    { id: "urgente", titulo: "🔴 Crítico", desc: "Crear una misión prioridad alta" },
    { id: "todas-cat", titulo: "🌌 Explorador", desc: "Usar las 4 categorías" },
    { id: "diez", titulo: "🏆 Comandante", desc: "Completar 10 misiones" },
    { id: "racha3", titulo: "🔥 Racha 3 días", desc: "Completar misiones 3 días seguidos" },
    { id: "subtareas", titulo: "📋 Planificador", desc: "Usar sub-tareas" },
    { id: "pomodoro", titulo: "⏱ Enfoque", desc: "Usar el Pomodoro" },
  ];

  /** @type {Array<Mision>} */
  let misiones = [];

  /**
   * @typedef {Object} Mision
   * @property {string} id
   * @property {string} titulo
   * @property {string} descripcion
   * @property {'baja'|'media'|'alta'} prioridad
   * @property {string} fecha
   * @property {string} categoria
   * @property {boolean} completada
   * @property {number} creadaEn
   */

  // --- Referencias DOM ---
  const form = document.getElementById("form-mision");
  const listaActivas = document.getElementById("lista-activas");
  const listaCompletadas = document.getElementById("lista-completadas");
  const panelVacio = document.getElementById("panel-vacio");
  const archivoVacio = document.getElementById("archivo-vacio");
  const contenidoArchivo = document.getElementById("contenido-archivo");
  const btnToggleArchivo = document.getElementById("btn-toggle-archivo");
  const filtroCategoria = document.getElementById("filtro-categoria");
  const btnToggleEstilos = document.getElementById("btn-toggle-estilos");
  const btnTema = document.getElementById("btn-tema");
  const mensajeBienvenida = document.getElementById("mensaje-bienvenida");
  const creditosSistema = document.getElementById("creditos-sistema");
  const toastFormulario = document.getElementById("toast-formulario");
  const buscarMision = document.getElementById("buscar-mision");
  const ordenMisiones = document.getElementById("orden-misiones");
  const modalMision = document.getElementById("modal-mision");
  const modalCuerpo = document.getElementById("modal-cuerpo");
  const toastGlobal = document.getElementById("toast-global");
  const logrosPanel = document.getElementById("logros-panel");

  let resaltarUrgentes = false;
  let archivoVisible = false;
  let modalMisionId = null;
  let logrosDesbloqueados = [];
  let tickCountdownId = null;
  let filtroSoloHoy = false;
  let enviandoFormulario = false;

  // =============================================
  // FUNCIONES PERSONALIZADAS (requisito del curso)
  // =============================================

  /**
   * Genera un identificador único para cada misión.
   * @returns {string}
   */
  function generarId() {
    return "mis-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  /**
   * Formatea fecha ISO (yyyy-mm-dd) a texto legible en español.
   * @param {string} fechaISO
   * @returns {string}
   */
  function formatearFecha(fechaISO) {
    if (!fechaISO) return "Sin fecha";
    const partes = fechaISO.split("-");
    const meses = [
      "ene", "feb", "mar", "abr", "may", "jun",
      "jul", "ago", "sep", "oct", "nov", "dic",
    ];
    const dia = parseInt(partes[2], 10);
    const mes = meses[parseInt(partes[1], 10) - 1];
    const anio = partes[0];
    return `${dia} ${mes} ${anio}`;
  }

  /**
   * Comprueba si la fecha límite ya pasó (misión vencida).
   * @param {string} fechaISO
   * @returns {boolean}
   */
  function estaVencida(fechaISO) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(fechaISO + "T00:00:00");
    return limite < hoy;
  }

  /**
   * Capitaliza la primera letra de un texto.
   * @param {string} texto
   * @returns {string}
   */
  function capitalizar(texto) {
    if (!texto) return "";
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  /**
   * Muestra u oculta un elemento por id aplicando clases CSS.
   * @param {HTMLElement} elemento
   * @param {boolean} mostrar
   */
  function alternarVisibilidad(elemento, mostrar) {
    if (!elemento) return;
    if (mostrar) {
      elemento.classList.remove("oculto");
      elemento.classList.add("visible");
      elemento.setAttribute("aria-hidden", "false");
    } else {
      elemento.classList.add("oculto");
      elemento.classList.remove("visible");
      elemento.setAttribute("aria-hidden", "true");
    }
  }

  /**
   * Muestra mensaje toast temporal.
   * @param {HTMLElement} contenedor
   * @param {string} texto
   * @param {'exito'|'error'} tipo
   * @param {number} duracionMs
   */
  function mostrarToast(contenedor, texto, tipo, duracionMs) {
    contenedor.textContent = texto;
    contenedor.className = "toast " + tipo;
    contenedor.classList.remove("oculto");
    setTimeout(function () {
      contenedor.classList.add("oculto");
    }, duracionMs || 3500);
  }

  function mostrarToastGlobal(texto) {
    if (!toastGlobal) return;
    toastGlobal.textContent = texto;
    toastGlobal.classList.remove("oculto");
    clearTimeout(mostrarToastGlobal._t);
    mostrarToastGlobal._t = setTimeout(function () {
      toastGlobal.classList.add("oculto");
    }, 4000);
  }

  function calcularTiempoRestante(fechaISO) {
    const ahora = new Date();
    ahora.setHours(0, 0, 0, 0);
    const limite = new Date(fechaISO + "T23:59:59");
    const diff = limite - ahora;
    if (diff < 0) return { texto: "Vencida", pct: 0, clase: "crit" };
    const dias = Math.ceil(diff / 86400000);
    const pct = Math.min(100, (dias / 14) * 100);
    if (dias === 0) return { texto: "¡Hoy vence!", pct: 5, clase: "crit" };
    if (dias === 1) return { texto: "1 día restante", pct: 15, clase: "warn" };
    return { texto: dias + " días restantes", pct: pct, clase: dias <= 3 ? "warn" : "ok" };
  }

  // =============================================
  // ALMACENAMIENTO LOCAL
  // =============================================

  function normalizarMision(m, index) {
    return {
      id: m.id || generarId(),
      titulo: m.titulo || "",
      descripcion: m.descripcion || "",
      prioridad: m.prioridad || "media",
      fecha: m.fecha || new Date().toISOString().split("T")[0],
      categoria: m.categoria || "personal",
      completada: !!m.completada,
      creadaEn: m.creadaEn || Date.now() - index,
      orden: typeof m.orden === "number" ? m.orden : index,
      etiquetas: Array.isArray(m.etiquetas) ? m.etiquetas : [],
      subtareas: Array.isArray(m.subtareas)
        ? m.subtareas.map(function (s, i) {
            return {
              id: s.id || "sub-" + i,
              texto: s.texto || s,
              hecha: !!s.hecha,
            };
          })
        : [],
    };
  }

  function cargarMisiones() {
    try {
      const datos = localStorage.getItem(STORAGE_KEY);
      misiones = datos ? JSON.parse(datos) : [];
      if (!Array.isArray(misiones)) misiones = [];
      misiones = misiones.map(function (m, i) {
        return normalizarMision(m, i);
      });
    } catch (e) {
      misiones = [];
    }
  }

  function guardarMisiones() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(misiones));
      actualizarEstadoStorage();
      return true;
    } catch (err) {
      console.error("ÓRBITA: error al guardar en localStorage", err);
      actualizarEstadoStorage(true);
      mostrarToastGlobal("⚠ No se pudo guardar en localStorage. Revisa permisos del navegador.");
      return false;
    }
  }

  function actualizarEstadoStorage(error) {
    var el = document.getElementById("storage-status");
    if (!el) return;
    if (error) {
      el.textContent = "Error al guardar datos";
      el.classList.add("storage-error");
      return;
    }
    try {
      var n = misiones.length;
      el.textContent = n === 1 ? "1 misión guardada" : n + " misiones guardadas";
      el.title = "Datos en localStorage (clave: " + STORAGE_KEY + "). Recarga la página para comprobar la persistencia.";
      el.classList.remove("storage-error");
    } catch (err) {
      el.textContent = "Error al guardar";
      el.classList.add("storage-error");
    }
  }

  function cargarTema() {
    const tema = localStorage.getItem(TEMA_KEY) || "noche";
    document.documentElement.setAttribute("data-tema", tema);
    actualizarBotonTema(tema);
  }

  function alternarTema() {
    const actual = document.documentElement.getAttribute("data-tema") || "noche";
    const nuevo = actual === "noche" ? "dia" : "noche";
    document.documentElement.setAttribute("data-tema", nuevo);
    localStorage.setItem(TEMA_KEY, nuevo);
    actualizarBotonTema(nuevo);
  }

  function actualizarBotonTema(tema) {
    if (!btnTema) return;
    const icono = btnTema.querySelector(".btn-tema-icon");
    const texto = btnTema.querySelector(".btn-tema-texto");
    if (!icono || !texto) return;
    if (tema === "dia") {
      icono.textContent = "☀";
      texto.textContent = "Modo noche";
    } else {
      icono.textContent = "◐";
      texto.textContent = "Modo día";
    }
  }

  // =============================================
  // VALIDACIÓN DE FORMULARIO
  // =============================================

  function validarCampoTitulo(valor) {
    const limpio = valor.trim();
    if (limpio.length === 0) return "El nombre de la misión es obligatorio.";
    if (limpio.length < 3) return "Debe tener al menos 3 caracteres.";
    if (limpio.length > 80) return "Máximo 80 caracteres.";
    return "";
  }

  function validarCampoSelect(valor, nombreCampo) {
    if (!valor || valor === "") {
      return "Selecciona una opción en " + nombreCampo + ".";
    }
    return "";
  }

  function validarCampoFecha(valor) {
    if (!valor) return "La fecha límite es obligatoria.";
    const seleccionada = new Date(valor + "T00:00:00");
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (seleccionada < hoy) {
      return "La fecha no puede ser anterior a hoy.";
    }
    return "";
  }

  function mostrarErrorCampo(idError, idInput, mensaje) {
    const errorEl = document.getElementById(idError);
    const inputEl = document.getElementById(idInput);
    if (errorEl) errorEl.textContent = mensaje;
    if (inputEl) {
      if (mensaje) inputEl.classList.add("invalido");
      else inputEl.classList.remove("invalido");
    }
    return mensaje === "";
  }

  function validarDatosMision(datos) {
    var errores = [];
    if (validarCampoTitulo(datos.titulo)) errores.push(validarCampoTitulo(datos.titulo));
    if (validarCampoSelect(datos.prioridad, "prioridad")) errores.push(validarCampoSelect(datos.prioridad, "prioridad"));
    if (validarCampoFecha(datos.fecha)) errores.push(validarCampoFecha(datos.fecha));
    if (validarCampoSelect(datos.categoria, "categoría")) errores.push(validarCampoSelect(datos.categoria, "categoría"));
    return errores;
  }

  function getPrioridadSeleccionada() {
    var radio = document.querySelector('input[name="prioridad-radio"]:checked');
    if (radio) return radio.value;
    var sel = document.getElementById("prioridad-mision");
    return sel ? sel.value : "";
  }

  function sincronizarPrioridad(valor) {
    var sel = document.getElementById("prioridad-mision");
    if (sel) sel.value = valor || "";
    document.querySelectorAll('input[name="prioridad-radio"]').forEach(function (r) {
      r.checked = r.value === valor;
    });
    document.querySelectorAll(".chip-prioridad").forEach(function (c) {
      c.classList.toggle("activo", c.getAttribute("for")
        ? document.getElementById(c.getAttribute("for")) && document.getElementById(c.getAttribute("for")).checked
        : c.dataset.prioridad === valor);
    });
  }

  function limpiarErroresFormulario() {
    ["error-titulo", "error-prioridad", "error-fecha", "error-categoria"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = "";
    });
    ["titulo-mision", "prioridad-mision", "fecha-mision", "categoria-mision"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove("invalido");
    });
    document.querySelectorAll(".prioridad-chips").forEach(function (g) {
      g.classList.remove("invalido");
    });
  }

  function validarFormularioCompleto() {
    const titulo = document.getElementById("titulo-mision").value;
    const prioridad = getPrioridadSeleccionada();
    const fecha = document.getElementById("fecha-mision").value;
    const categoria = document.getElementById("categoria-mision").value;

    sincronizarPrioridad(prioridad);

    const okTitulo = mostrarErrorCampo("error-titulo", "titulo-mision", validarCampoTitulo(titulo));
    var okPrioridad = mostrarErrorCampo("error-prioridad", "prioridad-mision", validarCampoSelect(prioridad, "prioridad"));
    if (!okPrioridad) {
      var chips = document.querySelector(".prioridad-chips");
      if (chips) chips.classList.add("invalido");
    } else {
      var chipsOk = document.querySelector(".prioridad-chips");
      if (chipsOk) chipsOk.classList.remove("invalido");
    }
    const okFecha = mostrarErrorCampo("error-fecha", "fecha-mision", validarCampoFecha(fecha));
    const okCategoria = mostrarErrorCampo("error-categoria", "categoria-mision", validarCampoSelect(categoria, "categoría"));

    return okTitulo && okPrioridad && okFecha && okCategoria;
  }

  function obtenerDatosFormulario() {
    return {
      titulo: document.getElementById("titulo-mision").value,
      descripcion: document.getElementById("descripcion-mision").value,
      prioridad: getPrioridadSeleccionada(),
      fecha: document.getElementById("fecha-mision").value,
      categoria: document.getElementById("categoria-mision").value,
      etiquetas: parsearEtiquetas(document.getElementById("etiquetas-mision") && document.getElementById("etiquetas-mision").value),
      subtareas: parsearSubtareas(document.getElementById("subtareas-mision") && document.getElementById("subtareas-mision").value),
    };
  }

  function resetearFormularioMision() {
    if (!form) return;
    form.reset();
    sincronizarPrioridad("");
    limpiarErroresFormulario();
    document.getElementById("fecha-mision").setAttribute("min", getFechaHoyLocal());
  }

  function enviarFormularioMision() {
    if (!form || enviandoFormulario) return;
    if (!validarFormularioCompleto()) {
      mostrarToast(toastFormulario, "Corrige los errores del manifiesto antes de lanzar.", "error");
      return;
    }

    enviandoFormulario = true;
    var datos = obtenerDatosFormulario();
    var panel = document.getElementById("panel-misiones");

    agregarMision(datos);

    var finalizar = function () {
      resetearFormularioMision();
      mostrarToast(toastFormulario, "🚀 Misión lanzada a órbita correctamente.", "exito");
      verificarLogros();
      enviandoFormulario = false;
      if (panel) panel.scrollIntoView({ behavior: "smooth" });
    };

    if (window.OrbitaFX && window.OrbitaFX.lanzarCohete) {
      window.OrbitaFX.lanzarCohete(form.querySelector(".btn-lanzar"), panel, finalizar);
    } else {
      finalizar();
    }
  }

  // =============================================
  // RENDERIZADO
  // =============================================

  function crearTarjetaMision(mision, esArchivo, indice) {
    const li = document.createElement("li");
    li.className = "tarjeta-mision prioridad-" + mision.prioridad;
    li.dataset.id = mision.id;
    li.style.animationDelay = (indice || 0) * 0.06 + "s";

    if (resaltarUrgentes && !mision.completada && mision.prioridad === "alta") {
      li.classList.add("resaltada-urgente");
    }
    if (!mision.completada && estaVencida(mision.fecha)) {
      li.classList.add("resaltada-urgente");
    }

    const vencidaTxt = estaVencida(mision.fecha) && !mision.completada
      ? '<span class="meta-vencida">⚠ Vencida</span>'
      : "";

    var countdownHtml = "";
    if (!esArchivo && !mision.completada) {
      var cr = calcularTiempoRestante(mision.fecha);
      countdownHtml =
        '<div class="countdown-texto">' + cr.texto + "</div>" +
        '<div class="barra-countdown"><div class="barra-countdown-fill ' + cr.clase +
        '" style="width:' + cr.pct + '%" data-fecha="' + mision.fecha + '"></div></div>';
    }

    var tagsHtml = "";
    if (mision.etiquetas && mision.etiquetas.length) {
      tagsHtml = '<div class="etiquetas-row">' +
        mision.etiquetas.map(function (t) {
          return '<span class="etiqueta-tag">' + escaparHTML(t) + "</span>";
        }).join("") + "</div>";
    }
    var subHtml = "";
    if (mision.subtareas && mision.subtareas.length && !esArchivo) {
      var hechas = mision.subtareas.filter(function (s) { return s.hecha; }).length;
      subHtml = '<p class="subtareas-mini">☑ ' + hechas + "/" + mision.subtareas.length + " sub-tareas</p>";
    }
    var dragHtml = esArchivo ? "" : '<span class="drag-handle" draggable="true" data-drag="1" title="Arrastrar">⋮⋮</span>';

    li.innerHTML =
      dragHtml +
      '<div class="orbe-prioridad ' + mision.prioridad + '" aria-hidden="true"></div>' +
      '<div class="mision-info">' +
        "<h3>" + escaparHTML(mision.titulo) + "</h3>" +
        '<div class="mision-meta">' +
          "<span>" + capitalizar(mision.categoria) + "</span>" +
          "<span>" + formatearFecha(mision.fecha) + "</span>" +
          "<span>Prioridad " + mision.prioridad + "</span>" +
          vencidaTxt +
        "</div>" +
        (mision.descripcion
          ? '<p class="mision-desc">' + escaparHTML(mision.descripcion) + "</p>"
          : "") +
        countdownHtml + tagsHtml + subHtml +
      "</div>" +
      '<div class="mision-acciones">' +
        (esArchivo
          ? '<button type="button" class="btn-icono eliminar" data-accion="borrar-archivo" aria-label="Eliminar del archivo">✕</button>'
          : '<button type="button" class="btn-icono completar" data-accion="completar" aria-label="Completar misión">✓</button>' +
            '<button type="button" class="btn-icono eliminar" data-accion="eliminar" aria-label="Eliminar misión">✕</button>') +
      "</div>";

    return li;
  }

  function escaparHTML(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
  }

  function getFechaHoyLocal() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function esFechaHoy(fechaISO) {
    return fechaISO === getFechaHoyLocal();
  }

  function obtenerMisionesActivas(filtro, busqueda) {
    var lista = misiones.filter(function (m) {
      if (m.completada) return false;
      if (filtro && filtro !== "todas" && m.categoria !== filtro) return false;
      if (filtroSoloHoy && !esFechaHoy(m.fecha)) return false;
      if (busqueda) {
        var q = busqueda.toLowerCase().trim();
        var tags = (m.etiquetas || []).join(" ");
        var texto = (m.titulo + " " + m.descripcion + " " + m.categoria + " " + tags).toLowerCase();
        if (texto.indexOf(q) === -1) return false;
      }
      return true;
    });
    return ordenarMisiones(lista);
  }

  function ordenarMisiones(lista) {
    var orden = ordenMisiones ? ordenMisiones.value : "reciente";
    var copia = lista.slice();
    var prioVal = { alta: 3, media: 2, baja: 1 };
    copia.sort(function (a, b) {
      if (orden === "manual") return (a.orden || 0) - (b.orden || 0);
      if (orden === "reciente") return b.creadaEn - a.creadaEn;
      if (orden === "fecha-asc") return a.fecha.localeCompare(b.fecha);
      if (orden === "fecha-desc") return b.fecha.localeCompare(a.fecha);
      if (orden === "prioridad") return (prioVal[b.prioridad] || 0) - (prioVal[a.prioridad] || 0);
      if (orden === "nombre") return a.titulo.localeCompare(b.titulo);
      return 0;
    });
    return copia;
  }

  function renderizarListas() {
    if (!listaActivas || !listaCompletadas || !filtroCategoria || !panelVacio) return;

    const filtro = filtroCategoria.value;
    const busqueda = buscarMision ? buscarMision.value : "";
    const activas = obtenerMisionesActivas(filtro, busqueda);
    const todasActivas = misiones.filter(function (m) { return !m.completada; });
    const completadas = ordenarMisiones(misiones.filter(function (m) {
      return m.completada;
    }));

    listaActivas.innerHTML = "";
    listaCompletadas.innerHTML = "";

    activas.forEach(function (m, i) {
      listaActivas.appendChild(crearTarjetaMision(m, false, i));
    });

    completadas.forEach(function (m, i) {
      listaCompletadas.appendChild(crearTarjetaMision(m, true, i));
    });

    panelVacio.classList.toggle("oculto", activas.length > 0);
    archivoVacio.classList.toggle("oculto", completadas.length > 0);

    if (window.OrbitaFX) {
      window.OrbitaFX.setOrbitantes(todasActivas);
    }

    actualizarEstadisticas();
    iniciarTickCountdown();
    if (window.OrbitaFeatures && window.OrbitaFeatures.postRender) {
      window.OrbitaFeatures.postRender();
    }
  }

  function actualizarEstadisticas() {
    const total = misiones.length;
    const activas = misiones.filter(function (m) {
      return !m.completada;
    }).length;
    const completadas = total - activas;
    const pct = total > 0 ? (completadas / total) * 100 : 0;

    var fx = window.OrbitaFX;
    if (fx && fx.animarContador) {
      fx.animarContador(document.getElementById("stat-total"), total);
      fx.animarContador(document.getElementById("stat-activas"), activas);
      fx.animarContador(document.getElementById("stat-completadas"), completadas);
      fx.actualizarProgreso(pct);
    } else {
      document.getElementById("stat-total").textContent = String(total);
      document.getElementById("stat-activas").textContent = String(activas);
      document.getElementById("stat-completadas").textContent = String(completadas);
    }
  }

  function iniciarTickCountdown() {
    if (tickCountdownId) clearInterval(tickCountdownId);
    tickCountdownId = setInterval(function () {
      document.querySelectorAll(".barra-countdown-fill[data-fecha]").forEach(function (bar) {
        var cr = calcularTiempoRestante(bar.getAttribute("data-fecha"));
        bar.style.width = cr.pct + "%";
        bar.className = "barra-countdown-fill " + cr.clase;
        var txt = bar.parentElement && bar.parentElement.previousElementSibling;
        if (txt && txt.classList.contains("countdown-texto")) txt.textContent = cr.texto;
      });
    }, 30000);
  }

  // =============================================
  // ACCIONES CRUD
  // =============================================

  function agregarMision(datos) {
    const nueva = normalizarMision({
      id: generarId(),
      titulo: datos.titulo.trim(),
      descripcion: datos.descripcion.trim(),
      prioridad: datos.prioridad,
      fecha: datos.fecha,
      categoria: datos.categoria,
      completada: false,
      creadaEn: Date.now(),
      orden: 0,
      etiquetas: datos.etiquetas || [],
      subtareas: datos.subtareas || [],
    }, 0);
    misiones.forEach(function (m) { m.orden = (m.orden || 0) + 1; });
    misiones.unshift(nueva);
    guardarMisiones();
    renderizarListas();
    if (window.OrbitaFeatures && window.OrbitaFeatures.feedbackExito) {
      window.OrbitaFeatures.feedbackExito();
    }
  }

  function actualizarMision(id, datos) {
    var m = misiones.find(function (x) { return x.id === id; });
    if (!m) return false;
    var errores = validarDatosMision(datos);
    if (errores.length) return false;
    m.titulo = datos.titulo.trim();
    m.descripcion = datos.descripcion.trim();
    m.prioridad = datos.prioridad;
    m.fecha = datos.fecha;
    m.categoria = datos.categoria;
    m.etiquetas = datos.etiquetas || [];
    m.subtareas = datos.subtareas || [];
    guardarMisiones();
    renderizarListas();
    return true;
  }

  function completarMision(id, elemento) {
    const m = misiones.find(function (x) {
      return x.id === id;
    });
    if (!m) return;

    function finalizar() {
      m.completada = true;
      guardarMisiones();
      renderizarListas();
      verificarLogros();
      if (window.OrbitaFeatures) {
        window.OrbitaFeatures.registrarCompletado();
        window.OrbitaFeatures.feedbackExito();
      }
      mostrarToast(toastFormulario, "¡Misión aterrizada con éxito! Archivo estelar actualizado.", "exito");
      mostrarToastGlobal("🏆 Misión completada — " + m.titulo);
      cerrarModal();
    }

    if (elemento) {
      elemento.classList.add("completando");
      if (window.OrbitaFX && window.OrbitaFX.explosion) {
        var r = elemento.getBoundingClientRect();
        window.OrbitaFX.explosion(r.left + r.width / 2, r.top + r.height / 2, 50);
      }
      setTimeout(finalizar, 550);
    } else {
      finalizar();
    }
  }

  function eliminarMision(id, sinUndo) {
    var m = misiones.find(function (x) { return x.id === id; });
    if (m && !sinUndo && window.OrbitaFeatures) {
      window.OrbitaFeatures.pushUndo(JSON.parse(JSON.stringify(m)));
    }
    misiones = misiones.filter(function (m) {
      return m.id !== id;
    });
    guardarMisiones();
    renderizarListas();
  }

  function cargarLogros() {
    try {
      logrosDesbloqueados = JSON.parse(localStorage.getItem(LOGROS_KEY) || "[]");
    } catch (e) {
      logrosDesbloqueados = [];
    }
    renderizarLogros();
  }

  function guardarLogros() {
    localStorage.setItem(LOGROS_KEY, JSON.stringify(logrosDesbloqueados));
  }

  function desbloquearLogro(id) {
    if (logrosDesbloqueados.indexOf(id) !== -1) return;
    logrosDesbloqueados.push(id);
    guardarLogros();
    var def = LOGROS_DEF.find(function (l) { return l.id === id; });
    if (def) mostrarToastGlobal("🎖 Logro: " + def.titulo);
    renderizarLogros();
  }

  function verificarLogros() {
    if (misiones.length >= 1) desbloquearLogro("primera");
    var completadas = misiones.filter(function (m) { return m.completada; }).length;
    if (completadas >= 5) desbloquearLogro("cinco");
    if (completadas >= 10) desbloquearLogro("diez");
    if (misiones.some(function (m) { return m.prioridad === "alta"; })) desbloquearLogro("urgente");
    var cats = {};
    misiones.forEach(function (m) { cats[m.categoria] = true; });
    if (Object.keys(cats).length >= 4) desbloquearLogro("todas-cat");
    if (window.OrbitaFeatures && typeof window.OrbitaFeatures.getRacha === "function") {
      if (window.OrbitaFeatures.getRacha() >= 3) desbloquearLogro("racha3");
    }
    if (misiones.some(function (m) { return m.subtareas && m.subtareas.length; })) desbloquearLogro("subtareas");
    if (localStorage.getItem("orbita_pomo_usado") === "1") desbloquearLogro("pomodoro");
  }

  function renderizarLogros() {
    if (!logrosPanel) return;
    logrosPanel.innerHTML = "";
    LOGROS_DEF.forEach(function (l) {
      var span = document.createElement("span");
      span.className = "logro-badge" + (logrosDesbloqueados.indexOf(l.id) !== -1 ? " desbloqueado" : "");
      span.title = l.desc;
      span.textContent = l.titulo;
      logrosPanel.appendChild(span);
    });
  }

  function parsearEtiquetas(texto) {
    if (!texto) return [];
    return texto.split(",").map(function (t) {
      var x = t.trim();
      if (x && x.indexOf("#") !== 0) x = "#" + x;
      return x;
    }).filter(Boolean);
  }

  function parsearSubtareas(texto) {
    if (!texto) return [];
    return texto.split("\n").map(function (line) {
      return line.trim();
    }).filter(Boolean).map(function (line, i) {
      return { id: "sub-" + Date.now() + "-" + i, texto: line, hecha: false };
    });
  }

  function abrirModal(mision) {
    if (!modalMision || !modalCuerpo) return;
    modalMisionId = mision.id;
    document.getElementById("modal-titulo").textContent = mision.titulo;
    if (window.OrbitaFeatures && window.OrbitaFeatures.renderModal) {
      window.OrbitaFeatures.renderModal(mision);
    } else {
      var cr = calcularTiempoRestante(mision.fecha);
      modalCuerpo.innerHTML =
        '<div class="modal-detalle">' +
        "<p><strong>Descripción:</strong> " + (escaparHTML(mision.descripcion) || "—") + "</p>" +
        "<p><strong>Categoría:</strong> " + capitalizar(mision.categoria) + "</p>" +
        "<p><strong>Prioridad:</strong> " + mision.prioridad + "</p>" +
        "<p><strong>Fecha límite:</strong> " + formatearFecha(mision.fecha) + "</p>" +
        "<p><strong>Tiempo:</strong> " + cr.texto + "</p>" +
        "</div>";
    }
    modalMision.classList.remove("oculto");
    document.body.style.overflow = "hidden";
  }

  function cerrarModal() {
    if (!modalMision) return;
    modalMision.classList.add("oculto");
    modalMisionId = null;
    document.body.style.overflow = "";
  }

  function vaciarArchivo() {
    misiones = misiones.filter(function (m) {
      return !m.completada;
    });
    guardarMisiones();
    renderizarListas();
    mostrarToast(toastFormulario, "Archivo estelar vaciado.", "exito");
  }

  // =============================================
  // EVENTOS
  // =============================================

  function inicializarNavegacion() {
    const enlaces = document.querySelectorAll(".nav-link");
    const btnMenu = document.getElementById("btn-menu-movil");
    const nav = document.querySelector(".nav-principal");
    const secciones = document.querySelectorAll(".seccion");
    const iconoMenu = btnMenu && btnMenu.querySelector(".btn-menu-icon");
    const textoMenu = btnMenu && btnMenu.querySelector(".btn-menu-texto");

    function setEnlaceActivo(id) {
      enlaces.forEach(function (link) {
        var activo = link.getAttribute("href") === "#" + id;
        link.classList.toggle("activo", activo);
        if (activo) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }

    function cerrarMenuMovil() {
      if (!nav || !btnMenu) return;
      nav.classList.remove("nav-abierta");
      btnMenu.setAttribute("aria-expanded", "false");
      if (iconoMenu) iconoMenu.textContent = "☰";
      if (textoMenu) textoMenu.textContent = "Menú de secciones";
    }

    function abrirMenuMovil() {
      if (!nav || !btnMenu) return;
      nav.classList.add("nav-abierta");
      btnMenu.setAttribute("aria-expanded", "true");
      if (iconoMenu) iconoMenu.textContent = "✕";
      if (textoMenu) textoMenu.textContent = "Cerrar menú";
    }

    enlaces.forEach(function (link) {
      link.addEventListener("click", function () {
        setEnlaceActivo(link.getAttribute("href").slice(1));
        if (window.innerWidth <= 768) {
          cerrarMenuMovil();
        }
      });
    });

    if (btnMenu && nav) {
      btnMenu.addEventListener("click", function () {
        if (nav.classList.contains("nav-abierta")) {
          cerrarMenuMovil();
        } else {
          abrirMenuMovil();
        }
      });
    }

    document.addEventListener("click", function (e) {
      if (!nav || !nav.classList.contains("nav-abierta")) return;
      if (nav.contains(e.target) || (btnMenu && btnMenu.contains(e.target))) return;
      cerrarMenuMovil();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var focus = document.getElementById("focus-overlay");
      if (focus && !focus.classList.contains("oculto")) {
        if (window.OrbitaFeatures && window.OrbitaFeatures.cerrarFocus) {
          window.OrbitaFeatures.cerrarFocus();
        } else {
          focus.classList.add("oculto");
          document.body.style.overflow = "";
        }
        return;
      }
      if (modalMision && !modalMision.classList.contains("oculto")) {
        cerrarModal();
        return;
      }
      cerrarMenuMovil();
    });

    if (secciones.length) {
      function actualizarSeccionActiva() {
        var offset = getNavOffset() + 16;
        var actual = secciones[0].id;
        secciones.forEach(function (sec) {
          if (sec.getBoundingClientRect().top <= offset) {
            actual = sec.id;
          }
        });
        setEnlaceActivo(actual);
      }

      window.addEventListener("scroll", actualizarSeccionActiva, { passive: true });
      window.addEventListener("resize", actualizarSeccionActiva);
      actualizarSeccionActiva();
    }
  }

  function getNavOffset() {
    var val = getComputedStyle(document.documentElement).getPropertyValue("--nav-offset");
    var num = parseFloat(val);
    if (val.indexOf("rem") !== -1 && !isNaN(num)) {
      return num * parseFloat(getComputedStyle(document.documentElement).fontSize);
    }
    return 120;
  }

  function inicializarVolverArriba() {
    var btn = document.getElementById("btn-volver-arriba");
    if (!btn) return;

    window.addEventListener("scroll", function () {
      if (window.scrollY > 400) {
        btn.classList.remove("oculto");
      } else {
        btn.classList.add("oculto");
      }
    }, { passive: true });

    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function inicializarFormulario() {
    if (!form) {
      console.error("ÓRBITA: no se encontró #form-mision");
      return;
    }

    var fechaInput = document.getElementById("fecha-mision");
    if (fechaInput) {
      fechaInput.setAttribute("min", getFechaHoyLocal());
      if (!fechaInput.value) fechaInput.value = getFechaHoyLocal();
    }

    ["titulo-mision", "fecha-mision", "categoria-mision"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("blur", validarFormularioCompleto);
      el.addEventListener("input", function () {
        if (el.classList.contains("invalido")) validarFormularioCompleto();
      });
      el.addEventListener("change", function () {
        if (el.classList.contains("invalido")) validarFormularioCompleto();
      });
    });

    document.querySelectorAll('input[name="prioridad-radio"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        sincronizarPrioridad(radio.value);
        validarFormularioCompleto();
      });
    });

    document.querySelectorAll(".chip-prioridad").forEach(function (label) {
      label.addEventListener("click", function () {
        setTimeout(validarFormularioCompleto, 0);
      });
    });

    var selPrioridad = document.getElementById("prioridad-mision");
    if (selPrioridad) {
      selPrioridad.addEventListener("change", function () {
        sincronizarPrioridad(selPrioridad.value);
        validarFormularioCompleto();
      });
    }

    form.addEventListener("reset", function () {
      setTimeout(function () {
        sincronizarPrioridad("");
        limpiarErroresFormulario();
        if (fechaInput) fechaInput.setAttribute("min", getFechaHoyLocal());
      }, 0);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      enviarFormularioMision();
    });
  }

  function inicializarPanel() {
    if (!listaActivas || !listaCompletadas || !filtroCategoria) return;

    listaActivas.addEventListener("click", manejarAccionLista);
    listaCompletadas.addEventListener("click", manejarAccionLista);

    filtroCategoria.addEventListener("change", renderizarListas);
    if (buscarMision) {
      buscarMision.addEventListener("input", renderizarListas);
    }
    if (ordenMisiones) {
      ordenMisiones.addEventListener("change", renderizarListas);
    }

    btnToggleEstilos.addEventListener("click", function () {
      resaltarUrgentes = !resaltarUrgentes;
      btnToggleEstilos.textContent = resaltarUrgentes ? "Quitar resaltado" : "Resaltar urgentes";
      btnToggleEstilos.style.borderColor = resaltarUrgentes ? "var(--prioridad-alta)" : "";
      renderizarListas();
    });

    btnToggleArchivo.addEventListener("click", function () {
      archivoVisible = !archivoVisible;
      contenidoArchivo.classList.toggle("oculto", !archivoVisible);
      contenidoArchivo.setAttribute("aria-hidden", String(!archivoVisible));
      btnToggleArchivo.setAttribute("aria-expanded", String(archivoVisible));
      btnToggleArchivo.textContent = archivoVisible ? "Ocultar completadas" : "Mostrar completadas";
    });

    document.getElementById("btn-borrar-archivo").addEventListener("click", function () {
      if (misiones.some(function (m) { return m.completada; })) {
        if (confirm("¿Vaciar todo el archivo estelar? Esta acción no se puede deshacer.")) {
          vaciarArchivo();
        }
      }
    });
  }

  function manejarAccionLista(e) {
    if (e.target.closest(".drag-handle")) return;

    const btn = e.target.closest("[data-accion]");
    const tarjeta = e.target.closest(".tarjeta-mision");

    if (btn && tarjeta) {
      e.stopPropagation();
      const id = tarjeta.dataset.id;
      const accion = btn.dataset.accion;
      if (accion === "completar") completarMision(id, tarjeta);
      if (accion === "eliminar" || accion === "borrar-archivo") {
        if (confirm("¿Eliminar esta misión?")) eliminarMision(id);
      }
      return;
    }

    if (tarjeta && !tarjeta.closest(".lista-archivo")) {
      const m = misiones.find(function (x) { return x.id === tarjeta.dataset.id; });
      if (m) abrirModal(m);
    }
  }

  function inicializarModal() {
    if (!modalMision) return;
    document.getElementById("modal-cerrar").addEventListener("click", cerrarModal);
    modalMision.addEventListener("click", function (e) {
      if (e.target === modalMision) cerrarModal();
    });
    document.getElementById("modal-completar").addEventListener("click", function () {
      if (modalMisionId) {
        var card = document.querySelector('.tarjeta-mision[data-id="' + modalMisionId + '"]');
        completarMision(modalMisionId, card);
      }
    });
    document.getElementById("modal-eliminar").addEventListener("click", function () {
      if (modalMisionId && confirm("¿Eliminar esta misión?")) {
        eliminarMision(modalMisionId);
        cerrarModal();
      }
    });
  }

  function bindClick(id, handler) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("click", handler);
  }

  function inicializarInteractivos() {
    bindClick("btn-mostrar-bienvenida", function () {
      const hora = new Date().getHours();
      let saludo = "Buenas noches, comandante.";
      if (hora >= 5 && hora < 12) saludo = "Buenos días, comandante.";
      else if (hora >= 12 && hora < 19) saludo = "Buenas tardes, comandante.";

      const activas = misiones.filter(function (m) { return !m.completada; }).length;
      mensajeBienvenida.textContent =
        saludo + " Tienes " + activas + " misión(es) en órbita. El sistema ÓRBITA está operativo.";
      alternarVisibilidad(mensajeBienvenida, true);

      setTimeout(function () {
        alternarVisibilidad(mensajeBienvenida, false);
      }, 6000);
    });

    bindClick("btn-mostrar-creditos", function () {
      creditosSistema.textContent =
        "Sistema ÓRBITA v1.0 — HTML5 · CSS3 · JavaScript ES6+ · localStorage. Diseño original: tema espacial de misiones.";
      alternarVisibilidad(creditosSistema, true);
      setTimeout(function () {
        alternarVisibilidad(creditosSistema, false);
      }, 5000);
    });

    if (btnTema) btnTema.addEventListener("click", alternarTema);
  }

  // =============================================
  // INICIO
  // =============================================

  function init() {
    try {
      var anio = document.getElementById("anio-footer");
      if (anio) anio.textContent = new Date().getFullYear();

      inicializarFormulario();
      cargarTema();
      cargarMisiones();
      cargarLogros();
      renderizarListas();
      actualizarEstadoStorage();
      verificarLogros();
      inicializarNavegacion();
      inicializarVolverArriba();
      inicializarPanel();
      inicializarModal();
      inicializarInteractivos();

      if (window.OrbitaFeatures) {
        window.OrbitaFeatures.init(window.OrbitaApp);
      }

      document.documentElement.classList.add("orbita-listo");
    } catch (err) {
      console.error("ÓRBITA: error al iniciar la aplicación", err);
      if (toastGlobal) {
        toastGlobal.textContent = "Error al cargar ÓRBITA. Recarga con Ctrl+Shift+R.";
        toastGlobal.classList.remove("oculto");
      }
    }
  }

  window.OrbitaApp = {
    getMisiones: function () { return misiones; },
    setMisiones: function (arr) {
      misiones = arr.map(function (m, i) {
        return normalizarMision(m, i);
      });
      guardarMisiones();
      renderizarListas();
    },
    renderizar: renderizarListas,
    guardar: guardarMisiones,
    generarId: generarId,
    normalizar: normalizarMision,
    agregar: agregarMision,
    actualizar: actualizarMision,
    eliminar: eliminarMision,
    completar: completarMision,
    abrirModal: abrirModal,
    cerrarModal: cerrarModal,
    parsearEtiquetas: parsearEtiquetas,
    parsearSubtareas: parsearSubtareas,
    formatearFecha: formatearFecha,
    calcularTiempoRestante: calcularTiempoRestante,
    capitalizar: capitalizar,
    escaparHTML: escaparHTML,
    mostrarToastGlobal: mostrarToastGlobal,
    verificarLogros: verificarLogros,
    validarDatosMision: validarDatosMision,
    getFechaHoyLocal: getFechaHoyLocal,
    getPrioridadSeleccionada: getPrioridadSeleccionada,
    sincronizarPrioridad: sincronizarPrioridad,
    validarCampoTitulo: validarCampoTitulo,
    validarCampoFecha: validarCampoFecha,
    setFiltroSoloHoy: function (v) { filtroSoloHoy = v; renderizarListas(); },
    getFiltroSoloHoy: function () { return filtroSoloHoy; },
    esFechaHoy: esFechaHoy,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
