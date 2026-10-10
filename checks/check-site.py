"""Verify generated routes, translations, anchors, forms and static assets."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT/'dist'

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.ids = set(); self.links = []; self.assets = []; self.title = False
        self.lang = None; self.robots = False; self.forms = []; self.labels = 0
        self.controls = []; self.h1 = 0; self.tags = []
        self.feed(source)
    def handle_starttag(self, tag, pairs):
        a = dict(pairs)
        if 'id' in a:
            assert a['id'] not in self.ids, f'Duplicate ID: {a["id"]}'
            self.ids.add(a['id'])
        if tag == 'html': self.lang = a.get('lang')
        if tag == 'title': self.title = True
        if tag == 'h1': self.h1 += 1
        if tag == 'meta' and a.get('name') == 'robots': self.robots = a.get('content') == 'noindex,nofollow'
        if tag == 'a' and a.get('href'): self.links.append(a['href'])
        if tag in ('link','script'):
            src = a.get('href') if tag == 'link' else a.get('src')
            if src and src.startswith('/') and a.get('rel') != 'alternate': self.assets.append(src)
        if tag == 'form': self.forms.append(a)
        if tag == 'label': self.labels += 1
        if tag in ('input','textarea','select'): self.controls.append((tag,a))

pages = {p: Page(p.read_text()) for p in DIST.rglob('index.html')}
assert len(pages) == 30, f'Expected 30 pages, got {len(pages)}'
link_count = 0
for file,page in pages.items():
    rel = file.relative_to(DIST)
    expected_lang = 'en' if rel.parts[0] == 'en' else 'fr'
    assert page.lang == expected_lang, (rel,page.lang)
    assert page.title and page.h1 == 1 and page.robots, rel
    assert {'main','site-nav'} <= page.ids, rel
    for asset in page.assets:
        assert (DIST/asset.lstrip('/')).is_file(), (rel,asset)
    for href in page.links:
        link_count += 1
        url = urlsplit(href)
        if url.scheme or url.netloc: continue
        if url.path:
            target = DIST/unquote(url.path).lstrip('/')
            if not target.suffix: target = target/'index.html'
        else: target = file
        assert target.exists(), f'{rel} links to missing {href}'
        if url.fragment:
            assert target in pages and unquote(url.fragment) in pages[target].ids, (rel,href)
    sibling = DIST/(str(rel)[3:] if expected_lang=='en' else 'en/'+str(rel))
    assert sibling.exists(), f'Missing translation: {rel}'
    if file.parent.name == 'contact':
        assert len(page.forms) == 1 and page.forms[0].get('data-email') == 'emmanuelakounna@gmail.com'
        assert {'contact-form','form-status','email-fallback','prepared-message'} <= page.ids
        names = {a.get('name') for t,a in page.controls}
        assert {'name','organisation','reason','message'} <= names
        assert page.labels >= 5

content = json.loads((ROOT/'content.json').read_text())
assert len(content['PROJECTS']) == 4 and len(content['INSIGHTS']) == 3
for item in content['PROJECTS']+content['INSIGHTS']:
    for key in ('title','summary','kind'):
        assert item[key] and item[key+'_en']
assert (DIST/'robots.txt').read_text() == 'User-agent: *\nDisallow: /\n'
assert (DIST/'assets/site.js').read_bytes() == (ROOT/'assets/site.js').read_bytes()
assert (DIST/'assets/style.css').read_bytes() == (ROOT/'assets/style.css').read_bytes()
print(f'PASS: 30 bilingual pages, {link_count} links, anchors, assets, metadata and email forms.')
