"""Render the share card from the app's GLSL. Run: pip install moderngl Pillow; python scripts/social.py.

Uses a standalone OpenGL context; no browser or running site is needed.
"""

from pathlib import Path
import os
import re
import struct
import json
import subprocess

import moderngl
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ENGINE = (ROOT / 'packages/astro-dither/src/lib/mount-ordered-dither.ts').read_text()
EFFECTS = (ROOT / 'packages/astro-dither/src/lib/effects.ts').read_text()


def glsl(source, name):
    """Read a shader literal from its authoritative component source."""
    match = re.search(r'const ' + name + r' = (?:/\* glsl \*/ )?`(.*?)`;', source, re.S)
    if match is None:
        raise ValueError(f'Shader {name} was not found')
    return match[1].replace('#version 300 es', '#version 330').replace('precision mediump float;', '')


def aurora():
    """Freeze DitherAurora at a chosen moment with the shared dither engine."""
    ctx = moderngl.create_standalone_context()
    params = dict(curtains=3, height=.42, spread=.13, sway=1.4, turbulence=.6,
                  rays=8, length=.65, glow=1.4, intensity=1, shimmer=.2,
                  scale=.8, tilt=-32, drift=0, direction=1, mask=0)
    declarations = '\n'.join(f'uniform float p_{key};' for key in params)
    fragment = (glsl(ENGINE, 'FRAGMENT_HEAD') + declarations +
                glsl(ENGINE, 'FRAGMENT_HELPERS') + glsl(EFFECTS, 'AURORA_FIELD') +
                glsl(ENGINE, 'FRAGMENT_MAIN'))
    program = ctx.program(vertex_shader=glsl(ENGINE, 'VERTEX'), fragment_shader=fragment)
    for key, value in params.items():
        program[f'p_{key}'].value = value
    for key, value in dict(u_resolution=(850, 630), u_cell=3, u_matrix=4,
                           u_time=6, u_colorCount=5, u_levels=0).items():
        program[key].value = value
    colors = ['000000', '001528', '004a88', '008ee6', 'b9e8ff']
    palette = [tuple(int(color[i:i+2], 16)/255 for i in (0, 2, 4)) + (1.,) for color in colors]
    palette += [(0., 0., 0., 1.)] * 3
    program['u_palette'].write(struct.pack('32f', *(v for color in palette for v in color)))
    vertices = ctx.buffer(struct.pack('12f', -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1))
    vao = ctx.simple_vertex_array(program, vertices, 'a_position')
    target = ctx.simple_framebuffer((850, 630))
    target.use()
    vao.render()
    image = Image.frombytes('RGB', (850, 630), target.read(components=3)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    ctx.release()
    return image


def font(size, bold=False):
    """Use the local sans face, with an optional portable font override."""
    path = os.environ.get('SOCIAL_FONT_BOLD' if bold else 'SOCIAL_FONT')
    candidates = [path] if path else [
        f'C:/Windows/Fonts/arial{"bd" if bold else ""}.ttf',
        f'/usr/share/fonts/truetype/dejavu/DejaVuSans{"-Bold" if bold else ""}.ttf',
        '/System/Library/Fonts/Supplemental/Arial' + (' Bold' if bold else '') + '.ttf',
    ]
    for candidate in candidates:
        if Path(candidate).is_file():
            return ImageFont.truetype(candidate, size)
    raise ValueError('Set SOCIAL_FONT and SOCIAL_FONT_BOLD to local font paths')


def gallery():
    """Render six current registry effects with their own default settings."""
    registry = json.loads(subprocess.check_output([
        'node', '--experimental-strip-types', '--input-type=module', '-e',
        "import {effects} from './packages/astro-dither/src/lib/effects.ts'; process.stdout.write(JSON.stringify(effects));",
    ], cwd=ROOT, text=True))
    sheet = Image.new('RGB', (1200, 680), 'black')
    ctx = moderngl.create_standalone_context()
    vertices = ctx.buffer(struct.pack('12f', -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1))
    for index, name in enumerate(['silk', 'contours', 'waves', 'plasma', 'ripples', 'eclipse']):
        effect = registry[name]
        declarations = '\n'.join(f'uniform float p_{key};' for key in effect['params'])
        fragment = (glsl(ENGINE, 'FRAGMENT_HEAD') + declarations +
                    glsl(ENGINE, 'FRAGMENT_HELPERS') + effect['field'] + glsl(ENGINE, 'FRAGMENT_MAIN'))
        program = ctx.program(vertex_shader=glsl(ENGINE, 'VERTEX'), fragment_shader=fragment)
        settings = dict(u_resolution=(380, 264), u_cell=2, u_matrix=8,
                        u_time=effect['stillTime'], u_colorCount=len(effect['palette']), u_levels=0)
        settings.update({f'p_{key}': value for key, value in effect['params'].items()})
        for key, value in settings.items():
            if key in program:
                program[key].value = value
        palette = [tuple(int(color[i:i+2], 16)/255 for i in (1, 3, 5)) + (1.,) for color in effect['palette']]
        palette += [(0., 0., 0., 1.)] * (8-len(palette))
        program['u_palette'].write(struct.pack('32f', *(v for color in palette for v in color)))
        target = ctx.simple_framebuffer((380, 264))
        target.use()
        vao = ctx.simple_vertex_array(program, vertices, 'a_position')
        vao.render()
        tile = Image.frombytes('RGB', (380, 264), target.read(components=3)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        x, y = 10 + (index % 3)*400, 10 + (index // 3)*340
        sheet.paste(tile, (x, y))
        ImageDraw.Draw(sheet).text((x+4, y+278), name, font=font(22), fill='#a1a8b3')
        vao.release()
        target.release()
        program.release()
    ctx.release()
    sheet.save(ROOT / 'assets/readme/effects.jpg', quality=94)


def main():
    """Compose a 1200 by 630 image for Open Graph and X."""
    card = Image.new('RGB', (1200, 630), 'black')
    art = aurora()
    fade = Image.new('L', art.size)
    fade.putdata([round(255 * min(1, max(0, (x-30)/270))) for y in range(630) for x in range(850)])
    card.paste(art, (350, 0), fade)
    draw = ImageDraw.Draw(card)
    logo = Image.open(ROOT / 'site/public/favicon-32.png').convert('RGBA').resize((40, 40), Image.Resampling.NEAREST)
    card.paste(logo, (64, 54), logo)
    draw.text((118, 56), 'astro-dither', font=font(28, True), fill='#f2f4f7')
    draw.text((58, 174), 'Dither.', font=font(112, True), fill='#f2f4f7')
    draw.text((58, 284), 'For Astro.', font=font(96, True), fill='#f2f4f7')
    draw.text((64, 426), 'Animated backgrounds,', font=font(27), fill='#a1a8b3')
    draw.text((64, 464), 'gradients & image effects.', font=font(27), fill='#a1a8b3')
    draw.text((64, 562), 'pnpm add astro-dither', font=font(22), fill='#00b2ff')
    card.save(ROOT / 'site/public/social.png', optimize=True)
    card.save(ROOT / 'assets/readme/hero.jpg', quality=95)
    gallery()


if __name__ == '__main__':
    main()
