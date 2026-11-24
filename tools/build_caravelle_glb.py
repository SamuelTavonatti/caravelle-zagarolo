#!/usr/bin/env python3
"""
High-precision procedural generator for public/models/caravelle-t5.glb
White 2008 Volkswagen Caravelle T5 Long-Wheelbase (5.26 m).

Uses exact 2D Shapely polygons + mapbox-earcut triangulation for the side
panels, window cutouts, sliding door aperture, and semi-circular wheel arches,
combined with smooth multi-layer beveled lofting and automotive tumblehome
so there are ZERO jagged steps, ZERO sawtooth window edges, and ZERO thick
protruding black wheel-arch rings.

Axes: +X = nose (right in hero view), +Y = up, +Z = right side (sliding door).
Units: metres.
"""
import os
import numpy as np
import trimesh
from shapely.geometry import Polygon, box
from shapely.ops import unary_union
from trimesh.visual import TextureVisuals
from trimesh.visual.material import PBRMaterial

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'models', 'caravelle-t5.glb')
TY = trimesh.transformations

# Exact VW Caravelle T5 LWB dimensions (metres)
HALF_W = 0.94
WHEEL_R = 0.355
ARCH_R = 0.432
AXLE_R = -1.72
AXLE_F = 1.70
WHEEL_Z = 0.815
SILL_Y = 0.285
BELT_Y = 1.06
WIN_TOP_Y = 1.815
ROOF_Y = 1.945

# Sliding door opening on right side (+Z)
DOOR_X0, DOOR_X1 = -0.70, 0.50
DOOR_Y0, DOOR_Y1 = 0.295, 1.875


def hexc(h: str):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]


def make_mat(name, hex_color, metal=0.0, rough=0.5, emissive=None, alpha=None):
    c = [int(round(v * 255)) for v in hexc(hex_color)] + [255 if alpha is None else int(round(alpha * 255))]
    return PBRMaterial(
        name=name,
        baseColorFactor=c,
        metallicFactor=metal,
        roughnessFactor=rough,
        emissiveFactor=emissive or [0, 0, 0],
        alphaMode='BLEND' if alpha is not None else 'OPAQUE',
        doubleSided=False,
    )


MATS = {
    'Body': make_mat('PaintWhite', 'F4F6F9', 0.08, 0.24),
    'SlidingDoor': make_mat('PaintWhite', 'F4F6F9', 0.08, 0.24),
    'GlassCab': make_mat('GlassAzure', '1E4E79', 0.18, 0.04, [0.02, 0.12, 0.18], 0.62),
    'GlassDoor': make_mat('GlassAzure', '1E4E79', 0.18, 0.04, [0.02, 0.12, 0.18], 0.62),
    'GlassRear': make_mat('GlassAzure', '1E4E79', 0.18, 0.04, [0.02, 0.12, 0.18], 0.62),
    'Windshield': make_mat('GlassAzure', '1E4E79', 0.18, 0.04, [0.02, 0.12, 0.18], 0.66),
    'Seals': make_mat('Rubber', '111318', 0.08, 0.68),
    'DoorTrim': make_mat('Rubber', '111318', 0.08, 0.68),
    'Trim': make_mat('Seam', '1A1D24', 0.10, 0.65),
    'TrackRail': make_mat('Rail', '14171D', 0.28, 0.48),
    'InnerShell': make_mat('Liner', '1B1F27', 0.0, 0.90),
    'DoorLiner': make_mat('Liner', '22262F', 0.0, 0.88),
    'Bumpers': make_mat('Charcoal', '1E2025', 0.06, 0.65),
    'Grille': make_mat('Grille', '0D0F13', 0.15, 0.60),
    'Headlights': make_mat('Crystal', 'DCE6F2', 0.15, 0.06, [0.22, 0.26, 0.30], 0.88),
    'HeadlightHousing': make_mat('HLHousing', '1E222B', 0.35, 0.35),
    'DRL': make_mat('DRL', 'FFFFFF', 0.0, 0.15, [1.0, 1.0, 1.0]),
    'Taillights': make_mat('Tail', 'B91C1C', 0.08, 0.16, [0.45, 0.02, 0.02]),
    'Repeater': make_mat('Repeater', 'CBD5E1', 0.5, 0.25),
    'Mirrors': make_mat('Mirror', '1A1D23', 0.08, 0.58),
    'MirrorGlass': make_mat('MGlass', '2B303A', 0.7, 0.1),
    'Handles': make_mat('Handle', '111318', 0.08, 0.55),
    'DoorHandle': make_mat('Handle', '111318', 0.08, 0.55),
    'Badge': make_mat('Chrome', 'E8EDF3', 0.95, 0.12),
    'Wheels': make_mat('Tire', '141619', 0.0, 0.76),
    'Rims': make_mat('Alloy', 'D6DEE8', 0.88, 0.20),
    'RimDark': make_mat('RimBarrel', '1B1F26', 0.4, 0.55),
    'Brakes': make_mat('Rotor', '5A606A', 0.80, 0.38),
    'Calipers': make_mat('Caliper', '3F4550', 0.35, 0.45),
    'WheelWells': make_mat('WheelWell', '090A0D', 0.0, 0.96),
    'CabinSeats': make_mat('SeatFabric', '3A414E', 0.0, 0.82),
    'Headrests': make_mat('Headrest', '7B8798', 0.0, 0.78),
    'CabinFloor': make_mat('Carpet', '121418', 0.0, 0.95),
    'Dashboard': make_mat('Dash', '1B1E24', 0.10, 0.72),
}


