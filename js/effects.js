/**
 * ÓRBITA — Efectos visuales e interactividad dinámica
 * Partículas, mapa orbital, parallax, animaciones
 */
(function () {
  "use strict";

  var OrbitaFX = {
    canvas: null,
    ctx: null,
    particulas: [],
    mouseX: 0,
    mouseY: 0,
    animId: null,
    mapaCanvas: null,
    mapaCtx: null,
    mapaAnimId: null,
    orbitantes: [],
  };

  function initParticulas() {
    OrbitaFX.canvas = document.getElementById("fx-canvas");
    if (!OrbitaFX.canvas) return;
    OrbitaFX.ctx = OrbitaFX.canvas.getContext("2d");
    redimensionarCanvas();
    window.addEventListener("resize", redimensionarCanvas);
    document.addEventListener("mousemove", function (e) {
      OrbitaFX.mouseX = e.clientX;
      OrbitaFX.mouseY = e.clientY;
      var sf = document.getElementById("starfield");
      if (sf) {
        var dx = (e.clientX / window.innerWidth - 0.5) * 24;
        var dy = (e.clientY / window.innerHeight - 0.5) * 24;
        sf.style.transform = "translate(" + dx + "px, " + dy + "px)";
      }
    });
    for (var i = 0; i < 80; i++) {
      OrbitaFX.particulas.push(crearParticula(true));
    }
    loopParticulas();
  }

  function redimensionarCanvas() {
    if (!OrbitaFX.canvas) return;
    OrbitaFX.canvas.width = window.innerWidth;
    OrbitaFX.canvas.height = window.innerHeight;
  }

  function crearParticula(fondo) {
    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * (fondo ? 0.3 : 4),
      vy: (Math.random() - 0.5) * (fondo ? 0.3 : 4),
      r: fondo ? Math.random() * 1.5 + 0.5 : Math.random() * 3 + 2,
      vida: fondo ? 9999 : 60 + Math.random() * 40,
      color: fondo ? "rgba(200,230,255,0.6)" : ["#00d4ff", "#ff2d87", "#ffd166", "#06d6a0"][Math.floor(Math.random() * 4)],
      fondo: !!fondo,
    };
  }

  function loopParticulas() {
    if (!OrbitaFX.ctx || !OrbitaFX.canvas) return;
    var ctx = OrbitaFX.ctx;
    var w = OrbitaFX.canvas.width;
    var h = OrbitaFX.canvas.height;
    ctx.clearRect(0, 0, w, h);

    OrbitaFX.particulas.forEach(function (p) {
      if (!p.fondo) {
        p.vida--;
        if (p.vida <= 0) return;
      }
      p.x += p.vx;
      p.y += p.vy;
      if (p.fondo) {
        var dx = (OrbitaFX.mouseX - w / 2) * 0.00008;
        var dy = (OrbitaFX.mouseY - h / 2) * 0.00008;
        p.x += dx;
        p.y += dy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.fondo ? 0.5 : p.vida / 80;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    OrbitaFX.particulas = OrbitaFX.particulas.filter(function (p) {
      return p.fondo || p.vida > 0;
    });

    OrbitaFX.animId = requestAnimationFrame(loopParticulas);
  }

  function explosionParticulas(x, y, cantidad) {
    for (var i = 0; i < (cantidad || 35); i++) {
      var p = crearParticula(false);
      p.x = x;
      p.y = y;
      var ang = Math.random() * Math.PI * 2;
      var vel = 2 + Math.random() * 6;
      p.vx = Math.cos(ang) * vel;
      p.vy = Math.sin(ang) * vel;
      OrbitaFX.particulas.push(p);
    }
  }

  function animarLanzamiento(origen, destino, callback) {
    var cohete = document.getElementById("cohete-lanzamiento");
    if (!cohete || !origen) {
      if (callback) callback();
      return;
    }
    var rect = origen.getBoundingClientRect();
    cohete.classList.remove("oculto");
    cohete.style.left = rect.left + rect.width / 2 + "px";
    cohete.style.top = rect.top + "px";
    cohete.classList.add("volando");

    setTimeout(function () {
      if (destino) {
        var d = destino.getBoundingClientRect();
        cohete.style.left = d.left + d.width / 2 + "px";
        cohete.style.top = d.top + 20 + "px";
      }
    }, 50);

    setTimeout(function () {
      cohete.classList.remove("volando");
      cohete.classList.add("oculto");
      explosionParticulas(
        destino ? destino.getBoundingClientRect().left + 100 : rect.left,
        destino ? destino.getBoundingClientRect().top + 40 : rect.top,
        25
      );
      if (callback) callback();
    }, 900);
  }

  function efectoMaquinaEscribir(elemento, texto, velocidad, callback) {
    if (!elemento) return;
    elemento.textContent = "";
    var i = 0;
    function tick() {
      if (i < texto.length) {
        elemento.textContent += texto.charAt(i);
        i++;
        setTimeout(tick, velocidad || 45);
      } else if (callback) callback();
    }
    tick();
  }

  function animarContador(elemento, valorFinal, duracion) {
    if (!elemento) return;
    var inicio = parseInt(elemento.textContent, 10) || 0;
    if (inicio === valorFinal) return;
    var t0 = performance.now();
    function frame(t) {
      var p = Math.min((t - t0) / (duracion || 600), 1);
      var ease = 1 - Math.pow(1 - p, 3);
      elemento.textContent = String(Math.round(inicio + (valorFinal - inicio) * ease));
      if (p < 1) requestAnimationFrame(frame);
      else elemento.textContent = String(valorFinal);
    }
    requestAnimationFrame(frame);
  }

  function actualizarAnilloProgreso(porcentaje) {
    var ring = document.getElementById("ring-fill");
    var pctEl = document.getElementById("ring-pct");
    if (!ring) return;
    var circ = 2 * Math.PI * 52;
    var offset = circ - (porcentaje / 100) * circ;
    ring.style.strokeDasharray = circ;
    ring.style.strokeDashoffset = offset;
    if (pctEl) pctEl.textContent = Math.round(porcentaje) + "%";
  }

  function initMapaOrbital() {
    OrbitaFX.mapaCanvas = document.getElementById("mapa-orbital");
    if (!OrbitaFX.mapaCanvas) return;
    OrbitaFX.mapaCtx = OrbitaFX.mapaCanvas.getContext("2d");
    loopMapaOrbital();
  }

  function setOrbitantes(misionesActivas) {
    var radios = { alta: 45, media: 72, baja: 98 };
    var colores = { alta: "#ff4757", media: "#ffa502", baja: "#2ed573" };
    OrbitaFX.orbitantes = misionesActivas.map(function (m, i) {
      return {
        id: m.id,
        radio: radios[m.prioridad] || 72,
        angulo: (i / Math.max(misionesActivas.length, 1)) * Math.PI * 2,
        velocidad: 0.008 + (i % 3) * 0.003,
        color: colores[m.prioridad] || "#00d4ff",
        titulo: m.titulo,
      };
    });
    var cont = document.getElementById("mapa-contador");
    if (cont) {
      cont.textContent = misionesActivas.length + " objeto" + (misionesActivas.length !== 1 ? "s" : "") + " en órbita";
    }
  }

  function loopMapaOrbital() {
    var c = OrbitaFX.mapaCanvas;
    var ctx = OrbitaFX.mapaCtx;
    if (!c || !ctx) return;
    var w = c.width;
    var h = c.height;
    var cx = w / 2;
    var cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    [45, 72, 98].forEach(function (r) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0, 212, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12);
    grad.addColorStop(0, "#00d4ff");
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fill();

    OrbitaFX.orbitantes.forEach(function (o) {
      o.angulo += o.velocidad;
      var x = cx + Math.cos(o.angulo) * o.radio;
      var y = cy + Math.sin(o.angulo) * o.radio * 0.85;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = o.color;
      ctx.shadowColor = o.color;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    OrbitaFX.mapaAnimId = requestAnimationFrame(loopMapaOrbital);
  }

  function iniciarReloj() {
    var el = document.getElementById("reloj-mision");
    if (!el) return;
    function tick() {
      var d = new Date();
      el.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()]
        .map(function (n) { return String(n).padStart(2, "0"); })
        .join(":");
    }
    tick();
    setInterval(tick, 1000);
  }

  window.OrbitaFX = {
    init: function () {
      initParticulas();
      initMapaOrbital();
      iniciarReloj();
      efectoMaquinaEscribir(
        document.getElementById("titulo-typed"),
        "Bienvenido al puente de mando",
        40
      );
    },
    explosion: explosionParticulas,
    lanzarCohete: animarLanzamiento,
    animarContador: animarContador,
    actualizarProgreso: actualizarAnilloProgreso,
    setOrbitantes: setOrbitantes,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { window.OrbitaFX.init(); });
  } else {
    window.OrbitaFX.init();
  }
})();
