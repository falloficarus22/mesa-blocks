"""Mesa Blocks — Visual block-based model builder for Mesa."""

__version__ = "0.1.0"


def run(host="127.0.0.1", port=8765, debug=False):
    """Launch the Mesa Blocks editor in the browser."""
    import webbrowser

    from .server import app

    webbrowser.open(f"http://{host}:{port}")
    app.run(host=host, port=port, debug=debug)
