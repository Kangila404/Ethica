"""Local public-only API for XCUITest. Run before EthicaUITests (port 3819).

No account endpoints or credentials; unexpected/private requests fail and are logged.
"""
import json
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PORT = 3819
PEOPLE = [
    dict(id="1", name="임마누엘 칸트", era="1724–1804", school="의무론", postCount=2, categories=["philosophy"], imageKey="fixture.jpg"),
    dict(id="2", name="존 스튜어트 밀", era="1806–1873", school="공리주의", postCount=1, categories=["philosophy"], imageKey="fixture.jpg"),
]
POSTS = {
    "6": "칸트의 생애: 쾨니히스베르크에서 시작된 비판",
    "7": "칸트의 의무론: 정언명령과 인간의 존엄",
    "8": "밀의 자유론",
}

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path
        if self.headers.get("Authorization"):
            self.send_error(403, "Public fixture must not receive credentials")
            return
        value = None
        if path == "/api/philosophers":
            time.sleep(float(os.environ.get("ETHICA_CATALOG_DELAY", "0")))
            value = dict(nearest=[], all=PEOPLE)
        elif path in ["/api/philosophers/1", "/api/philosophers/2"]:
            person = PEOPLE[int(path[-1]) - 1]
            ids = ["6", "7"] if person["id"] == "1" else ["8"]
            value = dict(person, coreThought="테스트용 공개 프로필 본문", lifeRoots="생애 소개", posts=[dict(id=i, title=POSTS[i], imageKey="fixture.jpg") for i in ids])
            time.sleep(5)  # Simulated network latency, never an app navigation workaround.
        elif path.startswith("/api/philosophers/post/"):
            post_id = path.split("/")[4]
            if post_id in POSTS:
                if path.endswith("/like"):
                    value = dict(count=12, liked=False)
                else:
                    value = dict(id=post_id, title=POSTS[post_id], philosopherId="1" if post_id in ["6", "7"] else "2", segments=[
                        dict(id=f"{post_id}-{i}", segmentType="text", sortOrder=i, imageKey="fixture.jpg" if i == 0 else None,
                             body=f"PAGE {i + 1}\n" + ("읽기 본문. " * 40) + "\n\n[출처]\n공개 테스트 자료 https://example.org/source") for i in range(4)
                    ])
        elif path == "/api/media/fixture.jpg":
            data = (Path(__file__).resolve().parents[1] / "Ethica/Resources/kant.jpg").read_bytes()
            self.send_response(200); self.send_header("Content-Type", "image/jpeg"); self.end_headers(); self.wfile.write(data)
            return
        if value is None:
            self.send_error(404, "Unexpected/private API")
            return
        data = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.end_headers(); self.wfile.write(data)

if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
