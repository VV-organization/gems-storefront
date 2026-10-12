"""Обновляет публичный снимок shop-skin.com. Только GET; цены сохраняются в Creeps.
Запуск: python3 scripts/refresh-reference-catalog.py [cs2 rust tf2]
Неполная выгрузка не заменяет существующий снимок.
"""
import concurrent.futures
import datetime
import json
import pathlib
import sys
import time
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'catalog-data'
GAMES = {'cs2', 'rust', 'tf2'}

def request(params):
    url = 'https://shop-skin.com/api/v1/catalog?' + urllib.parse.urlencode(params)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Gems catalog snapshot', 'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=30) as response:
                return json.load(response)
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)

def read_pages(game, category=None):
    items, cursors, cursor = {}, set(), None
    while True:
        params = {'game': game, 'limit': 48, 'sort': 'name_asc'}
        if category:
            params['category'] = category
        if cursor:
            params['cursor'] = cursor
        data = request(params)
        for item in data['items']:
            if item['game'] != game or item['quote']['scale'] != 100:
                raise ValueError('Unexpected game or quote scale')
            items[item['id']] = item
        cursor = data['page']['nextCursor']
        if not cursor:
            break
        if cursor in cursors:
            raise ValueError('Repeated cursor: existing snapshot retained')
        cursors.add(cursor)
        time.sleep(.08)
    if len(items) != data['page']['totalCount']:
        raise ValueError(f"Incomplete category {category}: {len(items)} / {data['page']['totalCount']}")
    print(game, category or 'all', len(items), 'complete', flush=True)
    return items

def capture(game):
    data = request({'game': game, 'limit': 48, 'sort': 'name_asc'})
    initial_count = data['page']['totalCount']
    if game == 'cs2':
        categories = data['facets']['categories']
        # Independent categories reduce latency without unbounded concurrency.
        items = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            for group in pool.map(lambda c: read_pages(game, c['id']), categories):
                items.update(group)
    else:
        items = read_pages(game)
    final = request({'game': game, 'limit': 24, 'sort': 'name_asc'})
    if len(items) != final['page']['totalCount']:
        raise ValueError(f"Inventory changed: {len(items)} / {final['page']['totalCount']}; existing snapshot retained")
    data = final
    initial_count = final['page']['totalCount']
    categories = data['facets']['categories']
    known = {c['id'] for c in categories}
    rows, shards = [], {}
    for item in items.values():
        category = item['category']['id']
        if category not in known:
            raise ValueError('Category missing from facets')
        img = item.get('imageUrl') or ''
        if '/economy/image/' in img:
            img = img.rstrip('/') + '/1024fx768f'
        quote = int(item['quote']['amountMinor'])
        if quote < 0:
            raise ValueError('Negative quote')
        rows.append([item['id'], item['name'], category, img, quote, item.get('weapon') or '', (item.get('rarity') or {}).get('name', ''), item.get('marketHashName') or item['name']])
        shards.setdefault(item['id'][:2], {})[item['id']] = item.get('description') or ''
    snapshot = {'game': game, 'capturedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'categories': categories, 'totalCount': len(rows), 'sourceReportedCount': initial_count, 'rows': rows}
    folder = ROOT / 'details' / game
    folder.mkdir(parents=True, exist_ok=True)
    for prefix, descriptions in shards.items():
        (folder / (prefix + '.json')).write_text(json.dumps(descriptions, ensure_ascii=False, separators=(',', ':')))
    temporary = ROOT / (game + '.json.tmp')
    temporary.write_text(json.dumps(snapshot, ensure_ascii=False, separators=(',', ':')))
    temporary.replace(ROOT / (game + '.json'))

if __name__ == '__main__':
    selected = sys.argv[1:] or ['cs2', 'rust', 'tf2']
    if any(game not in GAMES for game in selected):
        raise SystemExit('Supported games: cs2 rust tf2')
    for game in selected:
        capture(game)
