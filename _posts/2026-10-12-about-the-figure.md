---
title: How the figure on our home page is made
author: The organisers
excerpt: Nine figures from across physics, each drawn as a cloud of points that emerges from Gaussian noise. What is shown, and how it is computed.
math: true
figures: true
---
The animation on our home page shows nine figures from different areas of physics. Each is a cloud of a few thousand points that emerges from Gaussian noise, stays for a few seconds while following its own dynamics, and dissolves back into noise before the next one appears. Below, each figure is shown on its own, with what it represents and how it is computed; the button *From noise* replays its emergence.

## From noise to figure

The emergence mimics how diffusion models generate images. A diffusion model is trained on data progressively corrupted by Gaussian noise: in the variance-preserving form, a data point $$x_0$$ becomes

$$
x_t = \alpha_t\, x_0 + \sigma_t\, \varepsilon, \qquad \varepsilon \sim \mathcal{N}(0, \mathbb{1}), \qquad \alpha_t^2 + \sigma_t^2 = 1,
$$

with $$\alpha_t$$ decreasing from 1 to 0 as $$t$$ goes from 0 to 1. This is the law at time $$t$$ of an Ornstein–Uhlenbeck process — overdamped Langevin dynamics in a harmonic potential — started from $$x_0$$. A neural network then learns the score $$\nabla_x \log p_t(x)$$ of the noisy distributions, which makes it possible to run the process backwards and generate new samples from pure noise. Diffusion models were introduced with ideas from non-equilibrium thermodynamics (Sohl-Dickstein et al., 2015).

The animation does not use a trained network. Each point has a position $$x_0$$ in the current figure and a noise vector $$\varepsilon$$ with independent Gaussian components of standard deviation 0.42 (the figures fill the square $$[-1, 1]^2$$), and is drawn at $$x_t$$ with $$\alpha_t = \cos(\pi t/2)$$ and $$\sigma_t = \sin(\pi t/2)$$. The time $$t$$ goes from 1 to 0 in 2.6 s (emergence), stays at 0 for 4.8 s, and returns to 1 in 1.8 s (dissolution), with a smooth time profile. The noise vectors are redrawn while a figure is fully formed, so that each transition uses fresh noise, and the same noise links the dissolution of one figure to the emergence of the next. In other words, the points follow the noising paths on which diffusion models are trained, played backwards, rather than the trajectories of a trained generative model.

## The nine figures

### Astrophysics — spiral galaxy

<div class="figure-panel" data-figure-panel="galaxy"></div>

A two-armed spiral galaxy. Seventy per cent of the stars are scattered around the logarithmic spirals $$\theta = \theta_0 + \cot\psi\, \ln(r/r_0),$$ with pitch angle $$\psi = 0.36$$ rad (21°), $$r_0 = 0.09$$ and $$\theta_0 = 0, \pi$$; the angular scatter grows with radius. A further 18% form a Gaussian bulge and 12% a uniform disc. The disc is seen at an inclination $$\cos i = 0.62$$ and rotates rigidly, with trailing arms.

### Quantum mechanics — hydrogen 3d orbital

<div class="figure-panel" data-figure-panel="orbital"></div>

The probability density of the electron of hydrogen in the $$3d_{z^2}$$ state ($$n = 3$$, $$\ell = 2$$, $$m = 0$$), in a plane containing the $$z$$ axis (vertical):

$$
|\psi_{320}|^2 \propto r^4\, e^{-2r/3a_0} \left(3\cos^2\theta - 1\right)^2 .
$$

Points are drawn by rejection sampling in the square $$\lvert x\rvert, \lvert z\rvert \le 20\,a_0$$, and 12% of them are redrawn every second, like repeated position measurements. The dark diagonal lines are the nodal cones $$\cos^2\theta = 1/3$$.

### Optics — double-slit interference

<div class="figure-panel" data-figure-panel="interference"></div>

Impacts on a screen behind two slits, distributed according to the Fraunhofer intensity

