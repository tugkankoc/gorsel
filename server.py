import httpx
from flask import Flask, send_from_directory, request, jsonify, Response

app = Flask(__name__, static_folder='public', static_url_path='')

COMFYUI_URL = 'http://127.0.0.1:8188'


@app.route('/')
def index():
    return send_from_directory('public', 'index.html')


@app.route('/comfyui/<path:path>', methods=['GET', 'POST', 'OPTIONS'])
def comfyui_proxy(path):
    """ComfyUI'a proxy - CORS sorununu ortadan kaldırır."""
    url = f'{COMFYUI_URL}/{path}'

    try:
        with httpx.Client(timeout=120.0) as client:
            if request.method == 'POST':
                resp = client.post(url, content=request.get_data(), headers={'Content-Type': 'application/json'})
            else:
                resp = client.get(url, params=request.args)

        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers = {k: v for k, v in resp.headers.items() if k.lower() not in excluded_headers}

        return Response(resp.content, status=resp.status_code, headers=headers, content_type=resp.headers.get('content-type'))

    except Exception as e:
        return jsonify({'error': f'ComfyUI bağlantısı kurulamadı: {str(e)}'}), 502


if __name__ == '__main__':
    app.run(debug=False, port=5000)
