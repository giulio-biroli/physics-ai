/* Home-page figure: physics figures as clouds of points that emerge from
   Gaussian noise and dissolve back into it along x_t = cos(πt/2) x0 + sin(πt/2) ε,
   one after the other. Each figure has its own dynamics; coordinates are in
   [-1, 1]², y pointing up. Respects prefers-reduced-motion and pauses off screen. */
(function () {
  'use strict';

  var hero = document.querySelector('[data-hero-figure]');
  if (!hero) return;

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

  // Precomputed with the adhesion model (_tools/make_figure_data.py): 4,200 particles,
  // initial positions as int8 (×1/90) and final positions as int16 (×1/16000), interleaved x, y.
  var COSMIC_WEB_Q = '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';
  var COSMIC_WEB_X = 'S9F91G3fc9Ck20ATFPLUE6QviD1d1ysegC3lPjgG9u5S1TQWtdPeGaTVaRaKCtnlKNQnE2YKmyyQ1ysW0ghxIXYJ8iLi+xkYpR0pJ2QI4SPxHPko6gVq2nUtLEDCFdvxjDb8LOwOUDoiB+odwAnKHRsu1z/KFuLA+Dv10ygipyfH3RXSOMo3GnYdwvfV3qnOJ/MCygPVxxmNAXkcggbkHhA6XypW9C4VsNFkDj3GSwAv3pQTg89OCvI9+tbvzDYIzNbPFRULhy0aMNb2gQXx0p7XeiapNfcr29ZoFeDXJxUVLiw+dfMXFeYdrPfZDSfXdQmzKazT7xrDLBk+vwjpIXAIxvqS0Y47vBi0MfYK1SK78eEUuNQPF/I4fCq9OaMowRyZM2kA1cneCLcsxAm+KsM2xi72Lcw9B+ycFLAaFvYk0zwXYyg0Ozg0TzcjOorx/vSIE/IENB6lBNPQ2i5rPPHldchw9ZwW3i0vPpzYiieZLWdABgg619XTahBRC5UnPsHo++QujD1hHiT4mxCKPf8dsPfdAQzOkDDIPlbUNxbOMMH2EzNbxe4Kz+GIK5xA//VHFYLVnApeOdLQ9xYV8dws9j/G7WfJmdQmF98Fhx1MCZbbIy88Pu//R8lQO/fwihfXNFgJo9tqF1A8D9BW6OzVghfn9jAVbtR85DPJCgV1/5vJhAmg6FnszCRN1tAUCxJ9PH7InO3IzT3qg8SOGpkIuyyAJWc4qt8M0kfechQXLek/Mx8e9rMhjTHfBcseXfcVF40An8iR1FQa2//wySUgkTPyOL4qIO1/7PA2+Cos3FkcexA7D7o54SXA9EMTnd0A5sXLexqeDLsj6PSkBGs1xDzkB8zs/d1xE4gvuPhmLug+Ed0y1YjYMiCjCyHh+NKcGXQEptAN8JclTNxFDljT4Bju2Y0p3MjZ7Bjc9hPIB/cbXtx4FooBv8eX1BkZLvkkAUXsMO/A6RoTYzbL/iA3ajJM1rrg5wuzMQcRCTuvBUIeeDpx9OMLdSF8APbzOCVC+DfyUxWaCpTeay7uPdjtFyjHLbE8m+evyIP76xcs4DvPFxE8PgkJE+kMCijnFcNk8Es6efP9Kt4naMyz66fUoOEl1YQXCuJhzoLn9cljCW0s/tV2FDoVFhf7Nxoqvdz3EmPpUMojO+PwdCw/Pjs8/9IFAnz0CNh+Eh8yAzfqHGf3TNelFA4EudHZ1hQUCS+mPkL/kvNF0uYW2dRDFWgJ7SBE2Oj7GQYjHvQ7ju/dLtQ+ui3KP0cA0cZjDHXpnDCQPBrOSglo254obPACypIFKSz9LIo9LNm/FYccxfiVCnTpOPD/E/IEAR7lENMuQyVm9x44Fiiq8DAnCvR5FTbdsROY1l4XAg2+6cLT4Rbh0igavBmBEnw3ScsqMiLEwgCA9J44iicQ6DEIXvk7ybw1mckkCrgsIyw097IVlPEK030ZV9ttFNMANhqqJH73Xg1kMkDScRko1l0TbAov5FrdihTj26wRITWxMIgQeM8RCz3pqv5oxuXWkBP+LYU+HgQhKNjOXAoX0gcZHdwNFhHcUxF7NFH2AP6Vya/d6BMIMAQ+7DrlKCUz1Tbz3BnWp9WLG94slz8p0DDxbAuc59LlDsp20gTUJNWFFR3VSxk7CUQqBgrW3H3XjBSRLgxA89wU1ScEOdDrNwz0VugIFI3u4BIRHB8ouAhNLIIDOR6b1OUYvhD/OZoKCi17w8QbwgfrHzgLmCvJC4TeSjgWzSTWgRXS1TQVpwZPHeHKieyiKz89xyqoPLrU9Bp5PH0l4vEJFGr19yj4CEgiL9N4Gn4J3SAH9MIUVS51Pi4oUvfSOT8of/9WFyLU1xpuylkEG8UC/6A+Ctfc09cZCeyRPC8PstOk5a0okC5yPzrVKh0bEDc3HxGuO4HZ+iLgHmj3YNNPCv/elBQN/3fIUNaFL+3UdsSW0vkZUyoiK2kbVyeqCqAc2d6yEtgdMiiN81cR1ggvKRs41fMsN+8pGwJ1zXzxDihX1YwKaPUKyyXTMBZj3kEU/d90z73RJRehN28uctViFvIeSTRr0RQZI94U0q3UJBVq5DspQQmt51b0SBUoH5EwtzqSJYf4CxbFNK0ofCq1PO3evRSdCZrkff9yyLLesALN41nHsC8B93Yi4fcT3RgUYvyhyOnQwRvoEkEQSTn48hb1fREvxqnhm/HyFA8uHz+aNnsqDzMAxk3WZhfKFYHyJTCPKL7VgxlW6gUUuAEFG/PvezGLDS44XdeA3pfEjT1/JM0lItV3NjnzQBS98ckoWQgEIj8lkzgb5kYppThsKKrpN8kI11Qubu2oFIYe0ve1JJA98y349gAIAixMCjIkgDVPMUjTlxkp4zTf4PShFXkDZ/CqLsn1MAYOHXA4gClU3S/VaNb3NEn2nQwYCfwrajg99IHTfBpb4zLIgduUFKY6cPY86lfwFQzk55/Vchbx218UYdV2CtTUWBo6HWH3PtuWFFrSmRn+M87HyTof2hgeaPiL1KX/zNFUGWfNFQkPLRQ8kejVyETzW8ng0F0ZtDjR8+g06jIUOOUwr+VSyc0KgyOjL3c/vNc9KRPX2Si/2/kp6AReIoomziZYGBsExRAsOlYduPfI0vMYdt5Tz4cHQhwO6o37BsGN5S0eSS4cL6Y+9+/lE3oaxPXH01waQS7UP4UMjSKvNwkpf98p0PQjdiznHEb2vDQ0MZ825zIL13Uq+R3HJ1MdgSgOC18k9C4Y+E3VmBNRE1TvOyzUPefKUhpA6ZgTIAYBHeX/7skjKsUn1jxCJZ8MsjF4NnEpGi1fP5wLVuhI1mIVERPMyGwKpOd547nNMSivJzk46y/Z0CDBqAwY6RD8rchwAFTJ6P+Wyqol6S731VwVQ8sN63MNMOdhKNfOnv5oyPzyDwg74OrQLhIuyv8vqz5fB3jtetRLGF8uYkEB1t0IRu59KGYSmMozHoY81NWyFn4JeCR7N4bzINSeFioLhSGA84cSJy7nPg0Kww/X4jAQldMiGGAkBydl02YYkwhS3l/e89BoPoACX9bZFp8vJsHnINo0HB89+LbNlgWyADLG0QJ4CXTTgBt1B8rwNQHO8lrQRhoNLm8oXgTqz1oFHsK8CsUp/TdKMOoLQCGDKdkPstomFM/R6hbuA/fP4waxH83chROiL789jCxiPz04oigXDwsY8MxTBwMOVBmPOEIoCS8hP00G2dP1yX7tsACWyI4zPcSy/pcqYNQFKHgtyz8bDLzolTlM/IIFUh1HNu0oGyD89hon4CmJClUpQSeQOlb12BIgAuPMVuzDyeEqB0D5AHbz9AohItPg6yXl5IwUGgcxHTD2hgM2CPUqUNS3GU8tHEDz77UTRQu+KLPUHhVw1G8afxBHOuMJdCatERLMYc3d6tf0qhPd1ZIT8Ah6K8kFkhzoA7MgYjNSN+TJzd6y1NvO4887DEYF5s4pIQgpEdowD1zUKRQICGUtsP4hyL04xidMNmQ2ovQVFdjlGMl09fIV1dctGEXUFxqc1QoUhS/6QWA4CSkgIHT37tW0FPLOAwjxLK49WC1EQD8vNkD16EPKFgIpHBEM0+mBGwX17BvyMtsBWylPMEj2YdGM85IrJkAlHeT1Gh7N9wPF6Bru/OTGctmfKtTLswjgHFv3KREmOowXRQbX5UPK3NKV1T7UnxxRAszHwBF5FuA+8Ce9/27ymAp76snWvRZ15nTJ9tF8GCDgfc6SOXH+BdY5F2kJbiza0jMaPdG2GvI4cfs92HwNoBp99vTTbxqn2e/P1dDYGlDRGBkqB7geAPTx1rg9G+3NCuPnDfaBFIkTGRCJOa4oI/8Py5ntxhFKwx4bbwtm6RoILCMLOfIp7NKuGuMeJjQT1sQUWNx0E0MOs+dzLeBAHdZPFDAf/PdgNhUrGvKwKHbmrMoCyTYaLP/byR04QSvY5g3Kqe53CxkgEfd7Mjr2bQAHymr/zu9oCLkdTx76KDPNigcBIUT4SwPV7w8FNNK55pQ9yxA/Ovw4bSrtAWHyDc5A68ILYysVAF0rxNPDGYHnosoT11oYzzH2N23ULB1n6ws2dgv95uP0ZRNU54giqzefKavd3NFnJyMoGgeI6+T1AxPqL4U+3t1BzwfNvOo11awZydEuF8HV5BVjCtje489K6Kw4ASokOAwoRd4t0OQGxxvqCL8rd+IYwt0uHD3bI0j32eBiIzQq8T3o5FnKDj2fJYvXXhT2x44ZG9SDGXDCT/Cu3LPX2dA7DnAL5eeeJjonGAsD5q8JWSEKxjDyvcLc7/nsjRMtLXRBmgsAIjAV8ReRAA/L//y/xgQdCyo92f0qndXeID7RrxlQ1nAVjTzTKYMEGB/Vwjr+/NA0DKTU6RvE1jcW1+98Jz/e7RK3OFMocvR1EiI1yjGG8psUoDA/KaoK+S2RLnY/dd9BwwQLZizp2ogVq9SFGcg8U9TXCQ/fRNvyE8MFVB9WzjHpTuXxytMHFy0b/k0s9gfIHgA0isbuH+szHta/FuL0PBMtGT3us/739mkKcC0hCbMtigxm508xyz0v1tgVdccP4Tw1MDD+8hMVeh5qKJfSVcWs8AIUvDRlM9oDPysWD6c2/QvJ6CobMfUi4B0VWNZ1CMzNgwjsBpPr8isS94PvehN4MqQ67xniOlEHZh0iAu0qLNWeFRDOzArzG4EzMdb2E3fO9+igLHI+ytg+KUvT2BclF94mZTeJK7vOCgocL55Aux2oNn8KuOjONh4/sTnEKIrLxxmHEXUVxOGlEvgYyfSkEBrsI86w6t7VmTXD/C/FEgtZ6GvS9RiwIHwFZN9q0JvTTRUI1Xs1duLdLK04KSoDNaEyTgV70ucir/hd1O0VaStpPxcwzPe7GAED0iTQNwT1FhW4CSkcbtN2GGTd1xRXLyA96cE2GvcPL9CV2nzReNNvPiPZGR/6MTY8Wdpu1qzWrRWL6fYTgy+yPqPDsxoD1AcacdcDFn4KOy09/R/KfTMgNrMAFsjNGd8mhS4RP4f1ixWOCXYqLdWlChDvLSgiyWLdnx3h9vAJmCxLD/QjyS3bPrEJ5CE0zR4Fc/LZE6gOthcI9RAV8Aq05JbcAhTE1YckNdq2KIPSCRjD1EsanPuUF7sA7csR0/MZtvZNKQ3W/d9uySIaENTGGUgKo+kSL90+bdJE0yXNttl21IU60sw164ctqT1ZEozKPQpR3n08ygB3J2EnwPFPFOI2ODdgLRo+yP+ozLUbOzOy8YoOShc+Pms4rile0gcZ4hue91URZxmC5U/I2PIgFIISkDz31AMbjOPQFMLUOBdF1KEYadoV0HrWDxa3LU0+rPh+HYDV7zVC1FkYPztK74rVBxcXCdfeahHRLtHzAxRM090Znxpt/i3lyjF16fDJaMwB7L8wRj96wg8dOMCT6JXiSNB5McQSDPdBEz0tNUCdyp4bAwK/yawuND9kLrQ+UtbWFr0cCh/v5f4SkvA+FFkykvV8OWQqHwZywsDmKtKy804UnAaQ0y807zKOw9n8wRUbMaDTuRmb5q7JLBue9os53/KgK/hAcNVAC77X2RXOCqPkdCPcNkfVJxoBLOAnK/A8yo41eCrjPm7XAO0OybcaRBF60ovT2eTsElHUcNAD188WMQakHKAtR0CqL/f1KiIx9aX+LPZ62TYPIgsi6AcJoeW2CATp+AkEJKst6j7E0pH0ItZ7FV04virFAEUbIimiJ3jl5cvlNm70g9PcGO/STRk26d8oRtF9G6g2pimdMiHFjddHKI/TMTnvL6NAitJXGQQJsSMwOUk8EjLpNrYM2el01KQZhzYROksHEcYXLVA/e+6lKGLa4CjzLzM9TgvR3w4LWt98DEvpczIcxGAJIiUQBuDsQgpwIfrTleSV6mUUbNY4FPHweBXn6k4aW9lrFJHyEBV9PS0lHtxXEpg2JCtfEhDKSwGCzEHT8BnjP9UDYfSJGEAwdD8F5onMGdXJyxXev9J2yK4EHy2ZPFwHNymL1UcWG8p58Zb02RVtCb4uLMMs5mzY6yYZLthAKQg4LMXUKhhpw2wbrvcEyHEB5stVIecosdYEGjLzpid8LrNA3C7hPos9Bte71z8p+dRaFQvxfQl5Hfj4gdOoGZQxEsTu1RsWPzevKaPXQBf83JHQWtTh4oA4mfkdNBw0EtYXFVsgsTen2wsUZgpe50soiTqgH4QoJR9s+Hb+8cdEzbHZH9/VKGEKP+BnDIvq8ewsNDwbOvZP1pQVbPGeKEPnphOr3WAS0zDnPnQKkt4MHCr4uwru6Gb/w/IFN64xoy0vP4H05xH2OdX6owYwHtzO2Qin1KwVgC92PZfTDD7M6CQUefOwE+UHQSAOLqE7wDQNMsTYKRUT9WkWGvmOKbffp9CD/+T0WvLLFILeAtKYyqruYf4NyfDKixzrAM/zCMQa5h46xih/AMnJ9AuJ6lIqWiiGBAsrf/UqFcTdBRWTLYk9St8OExLfrxiBOjsnmgY3HOU3hinQ1Y8qyQqeK2YtHT8d3Wkp2wEazlYdgPiJ3i8TfBvZMp4w0Tvo+SkANvdlFEQLdCo10y8bl9PWGZfjaBSs1n8pMAs76bgL0yqwBaUeLgE29VsK8CDZLaw+9B/d99UJnCWNFrHwIgdeK5s+ZtdpOWoohC5APYTXgiV6Gv/9BADO9PrccxP2LTM/BDNNxdowRTrmD+UuhhQDGun+EssZ1MgXZ9SqF8zdQRCO3h/RXwmzLtQ15smXOKYqSPHHJ/nbmRPf3yfPr9B91p0IciEBHXgzPy6jPys2dCmd4kgPTtcJKm/ZXtp91QDOSOGwFNwKnuc8ONcoSS6+PdznucrKLh1Asi/nPoUrRz1ECNQfnzhGKnsG1B38H1Y1lcjJGT8U2TNLLvc/pAnsLdXTjxh9NosvXyO/NxQcJALP7yIVvwmHLH/Ulxk7N+8w8vfQKL4S1MkS0nYJDsoDBXIcM/hY9K0T9tQgGGv+vseOx0LJ8ADQySHURBfUA/Lv3y6BQA/TaRko1iE1nyFQ+7IKhd49Cmvp/dFgGWTVdxN3/vkYleZyzSDXdCnhBPAcOfLi9Vfa1hVi938WRdSPGSoSURhhHIL27dcpKg/2FhNf11MU+SoJPYgIiNhWxi4aVAmp3jwGwB4gP3bYjxWIMKventD32mnYsAq0KUzUvRdK5h3LUtkTFbLn48rZ8g3JyC8IPznjUcbZ/pLJjwjGIMwc3vQ7L2Y+ntp30HAGgRwhMDspddp7FXHnsxNULBQ+1Tcj9ZEQVjkjB04dejyUJAg4uypmCSoiZQd1HggUIBO93oTBFAtV4LstfEC16kMTRjc/K8QIHSGHA6nwtwV/HJIEBR0XCBYhTQ1HItMlMSemCC/eQNCR8S05JSjW1ikW/d6RFLIo/juCLsg+oC9wPbkwNUDfBIfQLQlzIz0QFO3n+OUpQf5CGnvVZRWmyscExApwK1Xir8QTDAfocDcQKBINCOg6Hr32+NJt+dzjNhRZBpPU5xyA9w4M9jH2+QoXs9jwFFUNySx2BB/TCS4GQB7cCCnp0oEZYT6uI/PVahec1GkZZ+0KyqMXiT1nLsfAydTFFgXFv/zfC1gsadW5FBv3awR6B4XA1y34P0g3NiiF8ZkUsAlM6eoUXw030/MYN9VVFCk7eSbbCZwiMDhEKrfU5RmmCXstNukwyqUFWB2D3lYh7NPpGTA6qib+CobfA9RPFjL+W8ja1C7NmQA4x/fTFxnQCRUp9i1UPxoM8jAo8zAVcfHKO1YpXylkBXIeXB93NKQN6jM7080ZYdxaErgs2yfRLtRA7urLyTLg2BDs5k3LRAxM5qLk8BP75PfJNiXH0ZAFHe7g0vPU99hVK84trT/s1bQVRdW3F8H6DRjU1p4VUgk2LKfZARWfEaYvmzeT9AAAYfX269wTLTjVJw0LMOfu48US7vRzFNrk/8+5MCIpxfQCFfscbvbcM5woqQtX6bLrpRPGCrMpMtajFhkJESzuCl8huQqQ6VEfjCFPAEX0795wKZjNaQirBgYfTtaYFOcLHy/zzM0GmiwYPmDYwSgQ1rMWBx2D99cPrDdhCkrfzfEBKc8dF/hHBkfVcwo3KVTkdMe90s4Y4A70NcP3wCd8E8MO/gop6WLTCxrw3PnWLhPx74QmnDkS2qIP7AwK1oHL2enI6lUUCdiBKkHo8svVNoUmDApOIw/9qvqB2iPRgdSoGcALSi2CN6wpei4IQKLSINTa/HkYEdd0F7HUehq2CyngtgqO5/n0mRP+0voZmNYzI7TrVyUJ1jQ0Y9SDG37TeBiq9ZPmCwqjK9zUBM0wE/gTQ/WQFPQJiiusM3szhtAlwA0sZD7KL/k+bOjSy9vC3+Wt3lETIgeO65Ey9jPZMvcogTyI8AHVKRiG3n/POy4lQenXffI3MNg/DDM5NZcwozlzB7vALS6mPb3hdgFmJV8mOh4q9XA2kiuICyToqNfXFW7e9RPZN6Isegi9LdXF8uAq+D04xzN6KL/XCBa90HUYeNEoF/g2YyboN+koAzGbPNIUA8Mx3sfS+h0GLPYvkj6M1gcYjetb+QLfEtDV1voi8SET+FIgYDVS1ewUUNxCE0Y2rfTPBR8fihHNPW0tJj0x1os5fwnBLIEKAujxIyDhf8ei7wjZISuO1oYxcvYMFdL5jgDr3gbObi9NKKwPHBnrChMsyNwxEdHb1NA/BnkfZeW2yQ4JFi0Y5GE6Z9Y6FhkHRtZwIn0vE/gPBGw3oSnANmL1U93pya4Ikex9FNUTgNRhGuc8Vydz84wSMiS199Xs/BOi1f8VUh7q91oeHflIOFAnSTGp9BghUPe+G/L0qQvAKewKAyYb9jsWXS4QPvUHEByJLXo9KtVgHAkt9OeGNkoqTs9UCA8SZBNX/2TyRxwg+BUKByuf8U4TGi51PzL+Gcmt1vs0TzgN9MbMdOorCqYhO9X7FDHTXBm55lQoS+0MKCgJdiHcC6vdpDoM/PDgA9KF9nMUIC+KPuvzwRNvzqgIaOvhE9YuNPjdCbroreSYyi4uST4mCjDfeAnpLhf48xX7Ln4+hzdZKssuiEHPCmrfM9gTKXEKNObO643Kny8SPmTTxBm/L+T10NXDFrkcXfi5yqUD2x+/MjscE/aNP/0DGAVO7/ocQfZg8uwUmge9ImDytCjn/xMaHBAqO4v+T8ho51rI9S2JPaIu20BzzQvr/PTpKNvSSBrc1pwWe/HnEykufD6XPlskiPU0E3XO3QeYCgMqrDgnKt3bCSSdM6rE09SAFp8Hsy3ZOdYmqBUg8QALrCIhzrkGzA9WGSo3JCsHCpvJlSSZOsQCRRp8Njo0v9d6HlogGTW84nXFShCIO3scZB7FOEAqFs0BCRzUSxWbP3XHK+82KGsm0zhX5KUfOtt1FUAKO+Drxiz07C6NPrEGyR6xAHPGGtZ1FEguOD/EC9PmOwfvHlcZuvQ8wqAbNws0IQMLBi2l5k7JidcmE3YBvfKk7c8U7zPs9VAfqDOgCb4lcQmtKT3VShW81CgZKQpSI9g1/igk1f7NeNZtLzfyJhVHLVg9KRJb7r0LIuhIN2L0BzYTytwARMalLfFA7NG1Fv0uAT8DMOk8EdvaKSsx2z9zC/zmiQvuIsv7dBbQAJDL7Cx2QAY6uSYE9QgTm+fyE3r8eRdUN0wqaC7SPeXRoRdoFLgwMucyKNwLAupu/BrIedSmFJQIiiyH1BcWCwlgKp8H/iIvEEAkRi+3PicCVs2n+VL/QQ9XGRcx+PaC1bT5ITotz3oIAyEyz+IY9Ahv6Lwu6Dxj8zAUYjDYP1neVBQnK9A+cy/lP8rexdHlCY8sxDcf9PMkUwB53WUVQB4wPqMNGxsxGnP+SzjvLQvRWBjmHff37NXLFQcUOPBG1eYYg/h/G1smdzkROeYmcR2/9lM4GvZRL1w+BRxt9VTUchflHq0QV9W/Gdk4wPJ+LQE8otN0GdYK/9zS1WAWIMVH4sMLvulU1L8Z5DK/NbzPZAkC+wgY7Png+Z/UVM3S5wLovwcwK/0uhD14OI/1p9RxGpfTXRg/OAopoAq34+QHbx5B18kCfela4qEIlyxgBwoeWw6rGJze3BOLHKD3xTXdKZ/SOBrMH6kzOy4fP4QKGuhgAJwbgeC3FHnanM/oBLvSQgrG3SgLWOqmFhcJPPihFn06DfFa51rK1zZ2KKPuUsmL1E0ZuxhCMiPPBumWNmD7w9oXExzt8SeTJ273i/CHKLfJywO8CO/dIsWH4rvUXOTN8b0o8Auy6Rsf4Pb35enIc8yNBxAI3iNM/QkZ5scP7UQ48SnVHeAsDNSuE9Y5ps6ULBs9PAD+yD8at/PcAsjxFDIf+YUJBC6TCYghj9YzE8Et0j6/6L3ILwnMyxwyVTl3Hk80nwCyzKcJy9/C69IUMPY1E2jUVhp/DTEtl+4fEwH64f6DHOT29D78I/YuBPhAxDnlg9R+GrTOVhq11F0ZRdTwGaTURRYHOZ0nws6q6KYKWy06L5pAsADYxzoIIC0/Ajg5kgc0HiU7HvLMBl3tKjmYKEMuqz8d1boW0An/x1sL8DF8J9Ao9fR5KI7bvdKeCbgr7Ap36H80DcWyFnDBOtKeGJrVjRQ+LaQ/XTePKyoMoOcJLQNB5Ajg6cUMVy2MCRwuXeVeyDPm0MnJLu8+PM/kCPHJiASK5LPHfy2eP7vlARU+GhD0d+c7IAfVaM3MFa4a5SR5w5PTuhjF1r8XewCq89EcfPft77EU49RFFi3VRBUFOsYD4yZjOZLfh9HYNy8oGisk7Po1Iy5ZCPYcFDZzLsAtlz/XLu4+6dX6FMAEZ8JRHNL28warK9XUNOPB/5bILyy6PxkIwCo9CpAs2NZPFSc3KivOLlolc/TjE8AMkCwt19gqxtTvFAzZfhRuHbUnpDZHMhQ4xftg2ZQmKPa9GVsCy8SPHm01fgfDv6vWHBcqCqfo/DHMNf8blPh8LaY+OQpqJdQauPU06mYoQtb0E+72eQoUFvkVV9KXGdoLSegeCvksoM5nB7YIRunvL8A+m/02x70cdB9Q4pnM/yuBP2QuJEEJLwVBbAvi5vAUJ8EGxPj+hc292GcOStCMLGpAodZxFfcJEeA04F3RVw4I62H2BhNCPF/vo9emKIon3zwu/u8ZHf9byeH04ye5+ej/BhQsJtUsRT45CRQtyx9vNELSihgUDHzpMw0v1iTlPMw/y1/riD6EI7bjsChIN14oYi6VP/gJCiLZJfnwBi+wPzvUQBl8/PnI1AzNMQ434suUL4g+Xtt8EwcexCvtGTb08zst/wLYUxZNC9ojTvZ9FFnXvhTZ1IwViPBsFG4mWSj72z4VONriHebZrhQl1H83qjecKzUJwyJkG7/6IMQ0GmY5Yyg47Wco4AER8UDSLtSqzWgH3hKB71HCIhoIACjIOS/0Psc4zimHL649uOW+zAUS8jtaG2n2EzPDNTTcjhFdFtTwsQHfxP7NV9i/wQkaeC9dP6Qub0C/I+v3bhzTMvUrgT06CS8tOi/HP0sJGS0zNhgpmNmMKt4bb/nK5u0nW/9dJLAJfClbC13pbAv9Go0c6dbtzGvq4TULLHI6NSYi3csTohnZ/gDzve3YHcr14PrONS/NVtr5LVw8FtdbIiTVCwtZ8GIMMgVyH1bWQCp4FncTcM9t+k4Bt8uMNmotUwloINYtGkAcLX5BQ9iPKkw9GCmIIfr2OTPaKDEbx/W25ZwlT9eDLcL8RBmCBC8eEjH+OY0w9MONLhs+hgK5G8oK4yBLP6MiWdeQKxYxtzdiCEcd5gmS3BrRmhhd3boTFDX6yEIt+j6eCq4p7C83P7rm/siX07YZoi82PsDIb+2w7N8UjtStFh/tVCeECPogDSD2MlfpjSgZ05QZdv6Iys0Vo/GqMUP3zMLh5PPZ9dpdJe73OtWXFxbPMAkUOH70Qf1rGiQibTRv/ffICizCM8rl+CfXMP4oVPqCysQzzzZG5yoWp/+eyA4dNPdCF3oFZsLA5agAdMeaOAj1TxDy7HsSYSXM1B0VIQFpzD/AnxGbOVEt6OMqKB3hCihm25ITHi5VP4j+lRksAiPYyu90Mj/apSkcCVjabg4qPzI2vSnqLYU8Eiwz9sEKet/gL7BB4PGpE6MdAAg6zfjuMdR3GEsMwiyn3T4T+doJFTrVLxuKLXBBjfKTFGTT/T3uB0bPRN6gE9X/6xrCAA3JfwvD6ZPUWhodCrImVe1GJGkLujAHMwfFNi/hO48KjN/LCuwryN89JwkJKi2+1aMXBvofEvLbZNhvMKY7f9SiFfjZPQ+cAHYxxC5fPsPWkyEIFUgxHSiLOsnfYM+N/QbIIQD0x44RaxNWDErICR1u9IEwtD9/7Moomxwn+BHTW87HBuQdmPnEyWU/PiM0PgYlwsu7BL/VLuJHLYk+GdblE3f+K/fDCj8bETDoPxPhk8IIAE3JaeSa+ezT2Rny5P0T9RIuxtstnT8O3aDV198GExnV7Brz1UM5FCEtNvjdfBOd2qTRDdZyFfU9sNZdB2ke2iQnJlsvdzyv1pkprsuP61Q24CYo47LFixKPGQAtcD2B1IXMzgtb56vYlBS11s0TiwTVK13zexRU3YkUT9VwEmPxrRNpze8GGfKgFFjCaQcsPB0qjgls50Lh99B20nUYoNILGWHlqC6O1ekXVcOE8TLzCBTn00wYxtTpGM4JRMOSHtggjtIXGLDSXhrWIKgyGNQOGjcLfS66LjdADT1o7bMJHuASL5Y++QUjHHznSciQCVMh/f/iGkQyDzes0MnTVRwC+H3hIRRR2IkTjQOx8R3rJjy6LPY+mPuM6lcIZC1BEyXEwdGKFg3YyStqLwBB6AaKH3nUnRsWCDrr281gCjkAf/MI8D4oIjfE9DLi/CEGLpQ9hDUr9LP2VwlUAzXtEv7k94oFG9O0CvLpXzCU+B8XsCZ9CsznUgpNK40zusWv2DwqRQShKzklEQWTCM0s7cwYGj3TEBpX6QgsKQsN6dczFcb6Cm7gIQpt6Kku4D8L+H4p1QHs8xzz1gbL517MsweAHvnV4hWv1xYr7uXOyr4KqywhHCb2RgvvL4UL2udRDm00QgfAHhbS0hk0OBQpSOZcyK4KnujaCUEkvsmm3v4zVDR02IgVu/2qGGHW/xYbHCEoMwxBLfEkASf08FAhyQmGIsYtzj9Z1jQUvPsSF73RhRk1C/Pf9tTeFhvyzRVuEGckjdfVJkzhwChsHEL2+giSLHALkdJ5OIMoaR8LNY/ljMtk7A/NFh/TM9fzGxKQ0xQZY/vjGG0Hyxy3Lm8/fvrAF3kvTj933zXQqdSXGgcsDQQRz2cJujo0LAkG/xu4wk0b2zkfKCbc2xS9CPEq8B/sM7DrSBSoO44rlQmnKxQMbefV/bXJ8P0+9rA8U+5n4N0UMgCEyxQLhOrVCdwjpgd+Ho0LfyvrGrIy0ircPJrXOxXkLPQ8ZtOdGsYK4OXsCHgk5Oe8ym0qvCcHNb/0mdLjGjvUjRiJBgsgHtbtFCcdlvfyD0gXWid5OgQ+9wOdLtk+8zRaMccbkA7uPn0EktJiFh8uNcGZ81TIaTm89bIueD10PqXtjetoFLj8zPnKwM/5AQm+LKgLkt4ROdgqhPYDFiwLIehu15kU/BDo7EnegBQeHw8w1xlm9dXtV8yH18Dc8wkbLODcchP5NnA+fNa6Hb8KaSDPC0g1gc/60tbNCcNWLZxBHN8+KYf5bTBBHKIcTOd8yLscLvZdCnApUvJYFDEA2MixD9MYgSrIJ0b1dhYtCCIvfxtoMigFkhxfOJQu4RxE9wkw6sDaM3fGegYLHgoeEffG7dUTHC1YKGz3mRYNCynnIPqOGKruMhSP0iMamQXtHSLW8CPSznkJhjgr9tQsRz0Lz8wJvy10P9IvDTzq/s3His/VCHIomucK4KbR6fASKAM0mDLiNmwrcdTNFe83diuzLAUoq9KE1P8R8jtdJZX4a/dnKiIwbj8W6lQUcfg6GPwY4Ca3ODEriP9MyoEJYipf3VIT6hSKC1ffuM/HHpA1DyVhOBXZRxdOOc385uXEE8XUzBviOEAoMP/txtLaCCikC0ggaAun6ITUjxp0Nqso2y/JPxXWlAYZG0P3wivVPynWMRih/3nKixNe78HuthRUHT70Gwr16OXx0BMxCnfglwb8HmXmv8o0B1ftSy/PPl3SmBsBFqI88dbTHT3UyRb62OYoUQpM6LLfLBSFAlXNA+UJ9xvfsRQC+sL/NQlWKgzbwxW60NDnji4OPovUnRwqCpQhNAqxLCPTBxvMCv7n0eG+FLQJJSuA6R3KHA0iLOISNu4a2MEq5A3/32/Tl86q014ZU9/5KGYJXyTbCqQtGvK7FEAk5CcYCi0sfgnRLKTEJxr1wr79au/2J6f3fBUiII01+9ZcFVnfiNKpBJUcb+bAEwEt4Twg3PgSP89pCDcsET5ELkBBGecayhD2nSYsGFHzDe+FDr/ejhII9S8VltxQFefVJRSk0ssaKghoH7QHWxuGLuc+FwzZ6EfVWAsm1y8ufgjv1gQmCzd5Ltw9PsUH7C/T7Rk/2Y3OcBwj9x71bxCJ+C4pJN3wE90IFivZNO8wIR+2IU3W5wrBHdv24Da0KHkj2PZb1BcKVNbwFD7pZCfv11srqvy0KkD2exQm3RAUZSypKeYHZul013UQZth/DQnSihmIPgAlNtV6GSs4yShC3SgSytqPz+zcEhGF87oT/RoW9bc3jMvCCinpnwuwI9Xc5hIFDBUr9f5t84XR4RopOi/QwNXMFurSehj7CfobzfsQF+LJRwKi8NYn1dN4ExAFexyg1GYVCQgELlgw3fbb1gguV9SFFBYvt0DqBkoe3gjy2nzUDhis09kWAjcqJ0bfw9FVB5MfV9znEyAISSxOFVAaghAjFX7XLRWpOZknsgjgK8UK4CsfN6UqnzV2MZ3TbBo5Lp09JtcCFFgHbSwfNiUx/s5W17k4pio40tAZOhOFGjjXkeUaMG07+//4xpQ51yd06VEopfDuEhfSLhi9LIZA3wbA1CHVuReN6aYU+dI3GOcukT300x4YnjKyw1705RP+OrLwoi9gP/fM8+lRMAc/LfsBGEEanv0M5k7JfPIAFXEeJfnR5KDKjfZYKZXaoRNbDIrnu9fLLHguzz4J2B8pRNsJFZgGxh1KLNk859NkGbr40QXXCC8rMz2MJPg37fQl04oYgTBlPUnaEhMS1zkpXysFPe4npSj20+MYaCRlOFUdk/ewB3cf69BeF2EtKD8I1YsXbs3o7NY2Zyh/0DwM/zbeJywusj6cNz8qkj4U1wzAA+gd3z8TOS7rP8oLQOeqBfscPylDJ+LeOhQoxlfh2Qzj6W88ZO8kNDcyRDQBM4ALRuNAOtD1VBAs0ATtjRKL1boUvy4pQUoA3cl/H9czOAuSK6DVot8T4FbN5dQ3zfQLiOaO2UAV/ACE89cFTh5BFcAZgNWXGJne4NGMC14bBzgAKqMKWCyO/YkAuC6kPP8PMTfYHBb39s3zCPEL9ugbB44eY+8iFMoL3DDw9FIRXtMCGRjx2iizLwtB5Qob6P0uVjxIEiLKlNOMEAf9HSv61UwWseCKwnMKdSKTAVvzCiVOJ8kISeuMCYAqa/A1KdE9sNhfGGMcrh0j9pHWuRWc81MUEAF78aI4AyhA1QIV4y3xPfrb8tqC24YS+jjaK9bechZY+essaCzDPSfN/9krCq3kRvZbFmnYISo/2PUUIz157/rTkxAey/4EFgY5HrfLlQVkCR0heRhmAzDfbxPM/obI7AmjLJAT78VYC5/oA/CsFJrSgxsGLag/OQAkyeTdSRKu5m3KPh8TIdUtmj+gLyo9ZgZ6HvfWFRRN2CAUzQWUHt4tQD7d17wX7wlwIoLWmhO97ywTOAqKI6ksJj459RYROdbpFLHUDgRkAKT04AcdHJYtBD+a/mzJBAYfHHLKsOvsLUA/K+qdIcHW3Bad1PsTqzwTJRYuPz6R9cMUZtjaFtzXOikzMgY2nAnzInc/4Ot92XzP7dNaGQLhUxS3ClAsTxCTN4EAacm2NuouhAGk8uw7GCZa1SMWLNJ4GagGGh+W/UjJrTfpKuYl5x6OAUQrvDYQ90XdhxXwxlAAaNJWG28AbPTW9DcUZgrwK5/F4/+L1sQinAesHVch7TX8/lDIfibXJ3fSwhkcJOgnkA39AaoG2RxTCiYuCC6dPgMSF+8MLvQ+HDiRKULn+hK+Lo0+6hv2J6UakfZT/0XI9S/nQPToShICzF0JizZqKrDIuBpoL2tC9wj82TUI4h88C8LmLd0PFMXn0cp4FevD+ebDKCM0Qy/z+QcYMS7I87gGSx3BAvUapQqyIaEBHsj925sUpdKBFiP1xhNqES3SjwjmIC4tlz5HP1zX7NFhGQ81MzHCyTQZJguPLFgSYTsLErQ7W+fOyHwvAsB3OL3MZtZYFJrMjuqh1w4pXDfzJjwvevcpIiQqN9MNGFQvUj9WOuAovvXcFXTOZAgM9PwSrQ7bF/HR7xiY1awVH9JtGRz9isqd//vJnNWZGqfwQyjfAS4bQ+RjGEIb1zNE8Zkn8c8P83PVWxUt9M0UEi63KFAKxujK5l3KfuS9ySnDk+WxLl9A3ici9w/21RMzPdgk1PVgE+kd9isDCgPpUDD2KO4vxT76zY8HxNTZGAU8ltRG0hsKNtWdFcHVBRl31mMV2DpB9fULVSPLGGAnw9PIG0DlJMhaEAA62SzUPnkOx9ax798oOB7MKHXMSRqT248RCNW/E6QsVD9II+Yj4AEJG6gdTveK1H0aFOltyMkGSh5dGH0xYeYEKS8Q4xVp0EfTztZ/GwE+aCSTyjveJ+8nFNMJ6+cIDBzo5woSKzDW5BbYLrU/fj5412/V0BUHBl0jhfNMKXTZQttMEA/OcQoB4x7pniDT28kTnek2J0Lm4cpyALoZvtVvFA/UbDsvOIkqaxBV0Tzvkinz1ugmCzbuLlEL2egAOZ0oTNMhGCzULBdN/unHZg3TIQLeLBSFz0oZIf5AyAcKBuCz0xwRgAMJG0ovKkDELmg9lik1PfPrPhT/40kUvhMHPFk3sSdRDULmjDZuLDIKeC2gLhQ+OPrW/rb+GciPC3Hg/S/i9/nVWhQ2CnEsWwzD5xQuDED3387BPQeO1rfrUxQWyJ7tSvcrAhEHiB7C1+wovN0e1LTcZRXD/t3ItTy47sDfmeY/Hnbqoh5XNC4/P93b/qTH1M+r6Hs0Xih61qMWHgSZHPUtCD+23w3RNtH18AzYqM7W+OLHtfWBFM0JwOkBLyk9fDqjLYAL4iMZ1d8X783o2CrVbBUEBtMdkweaK6vp6Sg12H8rEtH008wKJyuwB6sez/KG8yoJE+cWDUkafAnXKkj9MxkiHtAoqd8y+inVCh6K5x3KocEFGn00rzFOAYXzBwk8IZQJzN8OBFseutJ3Glr7ah+KCAEi5Do0Jbw5vSho1MgYZCGXNmAI/ula+s8WVdTwGTgNpen8v276sy1RP+vemtC5Lvg9iC/+PmTSMhkg6WsokgKMG4I+tNdG2PEUWDbEK4cKvSyD1EcVPd0KEpT2PhZH1P8Y8u+2KNXS8gn9BVTkNzczLnHzoBJb1s4Wr/yGxzsyFDgfOq8pIAktJGU2zCj/160pkAjUKmIHXdetH/o07zdjK7TgvM//3o8TS/bjE3nhlSVECrYoFdLpGrTUtc9yMMU9tg3/xFM39vVLMMIoswYDHB8KMy3TLitACj/IAy0ktSfg1r4U0/HeCGLTUj123hYWYy6LPULRBcAA4O3Oegmt3y0uGz5fyt/r79dnKnEHmB2w1B4WttGB067ePBP9N9gpMA+oOeTlSciuLuU/7tHVGBUIiyTS1BkYNf/8FywvWT+OCjXo7iqJJ+cJpyqf1kLO5wn9Iq33+BUPG6r1xwoj5EHdsRP9NCQzxdR54rA2+fPu238UlDAVPpnipxKQ+uMqetYaFdsm6iYpG0k/JtNXGTnYgivE0unT+tO4GJ/XcDBM1C8W4tVgFx3nS8sIMHE+eC/gPls0fvld0yMX5gbpH6AwHz1GL/s+6egRyQkKWSPiMNY7ctJ3GJjubSiB3p8Sc/VcHu090iKrD2TNUNwJFWgsMj+12sAoJzw/ChbX2BbgHWv4Ti1x9pEFTh3t1unKAQot5JfOMQgME5PF7C7nP+f8j8hTw+zvUdi7E93VMTHa2wsWnxY4JvcJzy0LEkovqxIDygo4p/XT3DwSLDa4KfY8PyV7B6ke/Qu1K9kc5vcyPu8khwUBITT1XchZC+LmuNSlGWAzBjU0DSjYbewmKEUKUCt4+8wX1SzePnnNBggi1sQXEfrIJlDdsROF13UVnwFNyO8aVfcaCxXj4wlTKjIWnjAiChYsgRHfPH3TdRPM9BUXj+Czz8XolBN81vcdsd8tFB8CkMeH6tcT5gjT3B4KKyNe1noXByUxOUbD9fD99IsU6uciyYQfcB6XDbzfo/1exb/nxBNNz2rLoMxOCHbWujEx24Y2NDxWDu3RoRwu0vMJvNdOFtjabg7iLzVAndszFBcGH+eBLHY/PdddFYfYkCfxCqEgk9XECtDuSxOC/7rJFghiKWbO8AgVC6/fs9MhGTHTWBlkB9or6wK3xJ7e2xLx/TIZ7gkdK90vIUCpACb0xu4sIuba5NhfIL8zXPVHFbM7t/9rGyH6AwrQIRciz/f71HcZoC2sQZ/XSi2UBpId19JIGaI8ze/u0gkanfMtKZ0tBD9zDVAzeuJsHEAVuwugyB0Egz3Z7xkCPhvTDAfgdDwk8IQNIzIJDMvqVd1YzxH+0iobCBkgBsrG3FP2gxPR4PcTgi6HQTb8LPnoIPP2LjdxMwUCGPNy1dcVmNzSJTne3M9OMpM2t9MJCswZXxVSCnQi8N44083m+8lV1p8ovta/FW8Jzyvn08vXMw6s68zdWROgCqwqac66B1rcihNIPHbTUQ79CYLKEAO0Co0hLh0H9acvpjtoNHUBWNUzE34Uj8W40r4JDtiPFJv6/RZi8I0UGBNpGqvTLhn7zNgHDygZLdo01Ck81pwUlArk6JXStBn1LYU889XvFeDtqRNa5ibKVgBxyu7YZCtTN8bxtNlV0dzeqhAeCuresP5tyNQF8R+KHSr4+wFYHS79txjuG/P4OvV6EboSqO82F40+7y8xP5fQVNVv1yUE1TP098gfnzRl0NrWHdacFNX6svIS10UdxtxTFJUtsD9JBgQfQTjIKWH5xgAM0+4WMAmoI0YvNz+OCfbmpNRPF3vUlRoEH5YzIAtl6OMGzb9DKvkmpy5tPRTRmMGg3FkVh9JG9S3P2Qn7CDbsDQhAIJcWBhtt+B0WzOhC1PYI2tolB8gfPy6X9ljW5xVIBo4iWwju6h4LZcwVLpZB+y789jcPlDhp1BkZnNz8E5ADKM4o3j0U1dFiDTMCCM2q1rEYn9RtGPMH2Sv8ALznOx45NeLtrhMLEWM8Buz5IbUBWc6M8aQoSC/wQMzWmBQZNxMnOh8EMh8dvh+39t8Uac1+Dhz/vMjq2RHQyeSrySrYgxQezd78ZC6RQKnQOOg+ArXxodkuK6/hohOD9dgSltIJGegJeBtN0xPHPx5OKHnYwRTHLRE/OAIx3EXX4BR69L8StNfd/7bVLuJ4/+bJ3A65O3A52SjNLRhAVAeIHMTyjxPTv1D58wGIK8gbPPbu3SQUey/dPVX/lMncED3t0gqnI8n+5MkwCqsrYdOX9yULFSykL4A+f/1oNhjgcdEXLffLmB629l42JSwS8pAn/+BWKPsuxz8q1ML329TSGEgFeB3O6QDKAR9VL53mXBT+CSTdxf9pyL087s1AyrcDVOCOKHAtdD+9LfU9jtpoJzkF5Rz9N5XzLQpzLC8sEj/rENM7vgqWG2U9X9Qp1vsU5P1Ix1YkgydD9qwSae5HFKQuFz9q9nwV1zi09M/suChHAFXzoS4sPgXsccryLeQ8OdcsFokoWAJ20ngZ1hBuOicK8CzYIf0nNfK/ExUND+kg9xgVGNSvyA8t1D1i/yLGAe9PEG84b/QH9Y8F7wl06GTzEckqCQgjEuzzE4jxMhSrN5YssztgJ6wZwstK1RwUQAoBLOXSbhdCEoU6cfXAFVEfXPc7CyLjyuCDzxPVFzli34gT6Q6YFxo6oSmu224TDNPUGpsQ9+xU08EZXtwgFPT0kij9LVFBhc2RBjIKxegp8egSyglqKdkq6jxsNU8uUttSEvE1gi4EC9YqBQofJDbS7xlv+UfJTCs5PR0M+SwTCcojKR7pNIkinDZY1S82yjSVMTQHbB0d+rr/H9T5Fnotyz14CJ4jBCzLPv4HuiPhDSfnATAcwZ4vdj3/NSwqiTCsKDvdbRUNMAxB0dSrGqgsiz6DCAAiadNlGXMvhfag01Uaag1D3v/zGBWBxT7+/y0JP90PAv0w1fsXUC90QC8vGz9/IfQmbvNXyO0GVhqs1fQYIgo34eEf4jUXMEI9Gs7LCVHlqco8/xfIuN8mEwMIi+qIGZTzgdfqFJUNQOl8Lpn34+QfyjQQ9hguNQQvJjAmQOrVZSLqLuI+oRduBv0dA/dlBx4uVNFfC0rd2BQc/7QqGS/K9lgxqvao1jItVTL8xCbkwst99VbN5h7KNeMuPD6lEUAUscivGSPedChOLc0+MtXr8QEueT5kHAD4yi8XPHzTORlD02MY+CH2I/bvMiia090agDSaKcn3GBbZ580T/A5kGbAG+SLbATEclw/N0KDkjMrV28IiEN0iKaM46Cn/CCXnoR7P93jT1RT01BgUyjdxKdrox8lUwyfwMvP/FBDm/slELItAW9ZCFS0toj0VDz/lnNPwGHDYsCijOeEmQgYH0mfgedDU71sT1QfYLKMK3yxNCj0ifi/0PpUWqvHy0hAZ3vNAFzXGquKY3kvTicd8GwEeGTQHBPMcfO3FJBkn//cREB4ZqQf5HWIhfTZXObUp0CC5Jz04FisHGDbeyTc0Kr/03RRk06kXoBE4F5DVPBQxOYn8pAmHLTvVKBPzy9IZ1/d9FTYKASKW/uQZkSkcOm3TnRQR++/9JM+qCdPfkM/lBwLZABYjwjLVhBpTA38BLulvyYMy6sJcPYck/tOjFwUEftB8HXH1lxqZHZzWABIK6eooM/2cKSblrRSI0j0Z899ozaneRxUzCYIrtC2WP4/p5RQ+7r0bWt840rswY/aPPogpfCDBJwEXKMEbNGMz7dNOGzfXIBT5IVUH3dUGMsvTYRhD1XcUkC1yP1nbyNZYNLP1hh96NJ04ISgpCp0krSXgNzDfh9G+9dMV2jUpMHMbcfenw3D9gQi1H9EO5xgv090X1S31PjH8G/1gDAroAzq28SoHqhy1CY7eICAN+DILaC2OL8M9ujmmz2YlXCZtHBQo2zYwKZ3SjRhA1mQXyg366Y/5RQCRzxEM1QBHzCbW+8161MEYZN1KE4wvYz5SONDLVc6+B1PES/zl1dEXKgjk6hPaNg+6K/g+JzA5+A4fhicjCncrHeCkE4TUaxV30jQaEylaPKQN0RjPMHA9DS+WQJIQq84r1W0Y8vJ1FFHFPOK8LOrGfxjBJ+g2Hi4CFPoknB5X9y4KGyWiHS34OQ4YGYrcGBQeBfMejdT4GMw1Ay9t0doYIekFGDIw4z9PCWLqjR0JOisHxivtPXQk/df3Ko82xypNDJfoXgqvK7QKPCsE2yAUDQkaLuTVDhQ5L/o94htZ9+rZWxjlC+7fjtgxOpQXzRnGLnwirtutEwoJ6OunCXUgagiyIvUsSDzmNEj5/TZaKAkJixyc0uTExvJqE6vl+BR4G98nFybBJmL1ZBZJB5wgbNL8GWTEm/5kG6f3uS+iQF8JXR6AN04ol/ZjFPj0+xOZ8IPLUfKlFDnTdRmHN/cpnNKVx5raaRMX1fEWnRDnO3nXvwdDCmopiCWzOajmP8tQ1igJotQlGEY3GyjfFo/ymgYO1WozYcHKLFNAOwAIyeEJhS31DxU7j/izBCQJviU8zNDqqjhe99DWABVPAObJZjA7PK4PAzdvCq0rDeQyEqE1UzPfIss2egkyLgz74P1U1H/h7DlHKUr/u8nFBr0oNi4uP3n/csnLCnsrOdRGGXLp8RN6CCIktCwMQkgTRRqJ/9nJ7ye9OjLYXSo91tIVEOIC0hHX2DBV9DgWfvoEGOU+Ge4212AVwOj9HZvftM8J1PoToQqE6VLin8RgNTIqGvJMKXXTgBjiBDDRDTFmPJ0GpiD908oZeAwE5O3gQcROMUM9g9QmFafaLRP232/SNi7OQK3UBxnIN+sokAH08ZEd0/aJNi4uGM1aCNIJmSqZHB31w9Sw9l/f9xNX+mTVMgsmI00d1/bwy2kGPdZ+FUXXkxUU4EwUGDe/KO34qCmF0HXmvt39ETfTVBqfE28PYjcwLBL0gROX8mQTkDs6/hfkPMdt8/sl9Qt66EjfWRLh/5fKtxWXwYgHTOxt8SUJ';
  // Off-lattice DLA cluster of 4,200 particles of unit diameter, in order of attachment, int16 (×1/256).
  var DLA_CLUSTER = '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';

  // Decode little-endian signed integers (1 or 2 bytes each) from base64.
  function decode(b64, bytes, scale) {
    var bin = atob(b64), n = bin.length / bytes, out = new Float32Array(n), half = bytes === 1 ? 128 : 32768;
    for (var i = 0; i < n; i++) {
      var v = bytes === 1 ? bin.charCodeAt(i) : bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
      out[i] = (v >= half ? v - 2 * half : v) / scale;
    }
    return out;
  }

  // Cosmic web in the adhesion model: each particle moves along a straight line from its
  // initial position towards its final one as structure forms.
  function cosmicWeb(n) {
    var Q = decode(COSMIC_WEB_Q, 1, 90), X = decode(COSMIC_WEB_X, 2, 16000), m = X.length / 2, t = 0;
    var idx = new Uint16Array(n);
    for (var i = 0; i < n; i++) idx[i] = i < m ? i : (rand() * m) | 0;
    return {
      reset: function () { t = 0; },
      update: function (dt) { t += dt; },
      write: function (xs, ys) {
        var f = 1 - 0.45 * Math.exp(-t / 2.5);       // fraction of the way travelled, from 0.55 to 1
        for (var i = 0; i < n; i++) {
          var j = 2 * idx[i];
          xs[i] = Q[j] + f * (X[j] - Q[j]);
          ys[i] = Q[j + 1] + f * (X[j + 1] - Q[j + 1]);
        }
      }
    };
  }

  // Off-lattice diffusion-limited aggregation: the first n particles of the cluster, slowly rotating.
  function dla(n) {
    var P = decode(DLA_CLUSTER, 2, 256), m = P.length / 2, k = Math.min(n, m), r = 0, i;
    for (i = 0; i < k; i++) r = Math.max(r, Math.sqrt(P[2 * i] * P[2 * i] + P[2 * i + 1] * P[2 * i + 1]));
    var sc = 0.97 / r, px = new Float32Array(n), py = new Float32Array(n), t = 0;
    for (i = 0; i < n; i++) {
      var j = i < m ? i : (rand() * m) | 0;
      px[i] = P[2 * j] * sc; py[i] = P[2 * j + 1] * sc;
    }
    return {
      update: function (dt) { t += dt; },
      write: function (xs, ys) {
        var a = 0.05 * t, c = Math.cos(a), sn = Math.sin(a);
        for (var i = 0; i < n; i++) { xs[i] = px[i] * c - py[i] * sn; ys[i] = px[i] * sn + py[i] * c; }
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
    { key: 'dla', field: 'Statistical physics', name: 'Diffusion-limited aggregation', color: [255, 232, 150], make: dla },
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


  /* ---------------------------------------------------------------- setup */

  {
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

})();