$$
I(x) \propto \cos^2\!\left(\frac{\pi x}{\Delta}\right) \mathrm{sinc}^2\!\left(\frac{\pi x}{5\Delta}\right), \qquad \mathrm{sinc}\, u = \frac{\sin u}{u},
$$

with fringe spacing $$\Delta = 0.17$$, i.e. a slit separation five times the slit width. The vertical position is uniform. As for the orbital, 12% of the impacts are renewed every second, like individual detection events.

### Particle physics — e⁺e⁻ → μ⁺μ⁻

<div class="figure-panel" data-figure-panel="feynman"></div>

The lowest-order QED diagram for electron–positron annihilation into a muon pair: the incoming electron and positron (left) annihilate into a virtual photon (wavy line), which produces the outgoing muon and antimuon (right). Time runs from left to right, and the points flow along the lines in that direction.

### Electromagnetism — magnetic dipole

<div class="figure-panel" data-figure-panel="dipole"></div>

Field lines of a magnetic dipole, $$r = L \sin^2\theta$$ with $$\theta$$ measured from the dipole axis, for seven values of $$L$$ between 0.2 and 1.32 (arbitrary units). The bar magnet at the centre has its north pole up; outside it, the points flow along the field lines from north to south.

### Condensed matter — phonon in graphene

<div class="figure-panel" data-figure-panel="graphene"></div>

The honeycomb lattice of graphene, with carbon atoms at the vertices and bonds as lines, traversed by a longitudinal acoustic phonon: the atom at equilibrium position $$\mathbf{R}$$ is displaced by

$$
\mathbf{u}(\mathbf{R}, t) = A\, \hat{\mathbf{k}} \sin(\mathbf{k} \cdot \mathbf{R} - \omega t),
$$

parallel to the wave vector (longitudinal) and identical on the two sublattices (acoustic). The amplitude is 20% of the bond length and the wavelength about seven bond lengths.

### Nonlinear dynamics — Lorenz attractor

<div class="figure-panel" data-figure-panel="lorenz"></div>

Points carried by the flow of the Lorenz system

$$
\dot x = \sigma (y - x), \qquad \dot y = x (\rho - z) - y, \qquad \dot z = x y - \beta z,
$$

with $$\sigma = 10$$, $$\rho = 28$$ and $$\beta = 8/3$$. A trajectory of 20,000 fourth-order Runge–Kutta steps ($$\delta t = 0.005$$, after a transient) is computed once; the points are spread along it and advance by 0.55 time units per second. The attractor is projected on the plane spanned by $$z$$ and $$(x + y)/\sqrt{2}$$, with a slow sway, so that the two lobes and the holes around the unstable fixed points are visible.

### Cosmology — cosmic web

<div class="figure-panel" data-figure-panel="cosmic-web"></div>

A toy model of the large-scale structure of the Universe. Points start uniformly distributed and move part of the way towards the edges (about 65%) or the vertices (about 35%) of a Voronoi tessellation built on 34 random seeds, the analogues of filaments and clusters. The fraction of the way travelled grows from 0.6 to 0.98 over nine seconds, mimicking gravitational collapse. Voronoi models of the cosmic web go back to Icke and van de Weygaert (1987).

### Biophysics — DNA double helix

<div class="figure-panel" data-figure-panel="dna"></div>

The DNA double helix: two backbones winding 2.2 turns around a common axis, offset in phase by $$0.75\pi$$ so that the major and minor grooves differ, and joined by base pairs at 10 per turn, close to the 10.5 of B-DNA. The helix rotates about its axis.

## References

- J. Sohl-Dickstein, E. Weiss, N. Maheswaranathan and S. Ganguli, *Deep unsupervised learning using nonequilibrium thermodynamics*, ICML (2015).
- J. Ho, A. Jain and P. Abbeel, *Denoising diffusion probabilistic models*, NeurIPS (2020).
- Y. Song, J. Sohl-Dickstein, D. P. Kingma, A. Kumar, S. Ermon and B. Poole, *Score-based generative modeling through stochastic differential equations*, ICLR (2021).
- V. Icke and R. van de Weygaert, *Fragmenting the universe*, Astron. Astrophys. **184**, 16 (1987).
