"""Make a colour variant of a rockfish GLB from an older export of that colour.

Keeps the base file's geometry and _SWIM data, and copies over what a colour
form changes: the texture images (matched by image name), the per-vertex
COLOR_0 of each mesh (matched by mesh node name; vertex counts must match) and
the root node's `colourForm` extra.

Usage:
    python3 web/scripts/make_colour_variant.py BASE.glb COLOUR_SOURCE.glb OUT.glb
e.g.
    python3 web/scripts/make_colour_variant.py ~/Downloads/copper-rockfish2.glb \
        ~/Downloads/copper-rockfish-olive.glb web/public/3d/copper-rockfish-olive.glb
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from prepare_rockfish_glb import read_glb, write_glb  # noqa: E402


def view_bytes(gltf, binary, index):
    view = gltf['bufferViews'][index]
    start = view.get('byteOffset', 0)
    return bytes(binary[start:start + view['byteLength']])


def mesh_names(gltf):
    return {n['mesh']: n['name'] for n in gltf['nodes'] if 'mesh' in n}


def main(base_path, source_path, out_path):
    base, base_bin = read_glb(base_path)
    src, src_bin = read_glb(source_path)
    replace = {}  # base bufferView index -> new bytes

    src_images = {img['name']: img for img in src['images']}
    for img in base['images']:
        other = src_images.get(img['name'])
        if other is None:
            sys.exit(f"source has no image named {img['name']}")
        if other.get('mimeType') != img.get('mimeType'):
            sys.exit(f"image {img['name']}: mime type differs")
        replace[img['bufferView']] = view_bytes(src, src_bin, other['bufferView'])

    src_meshes = {name: src['meshes'][i] for i, name in mesh_names(src).items()}
    copied_colours = []
    for i, name in mesh_names(base).items():
        for prim, src_prim in zip(base['meshes'][i]['primitives'], src_meshes[name]['primitives']):
            if 'COLOR_0' not in prim['attributes']:
                continue
            a = base['accessors'][prim['attributes']['COLOR_0']]
            b = src['accessors'][src_prim['attributes']['COLOR_0']]
            if (a['count'], a['type'], a['componentType']) != (b['count'], b['type'], b['componentType']):
                sys.exit(f'{name}: COLOR_0 layout differs; cannot copy vertex colours')
            if a.get('byteOffset', 0) or b.get('byteOffset', 0):
                sys.exit(f'{name}: interleaved COLOR_0 not supported')
            replace[a['bufferView']] = view_bytes(src, src_bin, b['bufferView'])
            copied_colours.append(name)

    # Rebuild the binary chunk so replaced images can change size.
    out = bytearray()
    for i, view in enumerate(base['bufferViews']):
        data = replace.get(i, view_bytes(base, base_bin, i))
        while len(out) % 4:
            out.append(0)
        view['byteOffset'] = len(out)
        view['byteLength'] = len(data)
        out.extend(data)

    src_form = next((n['extras'].get('colourForm') for n in src['nodes'] if n.get('extras', {}).get('colourForm')), None)
    for node in base['nodes']:
        if src_form and node.get('extras', {}).get('colourForm'):
            node['extras']['colourForm'] = src_form

    write_glb(out_path, base, out)
    print(f'{out_path}: {len(base["images"])} images and COLOR_0 on {copied_colours} from {os.path.basename(source_path)}; colourForm={src_form}')


if __name__ == '__main__':
    main(*sys.argv[1:4])
