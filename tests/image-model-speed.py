"""One real, paid image request. Explicit invocation only; never part of npm test."""
import json
import sqlite3
import time
from pathlib import Path

import httpx


def main():
    db_path = Path(__file__).resolve().parents[1] / "data" / "flexiblefox.sqlite"
    with sqlite3.connect(db_path.as_uri() + "?mode=ro", uri=True) as db:
        db.row_factory = sqlite3.Row
        config = db.execute(
            "SELECT model_name, api_key, base_url FROM ai_configurations "
            "WHERE model_type='image' AND model_name=? AND rtrim(base_url, '/')=? "
            "ORDER BY is_selected DESC LIMIT 1",
            ("gpt-image-2.5-flare", "https://api.llms.best/v1"),
        ).fetchone()
    if not config:
        raise SystemExit("没有找到指定模型的本地配置；未发送请求")
    options = {
        "model": config["model_name"], "size": "3840x2160", "n": 1,
        "prompt": "A clean blue editorial illustration about a PC gaming client update. No text, no people.",
    }
    print(json.dumps({"event": "started", **options}, ensure_ascii=False), flush=True)
    started = time.monotonic()
    try:
        with httpx.Client(timeout=180.0) as client:
            response = client.post(config["base_url"].rstrip("/") + "/images/generations",
                                   headers={"Authorization": "Bearer " + config["api_key"]}, json=options)
        elapsed = round(time.monotonic() - started, 2)
        try:
            payload = response.json()
        except ValueError:
            payload = {}
        images = payload.get("data") if isinstance(payload, dict) else None
        print(json.dumps({
            "elapsedSeconds": elapsed, "httpStatus": response.status_code,
            "responseBytes": len(response.content),
            "imageCount": len(images) if isinstance(images, list) else None,
            "imageFormats": ["base64" if item.get("b64_json") else "url" if item.get("url") else "unknown" for item in images] if isinstance(images, list) else [],
            "responseFields": list(payload) if isinstance(payload, dict) else [],
        }, ensure_ascii=False), flush=True)
    except Exception as error:
        print(json.dumps({"elapsedSeconds": round(time.monotonic() - started, 2), "errorType": type(error).__name__}), flush=True)


if __name__ == "__main__":
    main()
