#!/usr/bin/env python3
"""MARK1 CRM — QA statik server (:8000).

Nginx'ning `$uri.html` fallback qoidasini takrorlaydi: `/payment` kabi
toza URL'lar QA'da ham `payment.html` ni ochadi (production'da nginx
shu qoidani ishlatadi). `python3 -m http.server` bunday qilmasligi
sababli toza havolalar QA'da 404 bo'lardi.

Ishga tushirish:  python3 qa-serve.py [port]
"""
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))


class NginxFallbackHandler(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = super().translate_path(path)
        # Yo'q fayl/kdir uchun avval `path + ".html"` ni tekshiramiz
        # (faqat kengaytirilmagan yo'llar uchun).
        if not os.path.exists(p) and "." not in os.path.basename(p):
            candidate = p + ".html"
            if os.path.exists(candidate):
                return candidate
        return p

    def log_message(self, fmt, *args):
        sys.stderr.write("[qa-web] %s\n" % (fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = NginxFallbackHandler
    handler.directory = ROOT  # SimpleHTTPRequestHandler (Py3.7+)
    http.server.ThreadingHTTPServer(("0.0.0.0", port), handler).serve_forever()


if __name__ == "__main__":
    main()
