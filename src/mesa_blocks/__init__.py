"""Mesa Blocks — Visual block-based model builder for Mesa."""

__version__ = "0.1.0"


def run(host="127.0.0.1", port=8765, debug=False):
    """Launch the Mesa Blocks editor in the browser."""
    import threading
    import webbrowser

    from .server import app

    def open_browser():
        webbrowser.open(f"http://{host}:{port}")

    # Delay browser opening slightly to ensure server is up
    if not debug:
        threading.Timer(1.0, open_browser).start()

    app.run(host=host, port=port, debug=debug)