def cubic_bezier(p0, p1, p2, p3, n=18):
    t = np.linspace(0, 1, n)[:, None]
    pts = (
        ((1 - t) ** 3) * np.array(p0)
        + 3 * ((1 - t) ** 2) * t * np.array(p1)
        + 3 * (1 - t) * (t ** 2) * np.array(p2)
        + (t ** 3) * np.array(p3)
    )
    return [tuple(p) for p in pts]


def rounded_rect_poly(x0, y0, x1, y1, r=0.04, segs=8):
    return box(x0, y0, x1, y1).buffer(-r, join_style=2).buffer(r, quad_segs=segs)


def build_side_silhouette() -> Polygon:
    """Exact 2D side silhouette of the VW Caravelle T5 LWB (counter-clockwise)."""
    pts = []
    # Rear bottom corner -> gently forward-tilted tailgate -> crisp rounded D-pillar corner
    pts.append((-2.54, SILL_Y + 0.04))
    pts += cubic_bezier((-2.54, SILL_Y + 0.04), (-2.57, 0.65), (-2.53, 1.38), (-2.42, 1.84), 20)[1:]
    # Rounded rear roof corner (tight, clean T5 corner)
    pts += cubic_bezier((-2.42, 1.84), (-2.39, 1.93), (-2.31, ROOF_Y), (-2.18, ROOF_Y), 12)[1:]
    # Flat horizontal roofline to A-pillar top
    for x in np.linspace(-2.10, 0.82, 24):
        pts.append((float(x), ROOF_Y))
    # Smooth A-pillar roof transition -> 42 deg raked windshield
    pts += cubic_bezier((0.82, ROOF_Y), (1.00, ROOF_Y), (1.10, 1.91), (1.20, 1.80), 12)[1:]
    pts += cubic_bezier((1.20, 1.80), (1.42, 1.56), (1.60, 1.34), (1.76, 1.18), 16)[1:]
    # Short sculpted white hood
    pts += cubic_bezier((1.76, 1.18), (1.84, 1.13), (2.06, 1.07), (2.36, 0.98), 16)[1:]
    # Front nose & white body-colored front bumper (matching reference render)
    pts += cubic_bezier((2.36, 0.98), (2.52, 0.92), (2.59, 0.80), (2.63, 0.62), 14)[1:]
    pts += cubic_bezier((2.63, 0.62), (2.65, 0.45), (2.62, 0.31), (2.46, SILL_Y), 14)[1:]
    # Flat lower rocker sill back to rear
    pts.append((-2.54, SILL_Y + 0.04))

    poly = Polygon(pts).buffer(0)

    # Subtract exact smooth semi-circular wheel arches (48 segments each)
    for ax in (AXLE_R, AXLE_F):
        ang = np.linspace(0, np.pi, 48)
        arch_pts = [(ax + ARCH_R * np.cos(a), WHEEL_R + ARCH_R * np.sin(a)) for a in ang]
        arch_pts += [(ax - ARCH_R, -0.2), (ax + ARCH_R, -0.2)]
        poly = poly.difference(Polygon(arch_pts))

    return poly


