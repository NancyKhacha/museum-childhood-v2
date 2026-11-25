#!/usr/bin/env python3
"""Builds the hand-off package for deployment: only the files the site actually loads.

  python3 scripts/build-dist.py          → dist/museum-detstva/site/ + dist/museum-detstva.zip

The package holds site/ (upload its contents as is), DEPLOY.md and set-site-url.py.
Old drafts, tests, QA pages and notes stay in the repository.
"""
import re, shutil, sys, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'dist' / 'museum-detstva'
PAGES = ['index.html', 'museum.html']
EXTRA = ['favicon.ico', 'sitemap.xml', 'robots.txt', 'site-url.txt', 'data/museum.json']


def referenced(text):
    return set(re.findall(r'(?:assets|data)/[A-Za-z0-9_\-./]+?\.(?:webp|png|jpe?g|svg|woff2|json|ico)', text))


def main():
    shutil.rmtree(OUT.parent, ignore_errors=True)
    site = OUT / 'site'
    files = set(PAGES + EXTRA)
    # Scripts and styles the pages load, then everything they and the data refer to.
    todo = list(PAGES)
    while todo:
        text = (ROOT / todo.pop()).read_text(encoding='utf-8')
        for ref in re.findall(r'(?:src|href)="([^"?#:]+\.(?:js|css))', text) + re.findall(r"from '\./([^'?]+\.js)", text) + re.findall(r"import\('\./([^'?]+\.js)", text):
            ref = ref.lstrip('./')
            if ref not in files:
                files.add(ref); todo.append(ref)
    texts = ''.join((ROOT / f).read_text(encoding='utf-8') for f in sorted(files) if f.endswith(('.html', '.js', '.css', '.json')))
    files |= referenced(texts)
    missing = [f for f in sorted(files) if not (ROOT / f).is_file()]
    if missing:
        sys.exit('Missing files: ' + ', '.join(missing))
    for f in sorted(files):
        (site / f).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / f, site / f)
    shutil.copy2(ROOT / 'DEPLOY.md', OUT / 'DEPLOY.md')
    shutil.copy2(ROOT / 'scripts' / 'set-site-url.py', OUT / 'set-site-url.py')
    archive = OUT.parent / 'museum-detstva.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in sorted(OUT.rglob('*')):
            if path.is_file() and path.name != '.DS_Store':
                z.write(path, path.relative_to(OUT.parent))
    size = sum(p.stat().st_size for p in site.rglob('*') if p.is_file())
    print(f'{len(files)} files, {size / 1e6:.1f} MB → {archive.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
