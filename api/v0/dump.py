# python3 uwsgi
# for /dump/

import base64
import binascii
import collections
import hashlib
import json
import re
import time
import traceback
import sqlite3
import zlib

import requests
import wand.image

from api_common import get_post_form

DumpEntry = collections.namedtuple('DumpEntry', 'namespace crtime mtime dumpid dumphash dumpfilehash upstreamurl extra clienthash')

dump_con = sqlite3.connect('dump.db')
dump_cur = dump_con.cursor()

with open('webhook_url_dump') as f:
    webhooks = json.load(f)

def send_to_webhook(webhook_url, filename, blob):

    r = requests.post(webhook_url, files={'file': (filename, blob)})
    js = r.json()
    ret = {'success': r.ok, 'statusCode': r.status_code, 'response': js}
    try:
        ret['url'] = str(js['attachments'][0]['url'])
    except (LookupError, TypeError, ValueError) as ex:
        return None
    return ret

def upload(form):
    upload = form['upload']
    if upload is None or upload.filename is None or upload.file is None:
        return ('400 Bad Request', 'Invalid Upload')
    webhook = webhooks.get(form.getvalue('dump-location', 'default'), webhooks['default'])
    ret = send_to_webhook(webhook, upload.filename, upload.file)
    if ret is None:
        return ('503 Service Unavailable', 'Backend Down')
    del ret['response']
    return (str(ret['statusCode']), ret, [('access-control-allow-origin', '*')])

re_strip = re.compile(r'[^0-9A-Za-z\-_=]|(^$)')
re_eq = re.compile(r'=')

def image_hash(blob):
    try:
        with wand.image.Image(blob=blob) as img:
            img_data = img.make_blob(format='rgba')
            hash_obj = hashlib.sha3_224()
            hash_obj.update(img_data)
            return base64.b64encode(hash_obj.digest(), altchars=b'-_')[:-2].decode()
    except Exception:
        traceback.print_exc()
    return None

def validate(form):
    namespace = form.getvalue('dump-location', 'default')
    if re_strip.search(namespace):
        return (False, '400 Bad Request', 'Invalid Dump Location')
    if len(namespace) > 64:
        return (False, '400 Bad Request', 'Bad Location Size')
    dump_id = form.getvalue('dump-id', '')
    if re_strip.search(dump_id):
        return (False, '400 Bad Request', 'Invalid Dump ID')
    return (True, namespace, dump_id)

def dump(form):
    dump_file = form['dump-file']
    if dump_file is None or dump_file.file is None:
        return ('400 Bad Request', 'Invalid Dump')
    ok, a, b, = validate(form)
    if ok:
        namespace, dump_id = a, b
    else:
        return (a, b)
    dump_ext = form.getvalue('dump-ext', '')
    if re_strip.search(dump_ext):
        return ('400 Bad Request', 'Invalid Dump Extension')
    if len(dump_ext) > 16:
        return ('400 Bad Request', 'Bad Extension Size')
    if namespace not in webhooks: namespace = 'default'
    dump_data = []
    hash_obj = hashlib.sha3_224()
    for blob in dump_file.file:
        dump_data.append(blob)
        hash_obj.update(blob)
    dump_data = b''.join(dump_data)
    dump_file_hash = base64.b64encode(hash_obj.digest(), altchars=b'-_')[:-2].decode()
    dump_hash = None
    need_upload = False
    entry = dump_cur.execute('SELECT * FROM dump WHERE namespace=? AND dumpid=?', (namespace, dump_id)).fetchone()
    now = int(time.time())
    if entry is not None:
        entry = DumpEntry(*entry)
        if dump_file_hash != entry.dumpfilehash:
            dump_hash = image_hash(dump_data)
            if dump_hash != entry.dumphash:
                need_upload = True
    else:
        dump_hash = image_hash(dump_data)
        if dump_hash is None:
            dump_hash = dump_file_hash
        need_upload = True
    xxh = form.getvalue('dump-xxhash', '')
    if need_upload:
        webhook = webhooks[namespace]
        resp = send_to_webhook(webhook, re_eq.sub(dump_id, ',') + '.' + dump_ext, dump_data)
        if resp is None:
            dump_con.rollback()
            return ('503 Service Unavailable', 'Backend Down')
        if entry is None:
            entry = DumpEntry(namespace, now, now, dump_id, dump_hash, dump_file_hash, resp['url'], json.dumps(resp['response']).encode(), xxh)
            dump_cur.execute('INSERT INTO dump VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', entry)
        else:
            dump_cur.execute('UPDATE dump SET mtime=?,dumphash=?,dumpfilehash=?,upstreamurl=?,extra=?,clienthash=? WHERE namespace=? and dumpid=?',
                (now, dump_hash, dump_file_hash, resp['url'], json.dumps(resp['response']).encode(), xxh, namespace, dump_id))
        dump_con.commit()
        del resp['response']
        return (str(resp['statusCode']), resp, [('access-control-allow-origin', '*')])
    else:
        dump_cur.execute('UPDATE dump SET clienthash=? WHERE namespace=? and dumpid=?', (xxh, namespace, dump_id))
        dump_con.commit()
        return ('200 OK', {'success': True, 'statusCode': '200 OK', 'url': entry.upstreamurl}, [('access-control-allow-origin', '*')])

def check(form):
    dump_xxhash = form.getvalue('dump-xxhash', '')
    ok, a, b, = validate(form)
    if ok:
        namespace, dump_id = a, b
    else:
        return (a, b)
    entry = dump_cur.execute('SELECT * FROM dump WHERE namespace=? and dumpid=? and clienthash=?', (namespace, dump_id, dump_xxhash)).fetchone()
    if entry:
        entry = DumpEntry(*entry)
        return ('200 OK', {'success': True, 'statusCode': '200 OK', 'url': entry.upstreamurl}, [('access-control-allow-origin', '*')])
    else:
        return ('200 OK', {'success': False, 'statusCode': '200 OK', 'url': None}, [('access-control-allow-origin', '*')])

def post(env, relative_uri):
    form = get_post_form(env)
    action = form.getvalue('action', '')
    if action == 'upload' and 'upload' in form:
        return upload(form)
    if action == 'dump' and 'dump-file' in form:
        try:
            return dump(form)
        except BaseException as ex:
            dump_con.rollback()
            raise ex
    if action == 'dump-check' and 'dump-xxhash' in form:
        return check(form)
    return ('400 Bad Request', 'Unsupported action')

def get(env, relative_uri):
    # server still python 3.8
    encoded_tail = relative_uri[len('/dump/'):]
    try:
        comp_uri = base64.b64decode(encoded_tail, altchars=b'-_', validate=True)
    except binascii.Error:
        return ('404 Not Found', 'Not base64url')
    try:
        payload = zlib.decompress(comp_uri)
        s0 = int.from_bytes(payload[0:8], byteorder='little')
        s1 = int.from_bytes(payload[8:16], byteorder='little')
        fname = payload[16:].decode()
        uri = f'https://cdn.discordapp.com/attachments/{s0}/{s1}/{fname}'
    except Exception:
        return ('404 Not Found', 'Bad Format')
    return ('302 Found', uri)
