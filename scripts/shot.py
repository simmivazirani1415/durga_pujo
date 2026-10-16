"""Screenshot helper for dev checks.
usage: python3 scripts/shot.py <url-query-or-hash> <out.png> [WxH] [wait_ms] [--actions json]
"""
import sys, json
from playwright.sync_api import sync_playwright
q = sys.argv[1]; out = sys.argv[2]
size = sys.argv[3] if len(sys.argv) > 3 else '1440x900'
wait = int(sys.argv[4]) if len(sys.argv) > 4 else 1500
W, H = map(int, size.split('x'))
url = 'http://127.0.0.1:5173/' + q
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1, has_touch=W < 700, is_mobile=W < 700)
    pg = ctx.new_page()
    logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'pageerror: {e}'))
    pg.goto(url, wait_until='networkidle')
    pg.wait_for_timeout(wait)
    pg.screenshot(path=out)
    for l in logs[:15]: print(l)
    b.close()
