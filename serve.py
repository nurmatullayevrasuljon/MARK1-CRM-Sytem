#!/usr/bin/env python3
"""
MARK1 CRM uchun mahalliy server.
Nginx singari toza URL'larni qo'llab-quvvatlaydi:
  /dashboard  ->  dashboard.html
  /login      ->  login.html
  /signup     ->  signup.html
  /privacy    ->  privacy.html
  /           ->  landing.html (yoki index.html)
"""
import http.server
import os
import sys
import pathlib

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
DIRECTORY = str(pathlib.Path(__file__).resolve().parent / "frontend")


class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        path = self.path.split("?")[0].split("#")[0]

        # Agar fayl to'g'ridan-to'g'ri mavjud bo'lsa
        full = os.path.join(DIRECTORY, path.lstrip("/"))
        if os.path.isfile(full):
            return super().do_GET()

        # Toza URL: /dashboard -> dashboard.html
        clean = path.rstrip("/").lstrip("/")
        if clean:
            html_file = clean + ".html"
            html_full = os.path.join(DIRECTORY, html_file)
            if os.path.isfile(html_full):
                self.path = "/" + html_file
                return super().do_GET()

        # Ildiz: / -> landing.html yoki index.html
        if path in ("/", ""):
            for candidate in ("landing.html", "index.html"):
                if os.path.isfile(os.path.join(DIRECTORY, candidate)):
                    self.path = "/" + candidate
                    return super().do_GET()

        return super().do_GET()

    def do_HEAD(self):
        return self.do_GET()


if __name__ == "__main__":
    print(f"MARK1 mahalliy server: http://localhost:{PORT}")
    print(f"Papka: {DIRECTORY}")
    print(f"To'xtatish: Ctrl+C")
    with http.server.HTTPServer(("127.0.0.1", PORT), CleanURLHandler) as httpd:
        httpd.serve_forever()
