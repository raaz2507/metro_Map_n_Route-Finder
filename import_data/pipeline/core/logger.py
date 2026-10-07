import sys
import time

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

class UniversalPipelineLogger:
    """Enterprise UTF-8 SSE and Console Logging Engine."""

    @staticmethod
    def log(tag: str, msg: str):
        ts = time.strftime("%H:%M:%S")
        print(f"[{ts}] [UNIVERSAL PIPELINE ENGINE] [{tag}] {msg}", flush=True)