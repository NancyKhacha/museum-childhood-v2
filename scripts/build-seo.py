#!/usr/bin/env python3
"""Writes the text version of the museum into museum.html, inside <noscript>.

The museum itself is a 3D corridor built by JavaScript: its texts appear only after a click,
so search robots and browsers without JavaScript would see an empty page. This block repeats
the same texts from data/museum.json, in the same order the visitor meets them: each era's
introduction with the experts' quotes, the exhibits, the story of the programme, and the finale.
No new copy is written here; only the texts from the data file and the headings the museum
already shows.

Run after any change to data/museum.json:  python3 scripts/build-seo.py
"""
import html, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
START, END = '<!-- museum-text:start -->', '<!-- museum-text:end -->'
LD_START, LD_END = '<!-- museum-ld:start -->', '<!-- museum-ld:end -->'


def esc(text):
    return html.escape(text, quote=True)


def paragraphs(text):
    return ''.join(f'<p>{esc(p.strip())}</p>' for p in re.split(r'\n\s*\n', text or '') if p.strip())


def final_sections(data):
    # Same split as finalSections() in room-math.js.
    parts = [p.strip() for p in re.split(r'\n\s*\n', re.sub(r'\n\s*Кнопка:[\s\S]*$', '', data['final'])) if p.strip()]
    name = data['finalSpeaker']['name']
    author = next(i for i, p in enumerate(parts) if p.startswith(name))
    editorial = next((i for i, p in enumerate(parts) if i > author and p.startswith('По исследованию')), None)
    return {
        'intro': parts[:author],
        'comment': parts[author + 1:editorial],
        'ending': parts[editorial:] if editorial is not None else [],
        'programme': [p.strip() for p in re.split(r'\n\s*\n', data['eras'][4]['show']) if p.strip()],
    }


def museum_text(data):
    watch = data['watch']
    out = ['<article class="museum-text" aria-label="Музей детства">', '<h1>Музей детства</h1>']
    for index, era in enumerate(data['eras']):
        out.append(f'<section class="museum-text-era" id="era-{index}"><h2>{esc(era["label"])}</h2>')
        out.append(paragraphs(era['introduction']))
        for expert in era['experts']:
            out.append(f'<figure class="museum-text-expert"><figcaption><h3>{esc(expert["name"])}</h3><p>{esc(expert["role"])}</p></figcaption>'
                       f'<blockquote>{paragraphs(expert["quote"])}</blockquote></figure>')
        for obj in era['objects']:
            out.append(f'<section class="museum-text-object"><h3>{esc(obj["name"])}</h3>{paragraphs(obj["body"])}</section>')
        if index < len(data['eras']) - 1:
            out.append(f'<section class="museum-text-programme"><h3>«Спокойной ночи, малыши!»</h3>{paragraphs(era["show"])}'
                       f'<p><a href="{esc(watch["url"])}" rel="noopener noreferrer">{esc(watch["label"])}</a></p></section>')
        out.append('</section>')
    final, speaker = final_sections(data), data['finalSpeaker']
    comment = paragraphs('\n\n'.join(final['comment']))
    out.append('<section class="museum-text-final"><h2>«Спокушки» сегодня</h2>')
    out.append(paragraphs('\n\n'.join(final['intro'] + final['programme'] + final['ending'])))
    out.append(f'<figure class="museum-text-expert"><figcaption><h3>{esc(speaker["name"])}</h3><p>{esc(speaker["role"])}</p></figcaption>'
               f'<blockquote>{comment}</blockquote></figure>')
    out.append(f'<p><a href="{esc(watch["url"])}" rel="noopener noreferrer">{esc(watch["label"])}</a></p></section>')
    out.append('</article>')
    return ''.join(out)


def museum_ld(data, base):
    """Structured data for the museum page: the page, the publisher and the list of exhibits."""
    image = {'@type': 'ImageObject', 'url': base + 'assets/og-cover.jpg', 'width': 1200, 'height': 630}
    items = [o['name'] for e in data['eras'] for o in e['objects']]
    ld = {'@context': 'https://schema.org', '@graph': [
        {'@type': 'Organization', '@id': 'https://n-e-n.ru/#organization', 'name': 'Нет, это нормально', 'alternateName': 'НЭН', 'url': 'https://n-e-n.ru/'},
        {'@type': 'WebPage', '@id': base + 'museum.html#webpage', 'url': base + 'museum.html', 'name': 'Музей детства — прогулка по эпохам',
         'inLanguage': 'ru', 'image': image, 'primaryImageOfPage': image,
         'isPartOf': {'@type': 'WebSite', '@id': 'https://n-e-n.ru/#website', 'name': 'Нет, это нормально', 'url': 'https://n-e-n.ru/'},
         'publisher': {'@id': 'https://n-e-n.ru/#organization'},
         'about': {'@type': 'TVSeries', 'name': 'Спокойной ночи, малыши!', 'startDate': '1964'},
         'mainEntity': {'@type': 'ItemList', 'name': 'Экспонаты музея', 'numberOfItems': len(items),
                        'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n} for i, n in enumerate(items)]}}]}
    # </script> can never appear inside: the names are plain text, and "<" is escaped anyway.
    return '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c') + '</script>'


def replace_between(source, start, end, content):
    if start not in source or end not in source:
        sys.exit(f'museum.html has no {start} marker')
    head, rest = source.split(start, 1)
    _, tail = rest.split(end, 1)
    return head + start + content + end + tail


def main():
    data = json.loads((ROOT / 'data/museum.json').read_text(encoding='utf-8'))
    page = ROOT / 'museum.html'
    source = page.read_text(encoding='utf-8')
    base = (ROOT / 'site-url.txt').read_text(encoding='utf-8').strip()
    source = replace_between(source, START, END, museum_text(data))
    source = replace_between(source, LD_START, LD_END, museum_ld(data, base))
    page.write_text(source, encoding='utf-8')
    names = sum(len(e['objects']) for e in data['eras'])
    print(f'museum.html: text version with {len(data["eras"])} eras and {names} exhibits')


if __name__ == '__main__':
    main()
