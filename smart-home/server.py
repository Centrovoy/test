#!/usr/bin/env python3
"""Локальный сервер «Умной квартиры».

Отдаёт статические файлы проекта и хранит паспорт квартиры и документы на диске,
чтобы всё работало без облака. Только стандартная библиотека Python 3.8+.

    python3 server.py               # http://localhost:8080
    python3 server.py --port 9000 --data /путь/к/данным

Данные (папка data/ по умолчанию):
    items.json        — позиции паспорта
    docs.json         — записи загруженных документов
    uploads/<id>.<ext> — файлы загруженных документов
Документы из папки проекта docs/ (manifest.json) показываются всегда, только для чтения.
"""
import argparse
import json
import mimetypes
import os
import re
import shutil
import sys
import threading
import time
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
LOCK = threading.Lock()
ID_RE = re.compile(r'^[A-Za-z0-9_\-.~:@+]{1,200}$')
MAX_UPLOAD = 50 * 1024 * 1024


class Store:
    def __init__(self, data_dir: Path):
        self.dir = data_dir
        self.uploads = data_dir / 'uploads'
        self.uploads.mkdir(parents=True, exist_ok=True)
        self.items_file = data_dir / 'items.json'
        self.docs_file = data_dir / 'docs.json'

    def _read(self, path, default):
        try:
            return json.loads(path.read_text('utf-8'))
        except FileNotFoundError:
            return default

    def _write(self, path, data):
        # запись через временный файл и резервная копия предыдущей версии
        tmp = path.with_suffix('.tmp')
        tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), 'utf-8')
        if path.exists():
            shutil.copyfile(path, path.with_suffix('.bak'))
        os.replace(tmp, path)

    # позиции: None означает «ещё не заводили» — тогда страница возьмёт начальный список
    def items(self):
        return self._read(self.items_file, None)

    def save_items(self, items):
        self._write(self.items_file, items)

    def docs(self):
        return self._read(self.docs_file, [])

    def save_docs(self, docs):
        self._write(self.docs_file, docs)


def repo_docs():
    try:
        manifest = json.loads((ROOT / 'docs' / 'manifest.json').read_text('utf-8'))
    except FileNotFoundError:
        return []
    return [{**d, 'url': f"docs/{d['path']}", 'readonly': True} for d in manifest]


