import os
import json
import higgsfield_client


def handler(request):
    """Vercel serverless function - Higgsfield ile görsel üretimi."""
    if request.method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": "",
        }

    if request.method != "POST":
        return {"statusCode": 405, "body": json.dumps({"error": "Method not allowed"})}

    try:
        data = json.loads(request.body)
    except Exception:
        return {"statusCode": 400, "body": json.dumps({"error": "Geçersiz istek"})}

    prompt = data.get("prompt", "").strip()
    if not prompt:
        return {"statusCode": 400, "body": json.dumps({"error": "Prompt boş olamaz"})}

    resolution = data.get("resolution", "2K")
    aspect_ratio = data.get("aspect_ratio", "1:1")

    try:
        result = higgsfield_client.subscribe(
            "bytedance/seedream/v4/text-to-image",
            arguments={
                "prompt": prompt,
                "resolution": resolution,
                "aspect_ratio": aspect_ratio,
                "camera_fixed": False,
            },
        )
        image_url = result["images"][0]["url"]

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps({"url": image_url}),
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps({"error": str(e)}),
        }