def build_window_polygons():
    """Exact smooth-edged window polygons (cab, sliding door, rear quarter)."""
    # Rear quarter window
    win_rear = rounded_rect_poly(-2.22, BELT_Y, -0.78, WIN_TOP_Y, r=0.045, segs=8)
    # Middle sliding door window
    win_door = rounded_rect_poly(-0.62, BELT_Y, 0.42, WIN_TOP_Y, r=0.045, segs=8)
    # Front cab window following exact 42 deg A-pillar slope (ZERO jagged steps!)
    cab_pts = [
        (0.58, BELT_Y),
        (1.62, BELT_Y),
        (1.64, 1.10),
        (1.58, 1.18),
        (1.13, 1.72),
        (1.03, 1.80),
        (0.58, WIN_TOP_Y),
    ]
    win_cab = Polygon(cab_pts).buffer(-0.035, join_style=2).buffer(0.035, quad_segs=8)
    return win_rear, win_door, win_cab


def apply_automotive_sculpt(verts: np.ndarray) -> np.ndarray:
    """
    Smoothly sculpts genuine VW T5 3D automotive curvature onto any (x, y, z) mesh:
    - Tumblehome: upper cabin walls curve gently inward above beltline
    - Roof crown: subtle transverse arch across roof width
    - Nose & tail plan-view taper: rounded front bumper and rear corners
    """
    v = verts.copy()
    x, y, z = v[:, 0], v[:, 1], v[:, 2]
    az = np.abs(z)
    sign_z = np.sign(z)

    # 1. Tumblehome above beltline (smooth cubic ramp)
    t_up = np.clip((y - BELT_Y) / (ROOF_Y - BELT_Y), 0.0, 1.0)
    tumble = 0.095 * (t_up ** 1.75)

    # 2. Plan-view front nose taper (x > 2.08) & subtle rear taper (x < -2.25)
    t_front = np.clip((x - 2.08) / (2.65 - 2.08), 0.0, 1.0)
    t_rear = np.clip((-x - 2.25) / (2.58 - 2.25), 0.0, 1.0)
    plan_taper = 0.13 * (t_front ** 2.0) + 0.05 * (t_rear ** 2.0)

    # 3. Subtle lower rocker tuck below y = 0.36
    t_low = np.clip((0.36 - y) / (0.36 - SILL_Y), 0.0, 1.0)
    rocker_tuck = 0.028 * (t_low ** 1.8)

    scale_z = np.clip(1.0 - (tumble + plan_taper + rocker_tuck) / HALF_W, 0.55, 1.0)
    v[:, 2] = z * scale_z

    # 4. Gentle roof crown near top
    z_norm = np.clip(az / HALF_W, 0.0, 1.0)
    roof_blend = np.clip((y - 1.74) / (ROOF_Y - 1.74), 0.0, 1.0)
    v[:, 1] = y + 0.022 * (1.0 - z_norm ** 2) * (roof_blend ** 1.5)

    # 5. Front nose slight plan-view bow (center sticks slightly further +x than corners)
    nose_bow = np.clip((x - 2.15) / 0.50, 0.0, 1.0)
    v[:, 0] = x - 0.075 * (z_norm ** 2.2) * nose_bow

    # 6. Rear tailgate slight plan-view bow
    rear_bow = np.clip((-x - 2.25) / 0.35, 0.0, 1.0)
    v[:, 0] = v[:, 0] + 0.04 * (z_norm ** 2.2) * rear_bow

    return v


def extrude_flat_panel(poly, z0: float, z1: float, sculpt=True) -> trimesh.Trimesh:
    """Extrudes a 2D (x, y) Shapely Polygon or MultiPolygon along Z from z0 to z1, then applies automotive sculpt."""
    if poly.geom_type == 'MultiPolygon':
        parts = [extrude_flat_panel(g, z0, z1, sculpt=sculpt) for g in poly.geoms if not g.is_empty and g.area > 1e-6]
        return trimesh.util.concatenate(parts)
    m = trimesh.creation.extrude_polygon(poly, height=abs(z1 - z0), engine='earcut')
    z_min = min(z0, z1)
    m.apply_translation((0.0, 0.0, z_min))
    if sculpt:
        m = trimesh.Trimesh(apply_automotive_sculpt(m.vertices), m.faces, process=True)
    m.fix_normals()
    return m


