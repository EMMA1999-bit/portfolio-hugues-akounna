# Hugues Emmanuel Akounna — Portfolio

Bilingual, buildless static portfolio. Hosting remains restricted to the owner account through Sites access controls.

## Build and check

```sh
python build.py
python checks/check-site.py
node checks/check-interactions.cjs
node --check assets/site.js
```

`content.json` contains the project and writing content. `build.py` generates the 30 French and English pages into `dist/`. Shared CSS, JavaScript and the favicon live in `assets/`.

Project and writing pages distinguish research under review, exploratory work, field experience and editorial drafts. The thesis has no download or definitive empirical conclusions pending methodological validation.

The contact composer prepares a `mailto:` draft in the visitor’s email application. It does not transmit form data to a server. If no email application opens, a prepared text is displayed for manual use.

Topic, format, query and sort filters are reflected in the URL and retained when switching languages. All pages and direct email links remain accessible without JavaScript.

Checks cover routes, language counterparts, internal links, fragment targets, assets, form fields, search, sorting, URL state and email drafts. Browser visual QA was unavailable in the managed environment.

Do not change access to public without the owner’s explicit approval. `robots.txt` and `noindex` supplement the Sites access policy; they are not access controls.
