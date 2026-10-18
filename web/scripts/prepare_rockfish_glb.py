"""Prepare an exported rockfish GLB for the site.

1. Fixes inside-out meshes (triangle winding opposite to the vertex normals),
   which otherwise render hollow in the browser.
2. Adds hinge (pivot) nodes at the base of the tail and pectoral fins, plus a
   "Swim" parent node, and bakes a looping "Swim" animation the viewer can play.

Usage (originals stay untouched):
    python3 web/scripts/prepare_rockfish_glb.py ~/Downloads/copper-rockfish.glb web/public/3d/copper-rockfish.glb

Assumes the model layout from the DuoCrab baker: head at -X, up +Y, parts named
Fin_Caudal, Fin_Pectoral_L, Fin_Pectoral_R under a root node. Pivot positions
are in the root node's local units.
"""
import array
import json
import math
import struct
import sys

PIVOTS = {
    # node name: (pivot in root-local coords, rotation axis, amplitude deg, phase)
    'Fin_Caudal': ((0.952, 0.0, 0.0), (0, 1, 0), 24, 0.0),
    'Fin_Pectoral_L': ((0.31, -0.06, 0.075), (0, 1, 0), 22, 0.25),
    'Fin_Pectoral_R': ((0.31, -0.06, -0.075), (0, 1, 0), -22, 0.25),
}
LOOP_SECONDS = 1.2
FRAMES = 25  # first and last frame match so the loop is seamless
BODY_YAW_DEG = 5  # whole-fish sway, opposite to the tail
BODY_BOB = 0.004  # scene units


def read_glb(path):
    data = open(path, 'rb').read()
    json_len = struct.unpack('<I', data[12:16])[0]
    gltf = json.loads(data[20:20 + json_len])
    bin_start = 20 + json_len
    bin_len = struct.unpack('<I', data[bin_start:bin_start + 4])[0]
    return gltf, bytearray(data[bin_start + 8:bin_start + 8 + bin_len])


def write_glb(path, gltf, binary):
    while len(binary) % 4:
        binary.append(0)
    gltf['buffers'][0]['byteLength'] = len(binary)
    js = json.dumps(gltf, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    total = 12 + 8 + len(js) + 8 + len(binary)
    with open(path, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, total))
        f.write(struct.pack('<I4s', len(js), b'JSON') + js)
        f.write(struct.pack('<I4s', len(binary), b'BIN\0') + bytes(binary))


def accessor_array(gltf, binary, index):
    acc = gltf['accessors'][index]
    view = gltf['bufferViews'][acc['bufferView']]
    width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[acc['type']]
    fmt = {5126: 'f', 5123: 'H', 5125: 'I'}[acc['componentType']]
    offset = view.get('byteOffset', 0) + acc.get('byteOffset', 0)
    arr = array.array(fmt)
    arr.frombytes(bytes(binary[offset:offset + acc['count'] * width * arr.itemsize]))
    return arr, offset


def fix_winding(gltf, binary):
    fixed = []
    for mesh in gltf['meshes']:
        for prim in mesh['primitives']:
            pos, _ = accessor_array(gltf, binary, prim['attributes']['POSITION'])
            nrm, _ = accessor_array(gltf, binary, prim['attributes']['NORMAL'])
            idx, offset = accessor_array(gltf, binary, prim['indices'])
            agree = 0
            for t in range(0, len(idx), 3):
                a, b, c = idx[t], idx[t + 1], idx[t + 2]
                u = [pos[b * 3 + k] - pos[a * 3 + k] for k in range(3)]
                v = [pos[c * 3 + k] - pos[a * 3 + k] for k in range(3)]
                g = (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])
                n = [nrm[a * 3 + k] + nrm[b * 3 + k] + nrm[c * 3 + k] for k in range(3)]
                agree += sum(g[k] * n[k] for k in range(3)) > 0
            if agree < len(idx) / 6:  # fewer than half the triangles agree
                for t in range(0, len(idx), 3):
                    idx[t + 1], idx[t + 2] = idx[t + 2], idx[t + 1]
                raw = idx.tobytes()
                binary[offset:offset + len(raw)] = raw
                fixed.append(mesh.get('name', '?'))
    return fixed


