# python3 uwsgi
# for pr-data

import collections
import json
import os
import sqlite3
import sys
import time

import requests

from api_common import get_post_form, image_hash, send_to_webhook

PrDataEntry = collections.namedtuple('PrDataEntry', [
    'imagehash', 'crtime', 'mtime', 'original', 'extension',
    'projectseries', 'projecttype', 'projectname',
    'filesize', 'clienthash', 'messageid',
    ])

prdata_con = sqlite3.connect('pr-data.db')
prdata_cur = prdata_con.cursor()

def eprint(*args, **kwargs):
    kwargs['file'] = sys.stderr
    print(*args, **kwargs)

# will later wrap python.logging
def logprint(*args, **kwargs):
    eprint(*args, **kwargs)

def post(env, relative_uri):
    form = get_post_form(env)
    action = form.getvalue('action', '')
    try:
        if action == 'submit':
            return submit(form)
        if action == 'check':
            return check(form)
    except BaseException as ex:
        prdata_con.rollback()
        raise ex
    return ('400 Bad Request', 'Unsupported action')

def find(xxh):
    entry = prdata_cur.execute('SELECT * FROM prdata WHERE clienthash=?', (xxh,)).fetchone()
    return PrDataEntry(*entry) if entry is not None else None

def check(form):
    xxh = form.getvalue('client-xxhash', '')
    if len(xxh) == 0:
        return ('200 OK', {'success': True, 'cacheHit': False})
    entry = find(xxh)
    if entry is None:
        return ('200 OK', {'success': True, 'cacheHit': False})
    return ('200 OK', {'success': True, 'cacheHit': True,
        'projectSeries': entry.projectseries, 'projectType': entry.projecttype, 'projectName': entry.projectname})

def submit(form):
    project_series = form.getvalue('project-series', '')
    project_type = form.getvalue('project-type', '')
    project_name = form.getvalue('project-name', '')
    entry = None
    if bool(form.getvalue('use-cached-upload', False)):
        entry = find(form.getvalue('client-xxhash', ''))
    results_screenshot = form['results-screenshot'] if 'results-screenshot' in form else None
    if project_series == '' or project_name == '' or entry is None and (results_screenshot is None or results_screenshot.filename is None or results_screenshot.filename == ''):
        return ('400 Bad Request', None)
    now = int(time.time())
    blob = results_screenshot.file.read() if entry is None else None
    filesize = len(blob) if entry is None else entry.filesize
    sent_image_hash = image_hash(blob) if entry is None else entry.imagehash
    clienthash = form.getvalue('client-xxhash', '')
    if not sent_image_hash:
        return ('415 Unsupported Media Type', {'success': False, 'color': 'error', 'status': 'Invalid Upload.', 'extra': 'Unsupported File.'})
    original = results_screenshot.filename if entry is None else entry.original
    entry = prdata_cur.execute('SELECT * FROM prdata WHERE imagehash=?', (sent_image_hash,)).fetchone()
    need_upload = True
    if entry:
        entry = PrDataEntry(*entry)
        if entry.projectname == project_name and entry.projectseries == project_series:
            need_upload = False
    if need_upload:
        content = f'Image Hash: `{sent_image_hash}`\nOriginal: `{original}`\nUpload Timestamp: <t:{entry.crtime if entry else now}>\n'
        content += f'Project Type: `{project_type}`\nProject Series: `{project_series.upper()}`\nProject Name: `{project_name}`\n'
        with open('webhook_url_pr_data') as f:
            webhooks = json.load(f)
        webhook = webhooks['pr-data']
        try:
            ext = original[original.rindex('.'):]
        except ValueError:
            # no extension
            ext  = '.png'
        if entry:
            content += f'Edit Timestamp: <t:{now}>'
            resp = requests.patch(f'{webhook}/messages/{entry.messageid}', data={'content': content})
            if resp.ok:
                prdata_cur.execute('UPDATE prdata SET mtime=?, original=?, extension=?, projectseries=?, projecttype=?, projectname=?, filesize=?, clienthash=? WHERE imagehash=?',
                    (now, original, ext, project_series, project_type, project_name, filesize, clienthash, sent_image_hash))
                prdata_con.commit()
                return ('200 OK', {'color': 'ok', 'status': 'Metadata Updated.',
                    'extra': f'Project Series: {project_series.upper()}. Project Name: {project_name}.'})
            else:
                prdata_con.rollback()
                return ('502 Bad Gateway', 'Error in backend.')
        else:
            resp = requests.post(webhook, files={'file': (sent_image_hash + ext, blob)}, data={'content': content})
            if resp.ok:
                message_id = int(resp.json()['id'])
                prdata_cur.execute('INSERT INTO prdata VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', (sent_image_hash, now, now, original, ext,
                    project_series, project_type, project_name, filesize, clienthash, message_id))
                prdata_con.commit()
                return ('200 OK', {'success': True, 'color': 'ok',
                    'status': 'Upload completed successfully.',
                    'extra': f'Project Series: {project_series.upper()}. Project Name: {project_name}.'})
            else:
                prdata_con.rollback()
                return ('502 Bad Gateway', 'Error in backend.')
    else:
        prdata_cur.execute('UPDATE prdata SET clienthash=? WHERE imagehash=?', (clienthash, sent_image_hash))
        prdata_con.commit()
        return ('200 OK', {'success': True, 'color': 'ok', 'status': 'Exact Duplicate Uploaded.', 'extra': 'No action was performed.'})
