#!/usr/bin/env python3
"""
Procedural generator for public/models/caravelle-t5.glb
White Volkswagen Caravelle T5 Long-Wheelbase (5.29 m), built from a multi-station
lofted hull (320 stations x 110 ring points, Pchip-smoothed cross sections with
tumblehome, roof crown, swage crease), real cut-out openings (windows, windshield,
sliding door, wheel arches), recessed glass, inner shell, 8-seat interior, wheels.

Axes: +x = nose, +y = up, +z = right side (sliding-door side). Units: metres.
Run:  python3 tools/build_caravelle_glb.py
"""
import os
import numpy as np
import trimesh
from scipy.interpolate import PchipInterpolator
from trimesh.visual.material import PBRMaterial
from trimesh.visual import TextureVisuals

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'models', 'caravelle-t5.glb')

X0, X1 = -2.67, 2.67          # hull ends
N_ST = 320                    # longitudinal stations
M = 56                        # points per half cross-section -> ring = 2M-2 = 78
WHEEL_R = 0.34
AXLE_F, AXLE_R = 1.75, -1.65  # wheelbase 3.40 m
WHEEL_Z = 0.80

# ---------------------------------------------------------------- profiles
top_x = [-2.67, -2.62, -2.52, -2.30, -2.0, -1.0, 0.6, 1.0, 1.3, 1.6, 1.93, 2.12, 2.40, 2.60, 2.67]
top_y = [1.10, 1.38, 1.70, 1.90, 1.96, 1.97, 1.97, 1.93, 1.62, 1.34, 1.10, 1.03, 0.97, 0.88, 0.72]
TOP = PchipInterpolator(top_x, top_y)

bot_x = [-2.67, -2.4, 2.2, 2.67]
bot_y = [0.30, 0.25, 0.25, 0.28]
BOT = PchipInterpolator(bot_x, bot_y)