def add_accessor(gltf, binary, values, acc_type, minmax=False):
    while len(binary) % 4:
        binary.append(0)
    raw = array.array('f', values).tobytes()
    gltf['bufferViews'].append({'buffer': 0, 'byteOffset': len(binary), 'byteLength': len(raw)})
    binary.extend(raw)
    width = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[acc_type]
    acc = {'bufferView': len(gltf['bufferViews']) - 1, 'componentType': 5126, 'count': len(values) // width, 'type': acc_type}
    if minmax:
        acc['min'] = [min(values)]
        acc['max'] = [max(values)]
    gltf['accessors'].append(acc)
    return len(gltf['accessors']) - 1


def quat(axis, deg):
    half = math.radians(deg) / 2
    s = math.sin(half)
    return [axis[0] * s, axis[1] * s, axis[2] * s, math.cos(half)]


def add_swim(gltf, binary):
    if any(a.get('name') == 'Swim' for a in gltf.get('animations', [])):
        return False
    nodes = gltf['nodes']
    by_name = {n.get('name'): i for i, n in enumerate(nodes)}
    root = gltf['scenes'][gltf.get('scene', 0)]['nodes'][0]

    times = [LOOP_SECONDS * f / (FRAMES - 1) for f in range(FRAMES)]
    time_acc = add_accessor(gltf, binary, times, 'SCALAR', minmax=True)
    channels, samplers = [], []

    def animate(node, path, values, acc_type):
        samplers.append({'input': time_acc, 'output': add_accessor(gltf, binary, values, acc_type), 'interpolation': 'LINEAR'})
        channels.append({'sampler': len(samplers) - 1, 'target': {'node': node, 'path': path}})

    # Hinge each fin at its base: pivot node at the base, fin shifted back by the same amount.
    for name, (pivot, axis, amp, phase) in PIVOTS.items():
        fin = by_name[name]
        nodes.append({'name': f'{name}_Hinge', 'translation': list(pivot), 'children': [fin]})
        hinge = len(nodes) - 1
        nodes[fin]['translation'] = [-p for p in pivot]
        for parent in nodes:
            if fin in parent.get('children', []) and parent is not nodes[hinge]:
                parent['children'] = [hinge if c == fin else c for c in parent['children']]
        values = []
        for t in times:
            values += quat(axis, amp * math.sin(2 * math.pi * (t / LOOP_SECONDS + phase)))
        animate(hinge, 'rotation', values, 'VEC4')

    # Whole-fish sway and bob around the scene origin (near mid-body).
    nodes.append({'name': 'Swim', 'children': [root]})
    swim = len(nodes) - 1
    gltf['scenes'][gltf.get('scene', 0)]['nodes'] = [swim]
    yaw, bob = [], []
    for t in times:
        phase = 2 * math.pi * t / LOOP_SECONDS
        yaw += quat((0, 1, 0), -BODY_YAW_DEG * math.sin(phase))
        bob += [0.0, BODY_BOB * math.sin(2 * phase), 0.0]
    animate(swim, 'rotation', yaw, 'VEC4')
    animate(swim, 'translation', bob, 'VEC3')

    gltf.setdefault('animations', []).append({'name': 'Swim', 'channels': channels, 'samplers': samplers})
    return True


def main(src, dst):
    gltf, binary = read_glb(src)
    fixed = fix_winding(gltf, binary)
    added = add_swim(gltf, binary)
    write_glb(dst, gltf, binary)
    print(f'{dst}: flipped {len(fixed)} meshes {fixed}; swim animation {"added" if added else "already present"}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
