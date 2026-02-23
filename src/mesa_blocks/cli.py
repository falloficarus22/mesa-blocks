"""CLI entry point for mesa-blocks."""

import argparse

from mesa_blocks import run


def main():
    """Launch Mesa Blocks visual editor."""
    parser = argparse.ArgumentParser(description="Launch Mesa Blocks visual editor")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8765, help="Port to listen on")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")
    args = parser.parse_args()
    run(host=args.host, port=args.port, debug=args.debug)


if __name__ == "__main__":
    main()