class Handler(SimpleHTTPRequestHandler):
    store: Store = None

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, fmt, *args):
        # в журнал пишем только обращения к API и ошибки, статику не засоряем
        line = fmt % args
        if '/api/' in line or 'code' in fmt:
            sys.stderr.write('%s %s\n' % (self.log_date_time_string(), line))

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    # ---- helpers ----
    def _json(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self, limit=10 * 1024 * 1024):
        n = int(self.headers.get('Content-Length') or 0)
        if n > limit:
            raise ValueError('слишком большой запрос')
        return self.rfile.read(n)

    def _route(self):
        path = unquote(urlparse(self.path).path)
        return [p for p in path.split('/') if p]

    # ---- API ----
    def do_GET(self):
        parts = self._route()
        if parts[:1] == ['api']:
            if parts == ['api', 'health']:
                return self._json(200, {'ok': True})
            if parts == ['api', 'items']:
                return self._json(200, {'items': self.store.items()})
            if parts == ['api', 'docs']:
                return self._json(200, {'docs': repo_docs() + self.store.docs()})
            return self._json(404, {'error': 'нет такого адреса'})
        if parts[:1] == ['uploads'] and len(parts) == 2 and ID_RE.match(parts[1]):
            f = self.store.uploads / parts[1]
            if f.is_file():
                self.send_response(200)
                self.send_header('Content-Type', mimetypes.guess_type(f.name)[0] or 'application/octet-stream')
                self.send_header('Content-Length', str(f.stat().st_size))
                self.end_headers()
                with f.open('rb') as fh:
                    shutil.copyfileobj(fh, self.wfile)
                return
            return self._json(404, {'error': 'файл не найден'})
        if parts[:1] == ['data']:
            return self._json(403, {'error': 'нет доступа'})
        return super().do_GET()

    def do_PUT(self):
        parts = self._route()
        try:
            if len(parts) == 3 and parts[:2] == ['api', 'items'] and ID_RE.match(parts[2]):
                item = json.loads(self._body())
                item['id'] = parts[2]
                item['updatedAt'] = datetime.now().isoformat(timespec='seconds')
                with LOCK:
                    items = self.store.items() or []
                    items = [x for x in items if x.get('id') != parts[2]] + [item]
                    self.store.save_items(items)
                return self._json(200, item)
            if parts == ['api', 'items']:
                items = json.loads(self._body(50 * 1024 * 1024))
                if not isinstance(items, list):
                    return self._json(400, {'error': 'ожидался массив записей'})
                items = [x for x in items if isinstance(x, dict) and x.get('id') and x.get('name')]
                with LOCK:
                    self.store.save_items(items)
                return self._json(200, {'count': len(items)})
            if len(parts) == 3 and parts[:2] == ['api', 'docs'] and ID_RE.match(parts[2]):
                doc = json.loads(self._body())
                with LOCK:
                    docs = self.store.docs()
                    cur = next((d for d in docs if d['id'] == parts[2]), None)
                    if not cur:
                        return self._json(404, {'error': 'документ из папки проекта меняется только в docs/manifest.json'})
                    for k in ('title', 'kind', 'room', 'date', 'notes', 'items'):
                        if k in doc:
                            cur[k] = doc[k]
                    self.store.save_docs(docs)
                return self._json(200, cur)
        except (ValueError, json.JSONDecodeError) as e:
            return self._json(400, {'error': str(e)})
        return self._json(404, {'error': 'нет такого адреса'})

    def do_POST(self):
        parts = self._route()
        if parts == ['api', 'docs']:
            # тело — сам файл; метаданные в заголовках (имя в URL-кодировке)
            n = int(self.headers.get('Content-Length') or 0)
            if n <= 0 or n > MAX_UPLOAD:
                return self._json(400, {'error': 'файл пустой или больше 50 МБ'})
            name = unquote(self.headers.get('X-Filename', 'file'))
            meta = json.loads(unquote(self.headers.get('X-Meta', '%7B%7D')))
            ext = Path(name).suffix.lower()[:8] or mimetypes.guess_extension(self.headers.get('Content-Type', '')) or ''
            doc_id = f"doc-{int(time.time() * 1000):x}"
            fname = f'{doc_id}{ext}'
            with (self.store.uploads / fname).open('wb') as fh:
                left = n
                while left:
                    chunk = self.rfile.read(min(left, 1 << 20))
                    if not chunk:
                        break
                    fh.write(chunk)
                    left -= len(chunk)
            doc = {
                'id': doc_id, 'title': meta.get('title') or Path(name).stem, 'kind': meta.get('kind', 'other'),
                'room': meta.get('room', ''), 'items': meta.get('items', []), 'date': '', 'notes': '',
                'file': fname, 'url': f'uploads/{fname}', 'contentType': self.headers.get('Content-Type', ''), 'size': n,
            }
            with LOCK:
                docs = self.store.docs()
                docs.append(doc)
                self.store.save_docs(docs)
            return self._json(200, doc)
        return self._json(404, {'error': 'нет такого адреса'})

    def do_DELETE(self):
        parts = self._route()
        if len(parts) == 3 and parts[:2] == ['api', 'items'] and ID_RE.match(parts[2]):
            with LOCK:
                items = [x for x in (self.store.items() or []) if x.get('id') != parts[2]]
                self.store.save_items(items)
            return self._json(200, {'ok': True})
        if len(parts) == 3 and parts[:2] == ['api', 'docs'] and ID_RE.match(parts[2]):
            with LOCK:
                docs = self.store.docs()
                doc = next((d for d in docs if d['id'] == parts[2]), None)
                if not doc:
                    return self._json(404, {'error': 'документ из папки проекта удаляется только из docs/'})
                self.store.save_docs([d for d in docs if d['id'] != parts[2]])
                f = self.store.uploads / doc['file']
                if f.is_file():
                    f.unlink()
            return self._json(200, {'ok': True})
        return self._json(404, {'error': 'нет такого адреса'})


def main():
    ap = argparse.ArgumentParser(description='Умная квартира — локальный сервер')
    ap.add_argument('--port', type=int, default=int(os.environ.get('PORT', 8080)))
    ap.add_argument('--host', default=os.environ.get('HOST', '0.0.0.0'))
    ap.add_argument('--data', default=os.environ.get('DATA_DIR', str(ROOT / 'data')))
    args = ap.parse_args()
    Handler.store = Store(Path(args.data))
    mimetypes.add_type('application/javascript', '.js')
    mimetypes.add_type('image/webp', '.webp')
    srv = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f'Умная квартира: http://localhost:{args.port}  (данные: {Path(args.data).resolve()})', flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