def build_beveled_body_shell(sil: Polygon, holes_right: list, holes_left: list) -> trimesh.Trimesh:
    """
    Constructs a smooth, rounded-edge 3D automotive body shell:
    - Perimeter lofted across Z with 10-segment smooth bevels along roof/nose/tail edges
    - Clean right-side (+Z) panel with exact Shapely cutouts for sliding door + cab/rear windows
    - Clean left-side (-Z) panel with exact Shapely cutouts for left-side windows
    - Zero jagged edges, zero z-fighting!
    """
    meshes = []

    # 1. Outer perimeter ring (roof, windshield, hood, nose, floor, rear, wheel arches)
    # Build as a smooth loft of the exterior ring across Z with 10-segment rounded bevel shoulders
    ext_coords = np.array(sil.exterior.coords[:-1])  # (N, 2)
    n_ring = len(ext_coords)

    # Z profile with smooth 10-segment bevel on both shoulders
    bevel_r = 0.085
    bevel_ang = np.linspace(0, np.pi / 2, 10)
    z_right = (HALF_W - bevel_r) + bevel_r * np.sin(bevel_ang)
    inset_right = bevel_r * (1.0 - np.cos(bevel_ang))

    # Full symmetric Z stations from -HALF_W to +HALF_W
    z_stations = np.concatenate([
        -z_right[::-1],
        np.linspace(-(HALF_W - bevel_r), (HALF_W - bevel_r), 8)[1:-1],
        z_right,
    ])
    insets = np.concatenate([
        inset_right[::-1],
        np.zeros(6),
        inset_right,
    ])

    # Precompute inward unit normals of the 2D silhouette for beveling
    # Only bevel the upper/front/rear perimeter (not the wheel arch bottom edges so arches stay crisp)
    prev_p = np.roll(ext_coords, 1, axis=0)
    next_p = np.roll(ext_coords, -1, axis=0)
    tang = next_p - prev_p
    tang /= np.linalg.norm(tang, axis=1, keepdims=True) + 1e-9
    # CCW polygon -> inward normal is (-ty, tx)
    in_norm = np.column_stack([-tang[:, 1], tang[:, 0]])

    # Compute signed area to verify CCW
    area = 0.5 * np.sum(ext_coords[:, 0] * np.roll(ext_coords[:, 1], -1) - np.roll(ext_coords[:, 0], -1) * ext_coords[:, 1])
    if area < 0:
        in_norm = -in_norm

    # Mask bevel amount: full bevel on roof/nose/tail, lighter bevel on sill & wheel arches
    arch_dist_r = np.hypot(ext_coords[:, 0] - AXLE_R, ext_coords[:, 1] - WHEEL_R)
    arch_dist_f = np.hypot(ext_coords[:, 0] - AXLE_F, ext_coords[:, 1] - WHEEL_R)
    near_arch = (arch_dist_r < ARCH_R + 0.05) | (arch_dist_f < ARCH_R + 0.05) | (ext_coords[:, 1] < SILL_Y + 0.04)
    bevel_weight = np.where(near_arch, 0.18, 1.0)[:, None]

    # Build loft vertices
    n_z = len(z_stations)
    loft_v = np.zeros((n_z, n_ring, 3))
    for iz, (zz, ins) in enumerate(zip(z_stations, insets)):
        xy = ext_coords + in_norm * (ins * bevel_weight)
        loft_v[iz, :, 0] = xy[:, 0]
        loft_v[iz, :, 1] = xy[:, 1]
        loft_v[iz, :, 2] = zz

    verts = apply_automotive_sculpt(loft_v.reshape(-1, 3))
    faces = []
    for iz in range(n_z - 1):
        for j in range(n_ring):
            jn = (j + 1) % n_ring
            a = iz * n_ring + j
            b = iz * n_ring + jn
            c = (iz + 1) * n_ring + jn
            d = (iz + 1) * n_ring + j
            faces.append((a, b, c))
            faces.append((a, c, d))
    peri = trimesh.Trimesh(verts, np.array(faces), process=False)
    # Orient outward: check roof normal points +Y
    roof_idx = np.argmax(peri.triangles_center[:, 1])
    if peri.face_normals[roof_idx][1] < 0:
        peri.invert()
    meshes.append(peri)

    # 2. Right side (+Z) outer skin with exact cutouts (sliding door + front/rear windows)
    # Shrink exterior slightly by the bevel inset so it joins seamlessly at z = +HALF_W
    side_base = sil.buffer(-0.015, join_style=2)
    right_poly = side_base
    for h in holes_right:
        right_poly = right_poly.difference(h)
    meshes.append(extrude_flat_panel(right_poly, HALF_W - 0.045, HALF_W, sculpt=True))

    # 3. Left side (-Z) outer skin with exact window cutouts
    left_poly = side_base
    for h in holes_left:
        left_poly = left_poly.difference(h)
    meshes.append(extrude_flat_panel(left_poly, -HALF_W, -(HALF_W - 0.045), sculpt=True))

    return trimesh.util.concatenate(meshes)


