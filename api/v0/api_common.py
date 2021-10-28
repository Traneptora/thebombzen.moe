# python3 uwsgi
# api_common.py
# api common methods

import base64
import cgi
import hashlib

import requests
import wand.image

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

def get_post_form(environ):
    input = environ['wsgi.input']
    post_form = environ.get('wsgi.post_form')
    if (post_form is not None
        and post_form[0] is input):
        return post_form[2]
    # This must be done to avoid a bug in cgi.FieldStorage
    environ.setdefault('QUERY_STRING', '')
    fs = cgi.FieldStorage(fp=environ['wsgi.input'],
                          environ=environ,
                          keep_blank_values=1)
    new_input = InputProcessed()
    post_form = (new_input, input, fs)
    environ['wsgi.post_form'] = post_form
    environ['wsgi.input'] = new_input
    return fs

def send_to_webhook(webhook_url, filename, blob, content=None):
    r = requests.post(webhook_url, files={'file': (filename, blob)}, data=({'content': content} if content is not None else None))
    js = r.json()
    ret = {'success': r.ok, 'statusCode': r.status_code, 'response': js}
    try:
        ret['url'] = str(js['attachments'][0]['url'])
    except (LookupError, TypeError, ValueError) as ex:
        return None
    return ret

class InputProcessed(object):
    def read(self, *args):
        raise EOFError('The wsgi.input stream has already been consumed')
    readline = readlines = __iter__ = read
