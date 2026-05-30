from __future__ import annotations

import json
import mimetypes
import os
import sys
import urllib.request
import urllib.error
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from pdf_agent.agent import AGENT_VERSION, DEFAULT_MODEL_PATH, PdfSheetAgent
    from pdf_agent.feedback import append_import_feedback, feedback_status
    from pdf_agent.ollama_agent import OllamaPdfSheetAgent, ollama_status
else:
    from .agent import AGENT_VERSION, DEFAULT_MODEL_PATH, PdfSheetAgent
    from .feedback import append_import_feedback, feedback_status
    from .ollama_agent import OllamaPdfSheetAgent, ollama_status


ROOT = Path(__file__).resolve().parents[1]
HOST = "0.0.0.0"
PORT = 8765

CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"


class AgentRequestHandler(SimpleHTTPRequestHandler):
    server_version = "ArkuszownikPdfAgent/0.9"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Filename, X-Pdf-Importer, X-Api-Key, X-Ollama-Model")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "600")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/pdf-agent/status"):
            agent = PdfSheetAgent()
            self._send_json(
                {
                    "ok": True,
                    "serverVersion": self.server_version,
                    "agentVersion": AGENT_VERSION,
                    "trained": agent.is_trained,
                    "modelPath": str(agent.model_path),
                    "modelType": agent.model_type,
                    "ollama": ollama_status(),
                    "feedback": feedback_status(),
                    "privateNetworkCors": True,
                    "message": "Lokalny agent PDF działa.",
                }
            )
            return
        return super().do_GET()

    def do_POST(self):
        # ── Claude API proxy ──────────────────────────────────────────────
        if self.path.startswith("/api/pdf-agent/claude-proxy"):
            self._handle_claude_proxy()
            return

        if self.path.startswith("/api/pdf-agent/feedback"):
            length = int(self.headers.get("Content-Length", "0"))
            data = self.rfile.read(length)
            try:
                payload = json.loads(data.decode("utf-8")) if data else {}
                result = append_import_feedback(payload)
                self._send_json({"ok": True, **result})
            except Exception as exc:
                self._send_json({"ok": False, "error": str(exc)}, status=500)
            return

        if self.path.startswith("/api/pdf-agent/import-solution-image"):
            length = int(self.headers.get("Content-Length", "0"))
            filename = unquote(self.headers.get("X-Filename", "solution.png"))
            ollama_model = self.headers.get("X-Ollama-Model", "").strip()
            data = self.rfile.read(length)
            try:
                agent = OllamaPdfSheetAgent(model=ollama_model) if ollama_model else OllamaPdfSheetAgent()
                result = agent.import_solution_image(data, filename)
                self._send_json(result)
            except Exception as exc:
                self._send_json({"ok": False, "error": str(exc)}, status=500)
            return

        if self.path.startswith("/api/pdf-agent/import-image"):
            length = int(self.headers.get("Content-Length", "0"))
            filename = unquote(self.headers.get("X-Filename", "screen.png"))
            ollama_model = self.headers.get("X-Ollama-Model", "").strip()
            data = self.rfile.read(length)
            try:
                agent = OllamaPdfSheetAgent(model=ollama_model) if ollama_model else OllamaPdfSheetAgent()
                result = agent.import_image(data, filename)
                self._send_json(result)
            except Exception as exc:
                self._send_json({"ok": False, "error": str(exc)}, status=500)
            return

        if not self.path.startswith("/api/pdf-agent/import"):
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", "0"))
        filename = unquote(self.headers.get("X-Filename", "arkusz.pdf"))
        importer = self.headers.get("X-Pdf-Importer", "ml").strip().lower()
        ollama_model = self.headers.get("X-Ollama-Model", "").strip()
        data = self.rfile.read(length)
        try:
            if importer == "ollama":
                agent = OllamaPdfSheetAgent(model=ollama_model) if ollama_model else OllamaPdfSheetAgent()
            else:
                agent = PdfSheetAgent()
            result = agent.import_pdf(data, filename)
            self._send_json(result)
        except Exception as exc:
            self._send_json({"ok": False, "error": str(exc)}, status=500)

    def _handle_claude_proxy(self):
        """
        Proxy POST /api/pdf-agent/claude-proxy → https://api.anthropic.com/v1/messages
        The browser passes its API key in X-Api-Key header.
        The server forwards the request server-side, bypassing browser CORS restrictions.
        """
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length)

            api_key = self.headers.get("X-Api-Key", "").strip()
            if not api_key:
                self._send_json({"error": {"message": "Brak klucza API. Ustaw go w ustawieniach.", "type": "auth_error"}}, status=401)
                return

            req = urllib.request.Request(
                CLAUDE_API_URL,
                data=body,
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=120) as resp:
                resp_body = resp.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(resp_body)))
                self.end_headers()
                self.wfile.write(resp_body)

        except urllib.error.HTTPError as exc:
            err_body = exc.read()
            self.send_response(exc.code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(err_body)))
            self.end_headers()
            self.wfile.write(err_body)
        except Exception as exc:
            self._send_json({"error": {"message": str(exc), "type": "proxy_error"}}, status=502)

    def translate_path(self, path):
        if path == "/":
            return str(ROOT / "index.html")
        safe = Path(unquote(path.split("?", 1)[0].lstrip("/")))
        target = (ROOT / safe).resolve()
        if ROOT not in target.parents and target != ROOT:
            return str(ROOT / "index.html")
        return str(target)

    def guess_type(self, path):
        if path.endswith(".js"):
            return "text/javascript"
        if path.endswith(".css"):
            return "text/css"
        return mimetypes.guess_type(path)[0] or "application/octet-stream"

    def _send_json(self, payload: dict, status: int = 200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    print(f"Arkuszownik PDF agent: http://{HOST}:{PORT}")
    print(f"Frontend: http://{HOST}:{PORT}/")
    print(f"Model: {DEFAULT_MODEL_PATH} ({'jest' if DEFAULT_MODEL_PATH.exists() else 'brak'})")
    HTTPServer((HOST, PORT), AgentRequestHandler).serve_forever()


if __name__ == "__main__":
    main()