def superellipsoid(size, center, e=0.32, nu=18, nv=32):
    a, b, c = [s / 2.0 for s in size]
    u = np.linspace(-np.pi / 2, np.pi / 2, nu)
    v = np.linspace(-np.pi, np.pi, nv)
    U, Vv = np.meshgrid(u, v, indexing='ij')

    def sp(t, p):
        return np.sign(t) * (np.abs(t) ** p)

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


def make_wheel_parts():
    """Realistic satin-rubber tire + crisp 5-spoke silver VW alloy rim + dark rotor/caliper."""
    ro, ri, hw, cr = WHEEL_R, 0.215, 0.108, 0.045
    loop = [(ri, -hw), (ro - cr, -hw)]
    for a in np.linspace(-np.pi / 2, 0, 8)[1:]:
        loop.append((ro - cr + cr * np.cos(a), -hw + cr + cr * np.sin(a)))
    loop.append((ro, hw - cr))
    for a in np.linspace(0, np.pi / 2, 8)[1:]:
        loop.append((ro - cr + cr * np.cos(a), hw - cr + cr * np.sin(a)))
    loop += [(ri, hw), (ri, -hw)]
    tire = trimesh.creation.revolve(np.array(loop), sections=64)
    tire.merge_vertices()

    # Outer silver alloy lip + barrel
    outer_lip = trimesh.creation.revolve(
        np.array([(0.195, 0.072), (0.218, 0.072), (0.218, 0.098), (0.196, 0.098), (0.195, 0.072)]),
        sections=56,
    )
    outer_lip.merge_vertices()

    # Dark inner wheel barrel (gives crisp contrast behind the 5 silver spokes!)
    dark_barrel = trimesh.creation.revolve(
        np.array([(0.185, -0.092), (0.214, -0.092), (0.214, 0.074), (0.192, 0.074), (0.185, -0.092)]),
        sections=48,
    )
    dark_barrel.merge_vertices()

    # 5 sculpted tapered alloy spokes (matching the clean VW 5-spoke design in reference)
    spokes = []
    for k in range(5):
        ang = np.pi / 2 + k * 2 * np.pi / 5
        # Tapered trapezoid spoke
        sp_poly = Polygon([
            (0.042, -0.029),
            (0.205, -0.021),
            (0.205, 0.021),
            (0.042, 0.029),
        ])
        sp = trimesh.creation.extrude_polygon(sp_poly, height=0.024, engine='earcut')
        sp.apply_translation((0, 0, 0.068))
        sp.apply_transform(TY.rotation_matrix(ang, (0, 0, 1)))
        spokes.append(sp)

    hub = trimesh.creation.cylinder(
        radius=0.056, height=0.032, sections=36,
        transform=TY.translation_matrix((0, 0, 0.082)),
    )
    rim = trimesh.util.concatenate([outer_lip, hub] + spokes)

    rotor = trimesh.creation.cylinder(
        radius=0.148, height=0.018, sections=48,
        transform=TY.translation_matrix((0, 0, 0.022)),
    )
    caliper = superellipsoid((0.065, 0.10, 0.045), (0.085, 0.055, 0.042), 0.3)
    return tire, rim, dark_barrel, rotor, caliper


