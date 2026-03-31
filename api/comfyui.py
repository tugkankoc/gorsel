import json
import os
from http.server import BaseHTTPRequestHandler
from urllib.request import Request, urlopen
from urllib.parse import urlencode, parse_qs, urlparse


COMFYUI_TUNNEL_URL = os.environ.get('COMFYUI_TUNNEL_URL', '')


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        self._proxy('GET')

    def do_POST(self):
        self._proxy('POST')

    def _proxy(self, method):
        if not COMFYUI_TUNNEL_URL:
            self._respond(503, {"error": "ComfyUI tunnel aktif degil. Bilgisayarinda tunnel.bat calistir."})
            return

        parsed = urlparse(self.path)
        params = parse_qs(parsed.query, keep_blank_values=True)

        # Vercel rewrite ile gelen path
        comfy_path = params.pop('comfy_path', [''])[0]

        # Kalan query parametrelerini ComfyUI'a ilet
        forward_params = {k: v[0] for k, v in params.items()}

        url = f"{COMFYUI_TUNNEL_URL.rstrip('/')}/{comfy_path}"
        if forward_params:
            url += '?' + urlencode(forward_params)

        try:
            data = None
            headers = {}
            if method == 'POST':
                content_length = int(self.headers.get('Content-Length', 0))
                data = self.rfile.read(content_length)
                headers['Content-Type'] = 'application/json'

            req = Request(url, data=data, headers=headers, method=method)

            with urlopen(req, timeout=120) as resp:
                content_type = resp.headers.get('Content-Type', 'application/octet-stream')
                body = resp.read()

                self.send_response(resp.status)
                self.send_header("Content-Type", content_type)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(body)

        except Exception as e:
            self._respond(502, {"error": f"ComfyUI baglantisi kurulamadi: {str(e)}"})

    def _respond(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
