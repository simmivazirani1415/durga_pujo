"""End-to-end check of the real app. usage: python3 scripts/flow.py <outdir> [WxH]"""
import sys, json
from playwright.sync_api import sync_playwright
out = sys.argv[1]; size = sys.argv[2] if len(sys.argv) > 2 else '1440x900'
W, H = map(int, size.split('x')); mobile = W < 700
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1, has_touch=mobile, is_mobile=mobile)
    pg = ctx.new_page()
    logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') and 'TUNNEL' not in m.text else None)
    pg.on('pageerror', lambda e: logs.append(f'pageerror: {e}'))
    pg.goto('http://127.0.0.1:5173/', wait_until='networkidle'); pg.wait_for_timeout(2500)
    pg.screenshot(path=f'{out}/e0_hero.png')
    def state():
        return pg.evaluate("() => ({hash: location.hash, h2: document.querySelector('[data-ui=arrival] h2')?.textContent || null})")
    def wheel_burst(dy=40, n=15):
        pg.mouse.move(W/2, H/2)
        for i in range(n):
            pg.mouse.wheel(0, dy); pg.wait_for_timeout(20)
    # one trackpad burst = one step
    wheel_burst(); pg.wait_for_timeout(4200); print('after burst 1', state())
    pg.screenshot(path=f'{out}/e1_stop1.png')
    wheel_burst(); pg.wait_for_timeout(4200); print('after burst 2', state())
    pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(4200); print('after key down', state())
    pg.keyboard.press('ArrowUp'); pg.wait_for_timeout(4200); print('after key up', state())
    pg.screenshot(path=f'{out}/e2_stop2.png')
    # explore
    btn = pg.get_by_role('button', name='Explore', exact=False).first
    btn.click(); pg.wait_for_timeout(1500)
    pg.screenshot(path=f'{out}/e3_explore.png')
    wheel_burst(); pg.wait_for_timeout(1500); print('wheel inside panel', state())
    pg.keyboard.press('Escape'); pg.wait_for_timeout(1200); print('after esc', state())
    # search from a deep jump: go to hero via logo
    pg.get_by_role('button', name='PujoBLR, back to the start').click(); pg.wait_for_timeout(4500); print('logo ->', state())
    inp = pg.locator('[data-ui=hero] input').first
    inp.click(); inp.fill('Assam Society'); pg.wait_for_timeout(800)
    pg.screenshot(path=f'{out}/e4_search.png')
    pg.keyboard.press('Enter'); pg.wait_for_timeout(6000); print('search assam ->', state())
    pg.screenshot(path=f'{out}/e5_search_result.png')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(1000)
    # planner
    pg.get_by_role('button', name='itinerary', exact=False).first.click(); pg.wait_for_timeout(1500)
    pg.screenshot(path=f'{out}/e6_planner.png')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(800)
    # finale via End
    pg.keyboard.press('End'); pg.wait_for_timeout(6000); print('end ->', state())
    pg.screenshot(path=f'{out}/e7_finale.png')
    print('\n'.join(logs[:20]))
    b.close()