def build_all():
    scene = trimesh.Scene()

    def add(name, mesh, transform=None):
        key = name.split('_')[0]
        mesh.visual = TextureVisuals(material=MATS[key])
        scene.add_geometry(mesh, node_name=name, geom_name=name, transform=transform)

    sil = build_side_silhouette()
    win_rear, win_door, win_cab = build_window_polygons()
    door_cutout = rounded_rect_poly(DOOR_X0, DOOR_Y0, DOOR_X1, DOOR_Y1, r=0.02, segs=6)

    # 1. Main body shell (zero jagged edges!)
    body = build_beveled_body_shell(
        sil,
        holes_right=[door_cutout, win_rear, win_cab],
        holes_left=[win_rear, win_door, win_cab],
    )
    add('Body', body)

    # 2. Sliding door panel (exact fit inside door_cutout, with smooth window opening)
    door_poly = rounded_rect_poly(DOOR_X0 + 0.004, DOOR_Y0 + 0.004, DOOR_X1 - 0.004, DOOR_Y1 - 0.004, r=0.018, segs=6)
    door_skin_poly = door_poly.difference(win_door)
    add('SlidingDoor', extrude_flat_panel(door_skin_poly, HALF_W - 0.042, HALF_W, sculpt=True))
    add('DoorLiner', extrude_flat_panel(door_skin_poly, HALF_W - 0.058, HALF_W - 0.042, sculpt=True))

    # 3. Flush recessed azure-tinted side windows (both sides)
    # Slightly expanded by 0.008 so glass tucks cleanly behind gaskets with zero gaps
    add('GlassCab', trimesh.util.concatenate([
        extrude_flat_panel(win_cab.buffer(0.008), HALF_W - 0.022, HALF_W - 0.008, sculpt=True),
        extrude_flat_panel(win_cab.buffer(0.008), -(HALF_W - 0.008), -(HALF_W - 0.022), sculpt=True),
    ]))
    add('GlassDoor', extrude_flat_panel(win_door.buffer(0.008), HALF_W - 0.022, HALF_W - 0.008, sculpt=True))
    add('GlassRear', trimesh.util.concatenate([
        extrude_flat_panel(win_rear.buffer(0.008), HALF_W - 0.022, HALF_W - 0.008, sculpt=True),
        extrude_flat_panel(win_rear.buffer(0.008), -(HALF_W - 0.008), -(HALF_W - 0.022), sculpt=True),
        extrude_flat_panel(win_door.buffer(0.008), -(HALF_W - 0.008), -(HALF_W - 0.022), sculpt=True),
    ]))

    # 4. Smooth matte-black rubber window gaskets + C-pillar blackout strip (exact reference match!)
    def gasket(win_p, w=0.026):
        return win_p.buffer(w, join_style=1, quad_segs=8).difference(win_p)

    # C-pillar blackout band between rear quarter & sliding door windows (matches reference image)
    c_pillar_blackout = box(-0.80, BELT_Y - 0.024, -0.60, WIN_TOP_Y + 0.024)
    seals_right = unary_union([gasket(win_rear), gasket(win_cab), c_pillar_blackout.difference(door_cutout)])
    seals_left = unary_union([gasket(win_rear), gasket(win_door), gasket(win_cab), c_pillar_blackout])
    add('Seals', trimesh.util.concatenate([
        extrude_flat_panel(seals_right, HALF_W - 0.014, HALF_W + 0.004, sculpt=True),
        extrude_flat_panel(seals_left, -(HALF_W + 0.004), -(HALF_W - 0.014), sculpt=True),
    ]))
    door_seal = unary_union([gasket(win_door), c_pillar_blackout.intersection(door_poly)])
    add('DoorTrim', extrude_flat_panel(door_seal, HALF_W - 0.014, HALF_W + 0.004, sculpt=True))

    # 5. Raked wrap-around Windshield + Rear tailgate glass
    # Build windshield as a curved quad grid following the exact A-pillar slope
    ws_t = np.linspace(0, 1, 16)
    ws_z = np.linspace(-0.74, 0.74, 24)
    ws_v, ws_f = [], []
    for t in ws_t:
        wx = 1.15 + t * (1.74 - 1.15)
        wy = 1.84 - t * (1.84 - 1.20)
        for zz in ws_z:
            bow = 0.045 * (1.0 - (zz / 0.74) ** 2)
            ws_v.append((wx + bow, wy, zz))
    ws_v = np.array(ws_v)
    nz = len(ws_z)
    for i in range(len(ws_t) - 1):
        for j in range(nz - 1):
            a = i * nz + j
            b = a + 1
            c = a + nz + 1
            d = a + nz
            ws_f += [(a, b, c), (a, c, d)]
    ws_mesh = trimesh.Trimesh(ws_v, np.array(ws_f), process=False)
    if ws_mesh.face_normals[len(ws_f) // 2][0] < 0:
        ws_mesh.invert()
    add('Windshield', ws_mesh)

    # Rear tailgate glass
    rg_poly = box(-0.68, 1.16, 0.68, 1.76)
    rg = trimesh.creation.extrude_polygon(rg_poly, height=0.02, engine='earcut')
    rg.apply_transform(TY.rotation_matrix(np.pi / 2, (0, 1, 0)))
    rg.apply_transform(TY.rotation_matrix(-0.10, (0, 0, 1)))
    rg.apply_translation((-2.51, 0.0, 0.0))
    add('GlassRear_Tailgate', rg)

    # 6. Crisp automotive panel seams, horizontal swage line, rocker line & sliding-door track groove
    seam_polys_r = [
        # Vertical B-pillar front door seam
        box(0.505, 0.30, 0.517, 1.88),
        # Vertical sliding door rear seam
        box(-0.708, 0.30, -0.696, 1.88),
        # Vertical front fender/door gap
        box(1.585, 0.34, 1.596, 1.08),
        # Horizontal character crease along beltline (door handle height)
        box(-2.46, 0.962, 2.26, 0.972),
        # Lower rocker sill crease
        box(-2.16, 0.365, 2.24, 0.375),
    ]
    trims = [extrude_flat_panel(p.intersection(sil.buffer(-0.02)), HALF_W - 0.002, HALF_W + 0.009, sculpt=True) for p in seam_polys_r if not p.intersection(sil.buffer(-0.02)).is_empty]
    add('Trim', trimesh.util.concatenate(trims))

    # Recessed horizontal sliding-door guide track groove (C-pillar back to taillight, y = 0.89)
    rail_poly = box(-2.45, 0.880, -0.705, 0.902)
    add('TrackRail', extrude_flat_panel(rail_poly, HALF_W - 0.002, HALF_W + 0.009, sculpt=True))

    # 7. Dark inner wheel-well housings (NO thick protruding black arch rings!)
    wells = []
    for ax in (AXLE_R, AXLE_F):
        for side in (1, -1):
            ang = np.linspace(-0.08, np.pi + 0.08, 40)
            zs_ = np.linspace(0.28, HALF_W - 0.005, 5) * side
            P, Fc = [], []
            for zz in zs_:
                for a in ang:
                    P.append((ax + (ARCH_R - 0.004) * np.cos(a), WHEEL_R + (ARCH_R - 0.004) * np.sin(a), zz))
            P = np.array(P)
            na = len(ang)
            for iz in range(len(zs_) - 1):
                for ia in range(na - 1):
                    p0 = iz * na + ia
                    Fc += [(p0, p0 + 1, p0 + na + 1), (p0, p0 + na + 1, p0 + na)]
            wm = trimesh.Trimesh(P, np.array(Fc), process=False)
            fn = wm.face_normals[len(Fc) // 2]
            fc = wm.triangles_center[len(Fc) // 2]
            if np.dot(fn, np.array([fc[0] - ax, fc[1] - WHEEL_R, 0])) > 0:
                wm.invert()
            wells.append(wm)
    add('WheelWells', trimesh.util.concatenate(wells))

    # 8. Matte-charcoal rear bumper step (#1E2025) & front grille/intake recesses
    add('Bumpers', superellipsoid((0.46, 0.20, 1.76), (-2.46, 0.37, 0.0), 0.22))
    add('Grille', trimesh.util.concatenate([
        # Upper narrow VW grille between headlights
        superellipsoid((0.08, 0.12, 1.02), (2.52, 0.80, 0.0), 0.24),
        # Lower front bumper air intake
        superellipsoid((0.08, 0.12, 1.18), (2.56, 0.42, 0.0), 0.24),
        # Round fog-light recesses left/right (visible on side profile like reference)
        superellipsoid((0.09, 0.085, 0.14), (2.46, 0.44, 0.77), 0.45),
        superellipsoid((0.09, 0.085, 0.14), (2.46, 0.44, -0.77), 0.45),
    ]))

    # 9. Wrap-around dark-housing clear-lens headlights, DRLs, vertical red taillights, mirrors, handles
    hl_glass, hl_house, drl, tl, rep, mir, mg = [], [], [], [], [], [], []
    for s in (1, -1):
        # Dark-housing wrap-around T5 headlight flush with front corner
        hl_house.append(superellipsoid((0.29, 0.165, 0.34), (2.35, 0.80, s * 0.72), 0.26))
        hl_glass.append(superellipsoid((0.30, 0.172, 0.35), (2.36, 0.802, s * 0.73), 0.28))
        drl.append(superellipsoid((0.05, 0.028, 0.16), (2.46, 0.81, s * 0.77), 0.35))
        tl.append(superellipsoid((0.12, 0.36, 0.14), (-2.52, 0.88, s * 0.81), 0.26))
        rep.append(superellipsoid((0.065, 0.026, 0.025), (1.72, 0.82, s * 0.92), 0.4))
        # Matte-black aerodynamic side mirror (exact position from reference)
        mir.append(superellipsoid((0.14, 0.16, 0.20), (1.46, 1.14, s * 0.99), 0.36))
        mir.append(superellipsoid((0.09, 0.05, 0.14), (1.50, 1.07, s * 0.91), 0.35))
        mg.append(superellipsoid((0.012, 0.13, 0.16), (1.39, 1.14, s * 0.99), 0.3))
    add('HeadlightHousing', trimesh.util.concatenate(hl_house))
    add('Headlights', trimesh.util.concatenate(hl_glass))
    add('DRL', trimesh.util.concatenate(drl))
    add('Taillights', trimesh.util.concatenate(tl))
    add('Repeater', trimesh.util.concatenate(rep))
    add('Mirrors', trimesh.util.concatenate(mir))
    add('MirrorGlass', trimesh.util.concatenate(mg))
    add('Badge', trimesh.creation.cylinder(
        radius=0.055, height=0.014, sections=32,
        transform=TY.compose_matrix(angles=(0, np.pi / 2, 0), translate=(2.60, 0.82, 0.0)),
    ))

    # Adjacent matte-black door handles straddling the B-pillar seam (exact reference placement!)
    add('Handles', trimesh.util.concatenate([
        superellipsoid((0.17, 0.032, 0.042), (0.67, 0.995, HALF_W - 0.005), 0.38),
        superellipsoid((0.17, 0.032, 0.042), (0.67, 0.995, -(HALF_W - 0.005)), 0.38),
    ]))
    add('DoorHandle', superellipsoid((0.17, 0.032, 0.042), (0.35, 0.995, HALF_W - 0.005), 0.38))

    # 10. Detailed 5-spoke alloy wheels + tires + brake rotors
    tire0, rim0, barrel0, rotor0, cal0 = make_wheel_parts()
    for name, ax, side in (('FR', AXLE_F, 1), ('FL', AXLE_F, -1), ('RR', AXLE_R, 1), ('RL', AXLE_R, -1)):
        flip = TY.rotation_matrix(np.pi, (0, 1, 0)) if side < 0 else np.eye(4)
        T = TY.translation_matrix((ax, WHEEL_R, side * WHEEL_Z))
        for nm, g in (('Wheels', tire0), ('Rims', rim0), ('RimDark', barrel0), ('Brakes', rotor0), ('Calipers', cal0)):
            gm = g.copy()
            gm.apply_transform(flip)
            add(f'{nm}_{name}', gm, T)

    # 11. Full 8-seat 3D interior cabin (visible through azure glass & when sliding door opens!)
    seats, headrests = [], []
    seat_defs = [
        # Front row: Conducente + F1 + F2
        (1.05, -0.50), (1.05, 0.08), (1.05, 0.54),
        # Middle row: M1 + M2 + M3
        (-0.18, -0.56), (-0.18, 0.0), (-0.18, 0.56),
        # Rear row: R1 + R2 + R3
        (-1.28, -0.56), (-1.28, 0.0), (-1.28, 0.56),
    ]
    for sx, sz in seat_defs:
        seats.append(superellipsoid((0.46, 0.13, 0.44), (sx, 0.62, sz), 0.35))
        back = superellipsoid((0.12, 0.58, 0.44), (sx - 0.22, 0.98, sz), 0.35)
        back.apply_transform(TY.rotation_matrix(0.14, (0, 0, 1)))
        seats.append(back)
        seats.append(superellipsoid((0.28, 0.34, 0.10), (sx, 0.44, sz), 0.4))
        # Lighter-grey headrests clearly visible through the azure glass (matches reference!)
        headrests.append(superellipsoid((0.11, 0.21, 0.24), (sx - 0.28, 1.44, sz), 0.38))

    add('CabinSeats', trimesh.util.concatenate(seats))
    add('Headrests', trimesh.util.concatenate(headrests))
    add('CabinFloor', trimesh.creation.box(
        extents=(4.35, 0.03, 1.68),
        transform=TY.translation_matrix((-0.35, 0.30, 0.0)),
    ))
    dash = [superellipsoid((0.46, 0.30, 1.56), (1.68, 0.95, 0.0), 0.3)]
    st_wheel = trimesh.creation.torus(0.18, 0.017, major_sections=36, minor_sections=10)
    st_wheel.apply_transform(TY.rotation_matrix(np.pi / 2, (0, 1, 0)))
    st_wheel.apply_transform(TY.rotation_matrix(-0.48, (0, 0, 1)))
    st_wheel.apply_translation((1.38, 1.15, -0.48))
    dash.append(st_wheel)
    add('Dashboard', trimesh.util.concatenate(dash))

    # Dark far-side interior trim panel & ceiling liner (keeps cabin open for sliding-door view)
    add('InnerShell', trimesh.util.concatenate([
        trimesh.creation.box(extents=(4.2, 0.72, 0.04), transform=TY.translation_matrix((-0.42, 0.68, -0.86))),
        trimesh.creation.box(extents=(3.2, 0.04, 1.60), transform=TY.translation_matrix((-0.65, 1.88, 0.0))),
    ]))

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    data = scene.export(file_type='glb')
    with open(OUT, 'wb') as fh:
        fh.write(data)
    print(f'wrote {os.path.abspath(OUT)} ({len(data) // 1024} KB, {len(scene.geometry)} meshes)')


if __name__ == '__main__':
    build_all()
