import json
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)

        try:
            data = json.loads(body)
        except Exception:
            self._respond(400, {"error": "Geçersiz istek"})
            return

        prompt = data.get("prompt", "").strip()
        if not prompt:
            self._respond(400, {"error": "Prompt boş olamaz"})
            return

        try:
            import os
            os.environ.setdefault("HF_API_KEY", os.getenv("HF_API_KEY", ""))
            os.environ.setdefault("HF_API_SECRET", os.getenv("HF_API_SECRET", ""))
            import higgsfield_client

            model = data.get("model", "nano-banana-pro")
            result = higgsfield_client.subscribe(
                model,
                arguments={
                    "prompt": prompt,
                    "resolution": data.get("resolution", "2k").lower(),
                    "aspect_ratio": data.get("aspect_ratio", "1:1"),
                },
            )
            self._respond(200, {"url": result["images"][0]["url"]})
        except Exception as e:
            self._respond(500, {"error": str(e)})

    def _respond(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
