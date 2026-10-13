/* Physics figures as clouds of points.
   - Home page ([data-hero-figure]): the figures emerge from Gaussian noise and
     dissolve back into it along x_t = cos(πt/2) x0 + sin(πt/2) ε, one after the other.
   - Panels ([data-figure-panel="key"]): one figure each, e.g. on the page that
     explains the home-page figure.
   Each figure has its own dynamics; coordinates are in [-1, 1]², y pointing up.
   Respects prefers-reduced-motion and only animates what is on screen. */
(function () {
  'use strict';

  var hero = document.querySelector('[data-hero-figure]');
  var panels = document.querySelectorAll('[data-figure-panel]');
  if (!hero && !panels.length) return;

  var TAU = 2 * Math.PI;
  function rand() { return Math.random(); }
  function gauss() { return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(TAU * Math.random()); }
  function picker(weights) {
    var cum = [], total = 0;
    weights.forEach(function (w) { total += w; cum.push(total); });
    return function () {
      var r = rand() * total;
      for (var i = 0; i < cum.length; i++) if (r < cum[i]) return i;
      return cum.length - 1;
    };
  }

  /* ---------------------------------------------------------------- figures */

  // Two-armed logarithmic spiral with a bulge, seen at an angle, rotating.
  function galaxy(n) {
    var r = new Float32Array(n), th = new Float32Array(n), t = 0;
    var b = 1 / Math.tan(0.36), r0 = 0.09;
    for (var i = 0; i < n; i++) {
      var u = rand();
      if (u < 0.18) {
        var gx = gauss() * 0.085, gy = gauss() * 0.085;
        r[i] = Math.sqrt(gx * gx + gy * gy); th[i] = Math.atan2(gy, gx);
      } else if (u < 0.3) {
        r[i] = 0.95 * Math.sqrt(rand()); th[i] = TAU * rand();
      } else {
        var rr = r0 + 0.86 * Math.pow(rand(), 0.85);
        r[i] = rr * (1 + 0.04 * gauss());
        th[i] = (u < 0.65 ? 0 : Math.PI) + b * Math.log(rr / r0) + gauss() * (0.16 + 0.1 * rr);
      }
    }
    var inc = 0.62, cr = Math.cos(-0.45), sr = Math.sin(-0.45);
    return {
      update: function (dt) { t += dt; },
      write: function (xs, ys) {
        var w = -0.16 * t;
        for (var i = 0; i < n; i++) {
          var a = th[i] + w, x = r[i] * Math.cos(a), y = r[i] * Math.sin(a) * inc;
          xs[i] = x * cr - y * sr; ys[i] = x * sr + y * cr;
        }
      }
    };
  }

  // Hydrogen 3d_z² orbital in a plane containing the z axis:
  // |ψ|² ∝ r⁴ e^{-2r/3} (3cos²θ − 1)² (a0 = 1); points are redrawn like repeated position measurements.
  function orbital(n) {
    var px = new Float32Array(n), py = new Float32Array(n), pending = 0;
    function density(x, z) {
      var r = Math.sqrt(x * x + z * z) + 1e-9, c = z / r, a = 3 * c * c - 1;
      return r * r * r * r * Math.exp(-2 * r / 3) * a * a;
    }
    function measure(i) {
      var x, z;
      do { x = 40 * rand() - 20; z = 40 * rand() - 20; } while (95 * rand() > density(x, z));
      px[i] = x / 19; py[i] = z / 19;
    }
    for (var i = 0; i < n; i++) measure(i);
    return {
      update: function (dt) {
        pending += n * 0.12 * dt;
        while (pending >= 1) { measure((rand() * n) | 0); pending -= 1; }
      },
      write: function (xs, ys) { xs.set(px); ys.set(py); }
    };
  }

  // Double-slit far field: I(x) ∝ cos²(πx/Δ) sinc²(πx/5Δ); impacts keep arriving.
  function interference(n) {
    var px = new Float32Array(n), py = new Float32Array(n), pending = 0;
    function intensity(x) {
      var f = Math.cos(Math.PI * x / 0.17), z = Math.PI * x / 0.85;
      var e = Math.abs(z) < 1e-6 ? 1 : Math.sin(z) / z;
      return f * f * e * e;
    }
    function impact(i) {
      var x;
      do { x = 2 * rand() - 1; } while (rand() > intensity(x));
      px[i] = x; py[i] = 1.2 * (rand() - 0.5);
    }
    for (var i = 0; i < n; i++) impact(i);
    return {
      update: function (dt) {
        pending += n * 0.12 * dt;
        while (pending >= 1) { impact((rand() * n) | 0); pending -= 1; }
      },
      write: function (xs, ys) { xs.set(px); ys.set(py); }
    };
  }

  // e+e- → γ* → μ+μ-: fermion lines and a photon line, with points flowing in time.
  function feynman(n) {
    var V1 = [-0.34, 0], V2 = [0.34, 0];
    var lines = [[[-0.92, 0.7], V1], [[-0.92, -0.7], V1], [V1, V2], [V2, [0.92, 0.7]], [V2, [0.92, -0.7]]];
    var choose = picker([1, 1, 1.6, 1, 1, 0.12, 0.12]);
    var seg = new Uint8Array(n), s0 = new Float32Array(n), jx = new Float32Array(n), jy = new Float32Array(n), t = 0;
    for (var i = 0; i < n; i++) {
      seg[i] = choose(); s0[i] = rand();
      var vertex = seg[i] >= 5;
      jx[i] = gauss() * (vertex ? 0.014 : 0.006); jy[i] = gauss() * (vertex ? 0.014 : 0.006);
    }
    return {
      update: function (dt) { t += dt; },
      write: function (xs, ys) {
        for (var i = 0; i < n; i++) {
          if (seg[i] >= 5) {
            var v = seg[i] === 5 ? V1 : V2;
            xs[i] = v[0] + jx[i]; ys[i] = v[1] + jy[i];
            continue;
          }
          var L = lines[seg[i]], a = L[0], b = L[1], s = (s0[i] + 0.2 * t) % 1;
          var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy);
          var off = jx[i] + (seg[i] === 2 ? 0.06 * Math.sin(TAU * 6 * s) : 0);
          xs[i] = a[0] + dx * s - dy / len * off;
          ys[i] = a[1] + dy * s + dx / len * off;
        }
      }
    };
  }

  // Field lines r = L sin²θ of a magnetic dipole (north pole up), points flowing N → S.
  function dipole(n) {
    var Ls = [0.2, 0.3, 0.42, 0.58, 0.78, 1.02, 1.32], r0 = 0.06, sc = 0.74;
    var tmin = Ls.map(function (L) { return Math.asin(Math.sqrt(r0 / L)); });
    var choose = picker(Ls);
    var magnet = Math.floor(n * 0.07);
    var line = new Uint8Array(n), side = new Int8Array(n), s0 = new Float32Array(n), mx = new Float32Array(n), my = new Float32Array(n), t = 0;
    for (var i = 0; i < n; i++) {
      if (i < magnet) { mx[i] = (rand() - 0.5) * 0.06; my[i] = (rand() - 0.5) * 0.26; continue; }
      line[i] = choose(); side[i] = rand() < 0.5 ? -1 : 1; s0[i] = rand();
    }
    return {
      update: function (dt) { t += dt; },
      write: function (xs, ys) {
        for (var i = 0; i < n; i++) {
          if (i < magnet) { xs[i] = mx[i]; ys[i] = my[i]; continue; }
          var k = line[i], th = tmin[k] + (Math.PI - 2 * tmin[k]) * ((s0[i] + 0.07 * t) % 1);
          var sn = Math.sin(th), r = Ls[k] * sn * sn;
          xs[i] = side[i] * r * sn * sc; ys[i] = r * Math.cos(th) * sc;
        }
      }
    };
  }

  // Graphene honeycomb lattice with a longitudinal acoustic phonon.
  function graphene(n) {
    var a = 0.112, R = 0.95, s3 = Math.sqrt(3), sx = [], sy = [], index = {}, bonds = [];
    var m, k;
    for (m = -14; m <= 14; m++) {
      for (k = -14; k <= 14; k++) {
        var ax = (k + m / 2) * s3 * a, ay = 1.5 * m * a;
        if (ax * ax + ay * ay < R * R) { index[k + ',' + m + ',A'] = sx.length; sx.push(ax); sy.push(ay); }
        if (ax * ax + (ay + a) * (ay + a) < R * R) { index[k + ',' + m + ',B'] = sx.length; sx.push(ax); sy.push(ay + a); }
      }
    }
    for (m = -14; m <= 14; m++) {
      for (k = -14; k <= 14; k++) {
        var A = index[k + ',' + m + ',A'];
        if (A === undefined) continue;
        [[k, m], [k, m - 1], [k + 1, m - 1]].forEach(function (q) {
          var B = index[q[0] + ',' + q[1] + ',B'];
          if (B !== undefined) bonds.push([A, B]);
        });
      }
    }
    var S = sx.length, ux = new Float32Array(S), uy = new Float32Array(S);
    var kind = new Uint8Array(n), ref = new Uint32Array(n), f = new Float32Array(n), jx = new Float32Array(n), jy = new Float32Array(n), t = 0;
    for (var i = 0; i < n; i++) {
      if (rand() < 0.22) { kind[i] = 0; ref[i] = (rand() * S) | 0; jx[i] = gauss() * 0.007; jy[i] = gauss() * 0.007; }
      else { kind[i] = 1; ref[i] = (rand() * bonds.length) | 0; f[i] = rand(); jx[i] = gauss() * 0.0025; jy[i] = gauss() * 0.0025; }
    }
    var ex = Math.cos(0.5), ey = Math.sin(0.5), q = TAU / 0.8;
    return {
      update: function (dt) { t += dt; },
      write: function (xs, ys) {
        for (var j = 0; j < S; j++) {
          var d = 0.022 * Math.sin(q * (ex * sx[j] + ey * sy[j]) - 2.2 * t);
          ux[j] = sx[j] + d * ex; uy[j] = sy[j] + d * ey;
        }
        for (var i = 0; i < n; i++) {
          if (kind[i] === 0) { xs[i] = ux[ref[i]] + jx[i]; ys[i] = uy[ref[i]] + jy[i]; continue; }
          var bd = bonds[ref[i]], p = bd[0], o = bd[1], u = f[i];
          xs[i] = ux[p] + (ux[o] - ux[p]) * u + jx[i];
          ys[i] = uy[p] + (uy[o] - uy[p]) * u + jy[i];
        }
      }
    };
  }

  // Lorenz attractor (σ = 10, ρ = 28, β = 8/3); points carried along a long trajectory.
  function lorenz(n) {
    var M = 20000, X = new Float32Array(M), Y = new Float32Array(M), Z = new Float32Array(M), h = 0.005;
    var x = 1, y = 1, z = 1;
    function f(x, y, z) { return [10 * (y - x), x * (28 - z) - y, x * y - 8 / 3 * z]; }
    for (var i = -3000; i < M; i++) {
      var k1 = f(x, y, z), k2 = f(x + h / 2 * k1[0], y + h / 2 * k1[1], z + h / 2 * k1[2]);
      var k3 = f(x + h / 2 * k2[0], y + h / 2 * k2[1], z + h / 2 * k2[2]), k4 = f(x + h * k3[0], y + h * k3[1], z + h * k3[2]);
      x += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
      y += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
      z += h / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
      if (i >= 0) { X[i] = x; Y[i] = y; Z[i] = z; }
    }
    var k0 = new Float32Array(n), t = 0;
    for (var j = 0; j < n; j++) k0[j] = rand() * (M - 1);
    return {
      update: function (dt) { t += dt; },
      write: function (xs, ys) {
        var psi = -Math.PI / 4 + 0.3 * Math.sin(0.25 * t), c = Math.cos(psi), s = Math.sin(psi), shift = 110 * t;
        for (var i = 0; i < n; i++) {
          var u = (k0[i] + shift) % (M - 1), j = u | 0, w = u - j;
          var px = X[j] + (X[j + 1] - X[j]) * w, py = Y[j] + (Y[j + 1] - Y[j]) * w, pz = Z[j] + (Z[j + 1] - Z[j]) * w;
          xs[i] = (px * c - py * s) / 29; ys[i] = (pz - 24.5) / 29;
        }
      }
    };
  }

  // Matter collapsing onto the edges and vertices of a random Voronoi tessellation.
  function cosmicWeb(n) {
    var K = 34, cx = [], cy = [], j;
    for (j = 0; j < K; j++) { cx.push(2.7 * rand() - 1.35); cy.push(2.7 * rand() - 1.35); }
    var qx = new Float32Array(n), qy = new Float32Array(n), tx = new Float32Array(n), ty = new Float32Array(n), t = 0;
    for (var i = 0; i < n; i++) {
      var x = 2.1 * rand() - 1.05, y = 2.1 * rand() - 1.05, best = [1e9, 1e9, 1e9], id = [0, 0, 0];
      for (j = 0; j < K; j++) {
        var d = (x - cx[j]) * (x - cx[j]) + (y - cy[j]) * (y - cy[j]);
        if (d < best[0]) { best = [d, best[0], best[1]]; id = [j, id[0], id[1]]; }
        else if (d < best[1]) { best = [best[0], d, best[1]]; id = [id[0], j, id[1]]; }
        else if (d < best[2]) { best[2] = d; id[2] = j; }
      }
      var a = id[0], b = id[1], c = id[2], placed = false;
      if (rand() < 0.35) {                     // node: circumcentre of the three nearest seeds
        var ax = cx[a], ay = cy[a], bx = cx[b], by = cy[b], gx = cx[c], gy = cy[c];
        var D = 2 * (ax * (by - gy) + bx * (gy - ay) + gx * (ay - by));
        if (Math.abs(D) > 1e-9) {
          var ux = ((ax * ax + ay * ay) * (by - gy) + (bx * bx + by * by) * (gy - ay) + (gx * gx + gy * gy) * (ay - by)) / D;
          var uy = ((ax * ax + ay * ay) * (gx - bx) + (bx * bx + by * by) * (ax - gx) + (gx * gx + gy * gy) * (bx - ax)) / D;
          if ((ux - x) * (ux - x) + (uy - y) * (uy - y) < 0.25) {
            tx[i] = ux + gauss() * 0.018; ty[i] = uy + gauss() * 0.018; placed = true;
          }
        }
      }
      if (!placed) {                           // filament: projection on the bisector of the two nearest seeds
        var mx = (cx[a] + cx[b]) / 2, my = (cy[a] + cy[b]) / 2, nx = cx[b] - cx[a], ny = cy[b] - cy[a];
        var nl = Math.sqrt(nx * nx + ny * ny); nx /= nl; ny /= nl;
        var p = (x - mx) * nx + (y - my) * ny - gauss() * 0.01;
        tx[i] = x - p * nx; ty[i] = y - p * ny;
      }
      qx[i] = x; qy[i] = y;
    }
    return {
      reset: function () { t = 0; },
      update: function (dt) { t += dt; },
      write: function (xs, ys) {
        var s = Math.sin(Math.PI * t / 18), D = 0.6 + 0.38 * s * s;
        for (var i = 0; i < n; i++) { xs[i] = qx[i] + D * (tx[i] - qx[i]); ys[i] = qy[i] + D * (ty[i] - qy[i]); }
      }
    };
  }

  // DNA double helix with major and minor grooves, rotating about its axis.
  function dna(n) {
    var kind = new Uint8Array(n), u = new Float32Array(n), v = new Float32Array(n), jx = new Float32Array(n), jy = new Float32Array(n), t = 0;
    var turns = 2.2, R = 0.3, H = 0.92, rungs = 22, groove = 0.75 * Math.PI;
    for (var i = 0; i < n; i++) {
      var w = rand();
      if (w < 0.7) { kind[i] = w < 0.35 ? 0 : 1; u[i] = rand(); }
      else { kind[i] = 2; u[i] = (((rand() * rungs) | 0) + 0.5) / rungs; v[i] = rand(); }
      jx[i] = gauss() * 0.008; jy[i] = gauss() * 0.008;
    }
    var ct = Math.cos(0.5), st = Math.sin(0.5);
    return {
      update: function (dt) { t += dt; },
      write: function (xs, ys) {
        for (var i = 0; i < n; i++) {
          var phi = TAU * turns * u[i] + 0.9 * t, y = -H + 2 * H * u[i], x;
          if (kind[i] === 2) { var x1 = R * Math.cos(phi), x2 = R * Math.cos(phi + groove); x = x1 + (x2 - x1) * v[i]; }
          else x = R * Math.cos(phi + (kind[i] === 1 ? groove : 0));
          x += jx[i]; y += jy[i];
          xs[i] = x * ct - y * st; ys[i] = x * st + y * ct;
        }
      }
    };
  }

  var FIGURES = [
    { key: 'galaxy', field: 'Astrophysics', name: 'Spiral galaxy', color: [214, 220, 255], make: galaxy },
    { key: 'orbital', field: 'Quantum mechanics', name: 'Hydrogen 3d orbital', color: [185, 166, 255], make: orbital },
    { key: 'interference', field: 'Optics', name: 'Double-slit interference', color: [126, 240, 176], make: interference },
    { key: 'feynman', field: 'Particle physics', name: 'e⁺e⁻ → μ⁺μ⁻', color: [255, 194, 122], make: feynman },
    { key: 'dipole', field: 'Electromagnetism', name: 'Magnetic dipole', color: [124, 199, 255], make: dipole },
    { key: 'graphene', field: 'Condensed matter', name: 'Phonon in graphene', color: [111, 211, 195], make: graphene },
    { key: 'lorenz', field: 'Nonlinear dynamics', name: 'Lorenz attractor', color: [244, 154, 193], make: lorenz },
    { key: 'cosmic-web', field: 'Cosmology', name: 'Cosmic web', color: [255, 179, 138], make: cosmicWeb },
    { key: 'dna', field: 'Biophysics', name: 'DNA double helix', color: [143, 227, 255], make: dna }
  ];
  var NOISE = [150, 160, 184];
  var BACKGROUND = '11,13,17';

  /* ---------------------------------------------------------------- drawing */

  function Surface(canvas, dotSize) {
    var ctx = canvas.getContext('2d'), size = 1, dpr = 1;
    this.resize = function () {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.width = size; canvas.height = size;
      ctx.fillStyle = 'rgb(' + BACKGROUND + ')';
      ctx.fillRect(0, 0, size, size);
    };
    this.draw = function (xs, ys, n, rgb, fade) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(' + BACKGROUND + ',' + fade + ')';
      ctx.fillRect(0, 0, size, size);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(' + Math.round(rgb[0]) + ',' + Math.round(rgb[1]) + ',' + Math.round(rgb[2]) + ',0.55)';
      var half = size / 2, scale = size / 2.2, p = Math.max(1, dotSize * dpr), o = p / 2;
      for (var i = 0; i < n; i++) ctx.fillRect(half + xs[i] * scale - o, half - ys[i] * scale - o, p, p);
    };
    this.resize();
  }

  /* ---------------------------------------------------------------- views */

  function smooth(u) { return u * u * (3 - 2 * u); }
  var EMERGE = 2.6, HOLD = 4.8, DISSOLVE = 1.8;

  // Points at x_t = cos(πt/2) x0 + sin(πt/2) ε. With `cycle`, the figures follow one
  // another (emerge, hold, dissolve); otherwise a single figure stays formed after emerging.
  function DiffusionView(canvas, specs, n, dot, cycle, onShow) {
    var figs = specs.map(function (F) { return F.make(n); });
    var ex = new Float32Array(n), ey = new Float32Array(n), fx = new Float32Array(n), fy = new Float32Array(n);
    var X = new Float32Array(n), Y = new Float32Array(n);
    var surface = new Surface(canvas, dot);
    var k = 0, clock = cycle ? 0 : EMERGE, noiseUsed = true;

    function refreshNoise() {
      for (var i = 0; i < n; i++) { ex[i] = 0.42 * gauss(); ey[i] = 0.42 * gauss(); }
    }
    function noiseLevel() {
      if (clock < EMERGE) return 1 - smooth(clock / EMERGE);
      if (!cycle || clock < EMERGE + HOLD) return 0;
      return smooth(Math.min(1, (clock - EMERGE - HOLD) / DISSOLVE));
    }
    function show(index) {
      k = index;
      if (figs[k].reset) figs[k].reset();
      if (onShow) onShow(specs[k], k);
    }
    refreshNoise();
    show(0);
    if (!cycle) figs[0].update(HOLD);

    return {
      step: function (dt) {
        clock += dt;
        figs[k].update(dt);
        if (!cycle) return;
        if (clock >= EMERGE + HOLD + DISSOLVE) { clock = 0; show((k + 1) % figs.length); }
        // Fresh noise is drawn while it is invisible, so that each transition uses new noise.
        if (clock >= EMERGE && clock < EMERGE + HOLD) { if (noiseUsed) { refreshNoise(); noiseUsed = false; } }
        else noiseUsed = true;
      },
      render: function (still) {
        var t = still ? 0 : noiseLevel(), a = Math.cos(Math.PI * t / 2), s = Math.sin(Math.PI * t / 2);
        figs[k].write(fx, fy);
        for (var i = 0; i < n; i++) { X[i] = a * fx[i] + s * ex[i]; Y[i] = a * fy[i] + s * ey[i]; }
        var c = specs[k].color, w = a * a;
        surface.draw(X, Y, n, [NOISE[0] + (c[0] - NOISE[0]) * w, NOISE[1] + (c[1] - NOISE[1]) * w, NOISE[2] + (c[2] - NOISE[2]) * w], still ? 1 : 0.3);
      },
      next: function (still) {
        if (still) { clock = EMERGE; show((k + 1) % figs.length); figs[k].update(HOLD); return; }
        if (clock < EMERGE) clock = EMERGE + HOLD + DISSOLVE * (1 - clock / EMERGE);
        else if (clock < EMERGE + HOLD) clock = EMERGE + HOLD;
      },
      replay: function () { refreshNoise(); clock = 0; },
      resize: function () { surface.resize(); }
    };
  }

  /* ---------------------------------------------------------------- animation */

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var active = [], raf = 0, last = 0;

  function tick(now) {
    raf = 0;
    var dt = last ? Math.min((now - last) / 1000, 0.05) : 0, any = false;
    last = now;
    active.forEach(function (v) {
      if (v.visible && !v.paused) { v.view.step(dt); v.view.render(false); any = true; }
    });
    if (any) raf = requestAnimationFrame(tick); else last = 0;
  }
  function wake() { if (!raf) raf = requestAnimationFrame(tick); }

  // Wire a view to its box: pause button, visibility, resizing.
  function register(view, box, toggle) {
    var v = { view: view, visible: true, paused: reduceMotion };
    active.push(v);
    function sync() {
      if (toggle) {
        toggle.setAttribute('aria-pressed', String(v.paused));
        toggle.setAttribute('aria-label', v.paused ? 'Play animation' : 'Pause animation');
        toggle.querySelector('.icon-play').style.display = v.paused ? '' : 'none';
        toggle.querySelector('.icon-pause').style.display = v.paused ? 'none' : '';
      }
      if (v.visible && !v.paused) wake();
    }
    if (toggle) toggle.addEventListener('click', function () { v.paused = !v.paused; sync(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { v.visible = entries[0].isIntersecting; sync(); }).observe(box);
    }
    if ('ResizeObserver' in window) {
      var first = true;
      new ResizeObserver(function () {
        if (first) { first = false; return; }
        view.resize();
        if (v.paused) view.render(true);
      }).observe(box);
    }
    v.setPaused = function (paused) { v.paused = paused; sync(); };
    if (v.paused) view.render(true);
    sync();
    return v;
  }

  var PLAY_PAUSE = '<svg class="icon-pause" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>' +
    '<svg class="icon-play" viewBox="0 0 24 24" aria-hidden="true" style="display:none"><path fill="currentColor" d="M8 5.5v13l11-6.5z"/></svg>';

  /* ---------------------------------------------------------------- setup */

  if (hero) {
    var label = hero.querySelector('[data-figure-label]');
    var counter = hero.querySelector('[data-figure-count]');
    var heroView = DiffusionView(hero.querySelector('canvas'), FIGURES, window.innerWidth < 600 ? 2800 : 4200, 1.3, true, function (F, k) {
      label.textContent = F.field + ' · ' + F.name;
      counter.textContent = (k + 1) + ' / ' + FIGURES.length;
    });
    var heroState = register(heroView, hero, hero.querySelector('[data-figure-toggle]'));
    var nextButton = hero.querySelector('[data-figure-next]');
    if (nextButton) {
      nextButton.addEventListener('click', function () {
        var still = heroState.paused || !heroState.visible;
        heroView.next(still);
        if (still) heroView.render(true);
      });
    }
  }

  Array.prototype.forEach.call(panels, function (panel) {
    var spec = FIGURES.filter(function (F) { return F.key === panel.getAttribute('data-figure-panel'); })[0];
    if (!spec) return;
    var canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', spec.field + ': ' + spec.name);
    var controls = document.createElement('div');
    controls.className = 'panel-controls';
    controls.innerHTML = '<button class="icon-btn" type="button" data-figure-toggle aria-pressed="false" aria-label="Pause animation">' + PLAY_PAUSE + '</button>' +
      '<button class="icon-btn" type="button" data-figure-replay>From noise</button>';
    panel.appendChild(canvas);
    panel.appendChild(controls);
    var view = DiffusionView(canvas, [spec], 2600, 1.2, false, null);
    var state = register(view, panel, controls.querySelector('[data-figure-toggle]'));
    controls.querySelector('[data-figure-replay]').addEventListener('click', function () {
      view.replay();
      state.setPaused(false);
    });
  });
})();
