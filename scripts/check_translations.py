import json
import re
import os
import glob
from pathlib import Path

root = Path('.')
keys = set()
for dirpath, dirnames, filenames in os.walk(root):
    if 'node_modules' in dirpath.split(os.sep):
        continue
    if '.git' in dirpath.split(os.sep):
        continue
    for filename in filenames:
        path = Path(dirpath) / filename
        if path.suffix.lower() not in {'.html', '.js', '.md'}:
            continue
        text = path.read_text(encoding='utf-8', errors='ignore')
        keys.update(re.findall(r'data-i18n=["\']([^"\' ]+)["\']', text))
        keys.update(re.findall(r'data-i18n-placeholder=["\']([^"\' ]+)["\']', text))

translations = json.loads(Path('assets/js/translations.json').read_text(encoding='utf-8'))
for lang in ['fr', 'ht']:
    missing = []
    for key in sorted(keys):
        parts = key.split('.')
        val = translations.get(lang)
        for p in parts:
            if isinstance(val, dict) and p in val:
                val = val[p]
            else:
                val = None
                break
        if val is None:
            missing.append(key)

    print(f'Missing {lang.upper()} keys:', len(missing))
    for k in missing:
        print(k)
    print('---')
