#!/usr/bin/env python3
"""Generate the precomputed data of two home-page figures (assets/js/figures.js).

- Cosmic web: two-dimensional adhesion model. A Gaussian random potential Phi
  (density -lap Phi with spectrum k^n exp(-k^2/kc^2)) gives the Zel'dovich map
  x = grad(q^2/2 - D Phi); the adhesion model replaces q^2/2 - D Phi by its
  convex hull, computed for 40,000 particles. 4,200 particles landing in the
  window [-1, 1]^2 are kept, with a small scatter that grows with the mass of
  the cluster they belong to.
- Statistical physics: off-lattice diffusion-limited aggregation, 4,200
  particles of unit diameter, in order of attachment.

Prints the three base64 strings to paste into figures.js.
Needs numpy, scipy and matplotlib:  python3 _tools/make_figure_data.py
"""
import base64
import numpy as np
import matplotlib.tri as mtri
from scipy.interpolate import RegularGridInterpolator
from scipy.spatial import ConvexHull, cKDTree

B, G = 1.35, 256                    # half-size of the periodic box, FFT grid
N_KEEP = 4200


def potential(n=-0.5, kc=18.0, seed=31):
    k1 = 2 * np.pi * np.fft.fftfreq(G, d=2 * B / G)
    kx, ky = np.meshgrid(k1, k1, indexing="ij")
    k2 = kx**2 + ky**2
    k2[0, 0] = 1
    rng = np.random.default_rng(seed)
    power = np.sqrt(k2)**n * np.exp(-k2 / kc**2)
    power[0, 0] = 0
    dk = (rng.normal(size=(G, G)) + 1j * rng.normal(size=(G, G))) * np.sqrt(power)
    phi = np.real(np.fft.ifft2(dk / k2))
    gx = np.real(np.fft.ifft2(1j * kx * dk / k2))           # grad Phi
    gy = np.real(np.fft.ifft2(1j * ky * dk / k2))
    dxx = np.real(np.fft.ifft2(-kx * kx * dk / k2))
    dyy = np.real(np.fft.ifft2(-ky * ky * dk / k2))
    dxy = np.real(np.fft.ifft2(-kx * ky * dk / k2))
    lam = 0.5 * (dxx + dyy) + np.sqrt(0.25 * (dxx - dyy)**2 + dxy**2)
    g = np.linspace(-B, B, G, endpoint=False)
    interp = lambda a: RegularGridInterpolator((g, g), a, bounds_error=False, fill_value=None)
    return interp(phi), interp(gx), interp(gy), lam.std()


def cosmic_web(D=2.2, seed=31, m=200):
    phi, gx, gy, s = potential(seed=seed)
    rng = np.random.default_rng(seed + 1000)
    g = (np.arange(m) + 0.5) / m * 2 * B - B
    qx, qy = np.meshgrid(g, g, indexing="ij")
    Q = np.stack([qx.ravel(), qy.ravel()], 1) + rng.uniform(-0.4, 0.4, (m * m, 2)) * (2 * B / m)
    lifted = 0.5 * (Q**2).sum(1) - D / s * phi(Q)
    hull = ConvexHull(np.c_[Q, lifted])
    lower = hull.equations[:, 2] < 0
    eq, simplices = hull.equations[lower], hull.simplices[lower]
    slope_x, slope_y = -eq[:, 0] / eq[:, 2], -eq[:, 1] / eq[:, 2]
    facet = mtri.Triangulation(Q[:, 0], Q[:, 1], triangles=simplices).get_trifinder()(Q[:, 0], Q[:, 1])
    X = Q - D / s * np.stack([gx(Q), gy(Q)], 1)             # Zel'dovich, where the hull touches
    on_hull = np.zeros(len(Q), bool)
    on_hull[np.unique(simplices)] = True
    stuck = (~on_hull) & (facet >= 0)
    X[stuck] = np.c_[slope_x[facet[stuck]], slope_y[facet[stuck]]]
    key = np.round(X * 1e6).astype(np.int64)
    _, inverse, counts = np.unique(key[:, 0] * 10**8 + key[:, 1], return_inverse=True, return_counts=True)
    scatter = np.minimum(0.0022 + 0.0016 * np.sqrt(counts[inverse]), 0.02)
    inside = np.where((np.abs(X) < 1.02).all(1))[0]
    pick = rng.choice(inside, size=N_KEEP, replace=False)
    return Q[pick], X[pick] + rng.normal(size=(N_KEEP, 2)) * scatter[pick, None]


def dla(n=N_KEEP, seed=5):
    rng = np.random.default_rng(seed)
    P = np.zeros((n, 2))
    count, tree, tree_n, rmax = 1, cKDTree(np.zeros((1, 2))), 1, 0.0
    while count < n:
        r0 = rmax + 5.0
        a = rng.uniform(0, 2 * np.pi)
        p = r0 * np.array([np.cos(a), np.sin(a)])
        while True:
            d, j = tree.query(p)
            if count > tree_n:
                dr = np.sqrt(((P[tree_n:count] - p)**2).sum(1))
                k = dr.argmin()
                if dr[k] < d:
                    d, j = dr[k], tree_n + k
            if d <= 1.0:                                     # contact: stick at unit distance
                v = p - P[j]
                P[count] = P[j] + v / np.linalg.norm(v)
                rmax = max(rmax, np.hypot(*P[count]))
                count += 1
                if count - tree_n > 200:
                    tree, tree_n = cKDTree(P[:count]), count
                break
            if np.hypot(*p) > 3 * r0 + 30:                   # wandered off: relaunch
                a = rng.uniform(0, 2 * np.pi)
                p = r0 * np.array([np.cos(a), np.sin(a)])
                continue
            step = max(d - 1.0, 0.35) if d < 2.0 else d - 1.0
            a = rng.uniform(0, 2 * np.pi)
            p = p + step * np.array([np.cos(a), np.sin(a)])
    return P


def b64(a):
    return base64.b64encode(a.tobytes()).decode()


if __name__ == "__main__":
    Q, X = cosmic_web()
    P = dla()
    print("COSMIC_WEB_Q =", b64(np.round(Q * 90).astype(np.int8)))
    print("COSMIC_WEB_X =", b64(np.round(X * 16000).astype("<i2")))
    print("DLA_CLUSTER =", b64(np.round(P * 256).astype("<i2")))