def smoothstep(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


def half_width(x):
    w0 = 0.94 - 0.06 * smoothstep((x - 1.9) / 0.77) - 0.015 * smoothstep((-x - 2.0) / 0.6)
    r = 0.28
    d = np.minimum(x - X0, X1 - x)
    k = np.clip(1 - d / r, 0, 1)
    rounded = (w0 - r) + r * np.sqrt(np.clip(1 - k * k, 0, 1))
    return np.where(d < r, rounded, w0)


# normalised cross-section (z/w, (y-yb)/h): tumblehome, crown, swage crease
SEC = np.array([
    (0.00, 0.00), (0.78, 0.00), (0.93, 0.025), (0.985, 0.09), (0.995, 0.20),
    (1.012, 0.30), (0.998, 0.36), (0.985, 0.47), (0.965, 0.62), (0.93, 0.77),
    (0.87, 0.895), (0.75, 0.968), (0.55, 0.990), (0.30, 0.997), (0.00, 1.00),
])
_chord = np.r_[0, np.cumsum(np.hypot(*np.diff(SEC, axis=0).T))]
_u = _chord / _chord[-1]
_PZ = PchipInterpolator(_u, SEC[:, 0])
_PY = PchipInterpolator(_u, SEC[:, 1])
_UU = np.linspace(0, 1, M)
SEC_Z = _PZ(_UU)
SEC_Y = _PY(_UU)


def section_right(x):
    """Right half cross-section (z, y) in world coords at station x, bottom -> roof."""
    w = float(half_width(x))
    yb = float(BOT(x))
    h = float(TOP(x)) - yb
    return SEC_Z * w, yb + SEC_Y * h


def surf_z(x, y):
    zs, ys = section_right(x)
    i0 = 2
    ys2 = np.maximum.accumulate(ys[i0:] + np.arange(len(ys[i0:])) * 1e-7)
    return float(np.interp(y, ys2, zs[i0:]))


# ---------------------------------------------------------------- hull
xs = X0 + (X1 - X0) * (1 - np.cos(np.pi * np.linspace(0, 1, N_ST))) / 2
RING = 2 * M - 2
V = np.zeros((N_ST, RING, 3))
for i, x in enumerate(xs):
    zr, yr = section_right(x)
    ring_z = np.r_[zr, -zr[M - 2:0:-1]]
    ring_y = np.r_[yr, yr[M - 2:0:-1]]
    V[i, :, 0] = x
    V[i, :, 1] = ring_y
    V[i, :, 2] = ring_z

verts = V.reshape(-1, 3)
faces = []
for i in range(N_ST - 1):
    for j in range(RING):
        a = i * RING + j
        b = i * RING + (j + 1) % RING
        c = (i + 1) * RING + (j + 1) % RING
        d = (i + 1) * RING + j
        faces.append((a, b, c))
        faces.append((a, c, d))
faces = np.array(faces)

# winding check at roof centre: normal should point +y
tri = verts[faces[len(faces) // 2 + 2 * (M - 2)]]
n = np.cross(tri[1] - tri[0], tri[2] - tri[0])
roof_face = faces[(N_ST // 2) * RING * 2 + 2 * (M - 2)]
tri = verts[roof_face]
n = np.cross(tri[1] - tri[0], tri[2] - tri[0])
if n[1] < 0:
    faces = faces[:, ::-1]

# caps (front/rear) as fans, oriented outward
extra_v, extra_f = [], []
for st, sign in ((0, -1), (N_ST - 1, +1)):
    ring = verts[st * RING:(st + 1) * RING]
    c = ring.mean(axis=0)
    ci = len(verts) + len(extra_v)
    extra_v.append(c)
    for j in range(RING):
        a, b = st * RING + j, st * RING + (j + 1) % RING
        f = (ci, a, b)
        tri = np.array([c, verts[a], verts[b]])
        nn = np.cross(tri[1] - tri[0], tri[2] - tri[0])
        if nn[0] * sign < 0:
            f = (ci, b, a)
        extra_f.append(f)
verts = np.vstack([verts, np.array(extra_v)])
faces = np.vstack([faces, np.array(extra_f)])

hull = trimesh.Trimesh(verts, faces, process=False)
HN = np.array(hull.vertex_normals)
HV = np.array(hull.vertices)
HF = np.array(hull.faces)
CEN = HV[HF].mean(axis=1)  # face centroids
# per-quad centroids so both triangles of a grid quad are cut together (clean, non-serrated edges)
_G = (N_ST - 1) * RING * 2
_q = (CEN[0:_G:2] + CEN[1:_G:2]) / 2
CEN[0:_G:2] = _q
CEN[1:_G:2] = _q
CX, CY, CZ = CEN[:, 0], CEN[:, 1], CEN[:, 2]
AZ = np.abs(CZ)
W = half_width(CX)
TOPC = TOP(CX)


# ---------------------------------------------------------------- predicates
def win_front(m=0.0):
    return (CX > 0.74 - m) & (CX < 1.64 + m) & (CY > 1.04 - m) & (CY < TOPC - 0.10 + m) & (AZ > 0.80 * W)


def win_door(m=0.0):
    return (CX > -0.44 - m) & (CX < 0.47 + m) & (CY > 1.04 - m) & (CY < TOPC - 0.10 + m) & (AZ > 0.80 * W) & (CZ > 0)


def win_rear_q(m=0.0):
    return (CX > -2.38 - m) & (CX < -0.70 + m) & (CY > 1.04 - m) & (CY < TOPC - 0.10 + m) & (AZ > 0.80 * W)


def win_left_mid(m=0.0):
    return (CX > -0.44 - m) & (CX < 0.47 + m) & (CY > 1.04 - m) & (CY < TOPC - 0.10 + m) & (AZ > 0.80 * W) & (CZ < 0)


def win_shield(m=0.0):
    return (CX > 1.12 - m) & (CX < 1.92 + m) & (CY > 1.12 - m) & (AZ < 0.74 * W + m)


def win_back(m=0.0):
    return (CX < -2.50 + m) & (CY > 1.28 - m) & (AZ < 0.60 * W + m) & (CX > -2.70)


def arch(ax, r=0.46):
    return ((CX - ax) ** 2 + (CY - WHEEL_R) ** 2 < r * r) & (AZ > 0.70 * W) & (CY < WHEEL_R + r)


door_region = (CZ > 0) & (CX > -0.50) & (CX < 0.55) & (CY > 0.32) & (CZ > 0.84 * W) & (CY < TOPC - 0.04)
arches = arch(AXLE_F) | arch(AXLE_R)

glass_cab_m = win_front()
glass_door_m = win_door() & door_region
glass_rear_m = win_rear_q() | win_back() | win_left_mid()
shield_m = win_shield()
all_win = glass_cab_m | glass_door_m | glass_rear_m | shield_m

# ---------------------------------------------------------------- helpers


def submesh(mask, offset=0.0, flip=False, name='mesh'):
    idx = np.where(mask)[0]
    f = HF[idx]
    used, inv = np.unique(f, return_inverse=True)
    f2 = inv.reshape(-1, 3)
    vv = HV[used] + HN[used] * offset
    nn = HN[used].copy()
    if flip:
        f2 = f2[:, ::-1]
        nn = -nn
    m = trimesh.Trimesh(vv, f2, process=False, vertex_normals=nn)
    m.metadata['name'] = name
    return m


def material(name, color, metal=0.0, rough=0.5, emissive=None, alpha=None):
    c = [int(round(v * 255)) for v in color] + [255 if alpha is None else int(alpha * 255)]
    return PBRMaterial(
        name=name, baseColorFactor=c, metallicFactor=metal, roughnessFactor=rough,
        emissiveFactor=emissive if emissive else [0, 0, 0],
        alphaMode='BLEND' if alpha is not None else 'OPAQUE', doubleSided=False,
    )


def hexc(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


MATS = {
    'Body': material('PaintWhite', hexc('F4F6F9'), 0.08, 0.24),
    'SlidingDoor': material('PaintWhite', hexc('F4F6F9'), 0.08, 0.24),
    'GlassCab': material('GlassAzure', hexc('1B4965'), 0.2, 0.04, [0.03, 0.15, 0.2], 0.86),
    'GlassDoor': material('GlassAzure', hexc('1B4965'), 0.2, 0.04, [0.03, 0.15, 0.2], 0.86),
    'GlassRear': material('GlassAzure', hexc('1B4965'), 0.2, 0.04, [0.03, 0.15, 0.2], 0.86),
    'Windshield': material('GlassAzure', hexc('1B4965'), 0.2, 0.04, [0.03, 0.15, 0.2], 0.86),
    'Seals': material('Rubber', hexc('0F1115'), 0.1, 0.7),
    'DoorTrim': material('Rubber', hexc('0F1115'), 0.1, 0.7),
    'Trim': material('Rubber', hexc('0F1115'), 0.1, 0.7),
    'TrackRail': material('Rail', hexc('15181D'), 0.3, 0.5),
    'InnerShell': material('Liner', hexc('23272E'), 0.0, 0.9),
    'DoorLiner': material('Liner', hexc('2A2E36'), 0.0, 0.9),
    'Bumpers': material('Charcoal', hexc('1B1D22'), 0.08, 0.65),
    'Grille': material('Black', hexc('07080A'), 0.2, 0.6),
    'Headlights': material('Crystal', hexc('F0F6FF'), 0.0, 0.05, [0.35, 0.4, 0.45], 0.9),
    'DRL': material('DRL', hexc('FFFFFF'), 0.0, 0.2, [1, 1, 1]),
    'Taillights': material('Tail', hexc('B3121B'), 0.0, 0.15, [0.55, 0.03, 0.03]),
    'Mirrors': material('PaintWhite', hexc('F4F6F9'), 0.08, 0.24),
    'MirrorGlass': material('Black', hexc('1A1D22'), 0.6, 0.1),
    'Handles': material('Rubber', hexc('0F1115'), 0.1, 0.6),
    'DoorHandle': material('Rubber', hexc('0F1115'), 0.1, 0.6),
    'Badge': material('Chrome', hexc('E8EDF3'), 1.0, 0.1),
    'Wheels': material('Tire', hexc('15161A'), 0.0, 0.72),
    'Rims': material('Alloy', hexc('C9D1DA'), 0.9, 0.18),
    'Brakes': material('Rotor', hexc('6B7078'), 0.8, 0.4),
    'Calipers': material('Caliper', hexc('C2410C'), 0.2, 0.4),
    'WheelWells': material('WheelWell', hexc('090A0D'), 0.0, 0.95),
    'ArchTrim': material('ArchTrim', hexc('121418'), 0.1, 0.8),
    'CabinSeats': material('Fabric', hexc('2B2F38'), 0.0, 0.85),
    'CabinFloor': material('Carpet', hexc('15171B'), 0.0, 0.95),
    'Dashboard': material('Dash', hexc('1A1C21'), 0.1, 0.7),
}

scene = trimesh.Scene()


def add(name, mesh, transform=None):
    mesh.visual = TextureVisuals(material=MATS[name.split('_')[0]])
    scene.add_geometry(mesh, node_name=name, geom_name=name, transform=transform)


def superellipsoid(size, center, e=0.3, nu=20, nv=36):
    a, b, c = [s / 2 for s in size]
    u = np.linspace(-np.pi / 2, np.pi / 2, nu)
    v = np.linspace(-np.pi, np.pi, nv)
    U, Vv = np.meshgrid(u, v, indexing='ij')

    def sp(t, p):
        return np.sign(t) * np.abs(t) ** p

    x = a * sp(np.cos(U), e) * sp(np.cos(Vv), e)
    z = c * sp(np.cos(U), e) * sp(np.sin(Vv), e)
    y = b * sp(np.sin(U), e)
    pts = np.stack([x, y, z], axis=-1).reshape(-1, 3) + np.array(center)
    f = []
    for i in range(nu - 1):
        for j in range(nv - 1):
            p0 = i * nv + j
            p1 = p0 + 1
            p2 = p0 + nv + 1
            p3 = p0 + nv
            f += [(p0, p1, p2), (p0, p2, p3)]
    m = trimesh.Trimesh(pts, np.array(f), process=True)
    if m.volume < 0:
        m.invert()
    return m


def merge(meshes):
    return trimesh.util.concatenate(meshes)


def ribbon(points, width_dir, width):
    """Quad strip along polyline `points` (n,3), widened along unit vector width_dir."""
    p = np.array(points)
    a = p - width_dir * width / 2
    b = p + width_dir * width / 2
    vv = np.vstack([a, b])
    n = len(p)
    f = []
    for i in range(n - 1):
        f += [(i, n + i, n + i + 1), (i, n + i + 1, i + 1)]
    m = trimesh.Trimesh(vv, np.array(f), process=False)
    return m


def wall_ribbon_v(x, y0, y1, side, width=0.014, eps=0.004):
    ys_ = np.linspace(y0, y1, 24)
    pts = [(x, y, side * (surf_z(x, y) + eps)) for y in ys_]
    r = ribbon(pts, np.array([1.0, 0, 0]), width)
    return r


def wall_ribbon_h(y, x0, x1, side, width=0.014, eps=0.004):
    xs_ = np.linspace(x0, x1, 40)
    pts = [(x, y, side * (surf_z(x, y) + eps)) for x in xs_]
    return ribbon(pts, np.array([0, 1.0, 0]), width)


def fix_ribbon(m):
    m.fix_normals()
    return m


# ---------------------------------------------------------------- body & openings
body_mask = ~(all_win | door_region | arches)
body = submesh(body_mask, 0.0, name='Body')
add('Body', body)

door_skin = submesh(door_region & ~glass_door_m, 0.0, name='SlidingDoor')
add('SlidingDoor', door_skin)
add('DoorLiner', submesh(door_region & ~glass_door_m, -0.05, flip=True, name='DoorLiner'))

add('GlassCab', submesh(glass_cab_m, -0.014, name='GlassCab'))
add('GlassDoor', submesh(glass_door_m, -0.014, name='GlassDoor'))
add('GlassRear', submesh(glass_rear_m, -0.014, name='GlassRear'))
add('Windshield', submesh(shield_m, -0.014, name='Windshield'))

# rubber seals = dilated window ring, proud of the paint
ring_seal = (
    (win_front(0.045) & ~win_front())
    | (win_rear_q(0.045) & ~win_rear_q())
    | (win_left_mid(0.045) & ~win_left_mid())
    | (win_shield(0.05) & ~win_shield())
    | (win_back(0.05) & ~win_back())
)
door_seal = (win_door(0.045) & ~win_door()) & (CZ > 0) & (CX > -0.50) & (CX < 0.55) & ~ring_seal
add('Seals', submesh(ring_seal & ~(CZ > 0.84 * W) | (ring_seal & (CX < -0.5) | ring_seal & (CX > 0.56)), 0.006, name='Seals'))
add('DoorTrim', submesh(door_seal | (ring_seal & (CZ > 0.84 * W) & (CX >= -0.50) & (CX <= 0.55)), 0.006, name='DoorTrim'))

# inner shell (visible through windows and the open sliding-door aperture)
inner_mask = ~(all_win | door_region | arches | (ring_seal & False))
add('InnerShell', submesh(~(all_win | door_region | arches), -0.06, flip=True, name='InnerShell'))

# door seams, sliding-door track groove, swage detail
trims = []
for side in (1, -1):
    for xseam in (0.60, -0.51):
        trims.append(wall_ribbon_v(xseam, 0.36, 1.82, side, 0.013))
    trims.append(wall_ribbon_h(0.34, -2.2, 2.0, side, 0.012))
for m in trims:
    m.fix_normals()
add('Trim', merge(trims))

rail = wall_ribbon_h(0.50, -2.15, -0.52, 1, 0.045, 0.006)
rail2 = wall_ribbon_h(0.50, -0.52, 0.56, 1, 0.045, -0.02)
rail.fix_normals()
add('TrackRail', rail)

# ---------------------------------------------------------------- wheel arches
arch_trims, wells = [], []
for ax in (AXLE_F, AXLE_R):
    for side in (1, -1):
        th = np.linspace(-0.15, np.pi + 0.15, 56)
        pts = []
        for t in th:
            x = ax + 0.40 * np.cos(t)
            y = WHEEL_R + 0.40 * np.sin(t)
            pts.append((x, y, side * (surf_z(x, y) + 0.012)))
        # flared lip: tube-like ribbon (wide in z) so it reads as plastic arch trim
        r1 = ribbon(pts, np.array([0, 0, 1.0]) * side, 0.0)
        pts_in = [(p[0], p[1], p[2] - side * 0.03) for p in pts]
        n_ = len(pts)
        vv = np.array(pts_in + pts)
        # lip is a thin band offset radially outward
        lip_out = []
        for t in th:
            x = ax + 0.57 * np.cos(t)
            y = WHEEL_R + 0.57 * np.sin(t)
            lip_out.append((x, y, side * (surf_z(x, y) + 0.012)))
        vv = np.array(pts + lip_out)
        f = []
        for i in range(n_ - 1):
            f += [(i, n_ + i, n_ + i + 1), (i, n_ + i + 1, i + 1)]
        f = np.array(f)
        m = trimesh.Trimesh(vv, f, process=False)
        m.fix_normals()
        arch_trims.append(m)
        # wheel-well liner: half tube, normals pointing to the axle
        ang = np.linspace(0, np.pi, 40)
        zs_ = np.linspace(0.30, 0.90, 6) * side
        P, Fc = [], []
        for zz in zs_:
            for a in ang:
                P.append((ax + 0.50 * np.cos(a), WHEEL_R + 0.50 * np.sin(a), zz))
        P = np.array(P)
        for iz in range(len(zs_) - 1):
            for ia in range(len(ang) - 1):
                p0 = iz * len(ang) + ia
                p1 = p0 + 1
                p2 = p0 + len(ang) + 1
                p3 = p0 + len(ang)
                Fc += [(p0, p1, p2), (p0, p2, p3)]
        wm = trimesh.Trimesh(P, np.array(Fc), process=False)
        # make inward-facing (toward axle): check a face normal vs radial direction
        fn = wm.face_normals[len(Fc) // 2]
        fc = wm.triangles_center[len(Fc) // 2]
        rad = np.array([fc[0] - ax, fc[1] - WHEEL_R, 0])
        if np.dot(fn, rad) > 0:
            wm.invert()
        wells.append(wm)
add('ArchTrim', merge(arch_trims))
add('WheelWells', merge(wells))

# ---------------------------------------------------------------- bumpers, lights, mirrors
add('Bumpers', merge([
    superellipsoid((0.40, 0.44, 1.74), (2.55, 0.50, 0), 0.22),
    superellipsoid((0.34, 0.34, 1.80), (-2.64, 0.46, 0), 0.22),
]))
add('Grille', merge([
    superellipsoid((0.06, 0.14, 0.92), (2.74, 0.40, 0), 0.25),
    superellipsoid((0.06, 0.10, 0.20), (2.72, 0.40, 0.70), 0.25),
    superellipsoid((0.06, 0.10, 0.20), (2.72, 0.40, -0.70), 0.25),
    superellipsoid((0.04, 0.05, 0.36), (2.70, 0.65, 0), 0.25),
]))
hl, drl = [], []
for s in (1, -1):
    hl.append(superellipsoid((0.30, 0.17, 0.34), (2.46, 0.82, s * 0.62), 0.35))
    drl.append(superellipsoid((0.04, 0.025, 0.24), (2.60, 0.90, s * 0.62), 0.3))
add('Headlights', merge(hl))
add('DRL', merge(drl))
tl = []
for s in (1, -1):
    tl.append(superellipsoid((0.10, 0.52, 0.15), (-2.60, 1.18, s * 0.80), 0.35))
    tl.append(superellipsoid((0.08, 0.09, 0.14), (-2.66, 0.72, s * 0.80), 0.3))
add('Taillights', merge(tl))
mir, mg = [], []
for s in (1, -1):
    mir.append(superellipsoid((0.12, 0.17, 0.19), (1.74, 1.20, s * 1.07), 0.35))
    mir.append(superellipsoid((0.05, 0.05, 0.16), (1.74, 1.10, s * 0.97), 0.4))
    mg.append(superellipsoid((0.01, 0.14, 0.16), (1.805, 1.20, s * 1.07), 0.3))
add('Mirrors', merge(mir))
add('MirrorGlass', merge(mg))
add('Badge', trimesh.creation.cylinder(radius=0.05, height=0.012, transform=trimesh.transformations.compose_matrix(
    angles=(0, 0, np.pi / 2), translate=(2.745, 0.80, 0))))

hd = []
for s in (1, -1):
    hd.append(superellipsoid((0.16, 0.03, 0.03), (1.06, 1.10, s * (surf_z(1.06, 1.10) + 0.018)), 0.35))
    hd.append(superellipsoid((0.16, 0.03, 0.03), (-1.45, 1.10, s * (surf_z(-1.45, 1.10) + 0.018)), 0.35)) if s < 0 else None
add('Handles', merge([m for m in hd if m is not None]))
add('DoorHandle', superellipsoid((0.16, 0.03, 0.03), (0.28, 1.10, surf_z(0.28, 1.10) + 0.020), 0.35))

# ---------------------------------------------------------------- wheels
TY = trimesh.transformations


def make_wheel_parts():
    prof = []
    ro, ri, hw, cr = WHEEL_R, 0.19, 0.108, 0.05
    # rounded-rectangle tyre section (r, z), ordered around the loop
    pts = [(ri, -hw + 0.01), (ri + 0.01, -hw)]
    for a in np.linspace(-np.pi / 2, 0, 6):
        pts.append((ro - cr + cr * np.cos(a) * 0 + cr * (1 + np.sin(a)) - cr + (ro - ro), 0))
    pts = []
    # build closed loop explicitly
    loop = []
    loop.append((ri, -hw))
    loop.append((ro - cr, -hw))
    for a in np.linspace(-np.pi / 2, 0, 7)[1:]:
        loop.append((ro - cr + cr * np.cos(a), -hw + cr + cr * np.sin(a)))
    loop.append((ro, hw - cr))
    for a in np.linspace(0, np.pi / 2, 7)[1:]:
        loop.append((ro - cr + cr * np.cos(a), hw - cr + cr * np.sin(a)))
    loop.append((ri, hw))
    loop.append((ri, -hw))
    tire = trimesh.creation.revolve(np.array(loop), sections=64)
    tire.merge_vertices()
    # rim barrel
    barrel = trimesh.creation.revolve(
        np.array([(0.17, -0.09), (0.20, -0.09), (0.20, 0.095), (0.185, 0.095), (0.17, 0.0), (0.17, -0.09)]),
        sections=48)
    barrel.merge_vertices()
    disc = trimesh.creation.cylinder(radius=0.17, height=0.012, sections=40,
                                      transform=TY.translation_matrix((0, 0, 0.05)))
    spokes = []
    for k in range(5):
        ang = np.pi / 2 + k * 2 * np.pi / 5
        b = trimesh.creation.box(extents=(0.17, 0.05, 0.022))
        b.apply_translation((0.095, 0, 0))
        b.apply_transform(TY.rotation_matrix(ang, (0, 0, 1)))
        b.apply_translation((0, 0, 0.082))
        spokes.append(b)
    hub = trimesh.creation.cylinder(radius=0.05, height=0.03, sections=32,
                                    transform=TY.translation_matrix((0, 0, 0.095)))
    rim = merge([barrel, disc, hub] + spokes)
    rotor = trimesh.creation.cylinder(radius=0.145, height=0.018, sections=48,
                                      transform=TY.translation_matrix((0, 0, 0.012)))
    caliper = superellipsoid((0.07, 0.11, 0.05), (0.0, 0.09, 0.045), 0.3)
    return tire, rim, rotor, caliper


tire0, rim0, rotor0, cal0 = make_wheel_parts()
for name, ax, side in (('FR', AXLE_F, 1), ('FL', AXLE_F, -1), ('RR', AXLE_R, 1), ('RL', AXLE_R, -1)):
    flip = TY.rotation_matrix(np.pi, (0, 1, 0)) if side < 0 else np.eye(4)
    T = TY.translation_matrix((ax, WHEEL_R, side * WHEEL_Z))
    for nm, g in (('Wheels', tire0), ('Rims', rim0), ('Brakes', rotor0), ('Calipers', cal0)):
        gm = g.copy()
        gm.apply_transform(flip)
        add(f'{nm}_{name}', gm, T)

# ---------------------------------------------------------------- interior
seats = []
seat_defs = {
    'Conducente': (1.25, -0.50), 'F1': (1.25, 0.12), 'F2': (1.25, 0.58),
    'M1': (0.10, -0.60), 'M2': (0.10, 0.0), 'M3': (0.10, 0.60),
    'R1': (-1.15, -0.60), 'R2': (-1.15, 0.0), 'R3': (-1.15, 0.60),
}
for sid, (sx, sz) in seat_defs.items():
    seats.append(superellipsoid((0.50, 0.12, 0.50), (sx, 0.56, sz), 0.35))           # cushion
    back = superellipsoid((0.11, 0.58, 0.50), (sx - 0.24, 0.90, sz), 0.35)           # backrest
    back.apply_transform(TY.rotation_matrix(0.14, (0, 0, 1)))
    seats.append(back)
    seats.append(superellipsoid((0.09, 0.15, 0.30), (sx - 0.29, 1.30, sz), 0.4))      # headrest
    seats.append(superellipsoid((0.30, 0.34, 0.10), (sx, 0.40, sz), 0.4))             # pedestal
add('CabinSeats', merge(seats))
add('CabinFloor', trimesh.creation.box(extents=(4.4, 0.03, 1.62), transform=TY.translation_matrix((-0.35, 0.28, 0))))
dash = [
    superellipsoid((0.46, 0.30, 1.58), (1.78, 0.92, 0), 0.3),
]
wheel_ring = trimesh.creation.torus(0.19, 0.016, major_sections=36, minor_sections=10)
wheel_ring.apply_transform(TY.rotation_matrix(np.pi / 2, (0, 1, 0)))
wheel_ring.apply_transform(TY.rotation_matrix(-0.5, (0, 0, 1)))
wheel_ring.apply_translation((1.52, 1.12, -0.50))
dash.append(wheel_ring)
add('Dashboard', merge(dash))

os.makedirs(os.path.dirname(OUT), exist_ok=True)
data = scene.export(file_type='glb')
with open(OUT, 'wb') as fh:
    fh.write(data)
print('wrote', os.path.abspath(OUT), len(data) // 1024, 'KB; geometries:', len(scene.geometry))
print('hull faces', len(HF), 'verts', len(HV), 'stations', N_ST, 'ring', RING)
