#!/usr/bin/env python3
"""Moves every absolute link of the project to its final address.

Canonical links, Open Graph and Twitter cards, structured data and sitemap.xml need full URLs.
The current address is kept in site-url.txt; this script swaps it for the new one everywhere.

  python3 scripts/set-site-url.py https://n-e-n.ru/museum/            # in this folder
  python3 scripts/set-site-url.py https://n-e-n.ru/museum/ --dir dist  # in a built copy
"""
import sys
from pathlib import Path

FILES = ['index.html', 'museum.html', 'sitemap.xml', 'robots.txt', 'site-url.txt']


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        sys.exit(__doc__)
    new = args[0].strip()
    if not new.startswith(('https://', 'http://')):
        sys.exit('The address must start with https://')
    if not new.endswith('/'):
        new += '/'
    root = Path(sys.argv[sys.argv.index('--dir') + 1]) if '--dir' in sys.argv else Path(__file__).resolve().parent.parent
    old = (root / 'site-url.txt').read_text(encoding='utf-8').strip()
    if old == new:
        print('Already', new); return
    for name in FILES:
        path = root / name
        if path.exists():
            text = path.read_text(encoding='utf-8')
            count = text.count(old)
            path.write_text(text.replace(old, new), encoding='utf-8')
            print(f'{name}: {count} link(s)')
    print(f'{old} → {new}')


if __name__ == '__main__':
    main()
