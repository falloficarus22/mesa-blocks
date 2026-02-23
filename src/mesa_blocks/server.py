"""Flask web server for Mesa Blocks."""

import traceback
from pathlib import Path

from flask import Flask, jsonify, render_template, request

from .code_generator import generate_code
from .config_parser import parse_block_graph
from .model_runner import DynamicModel

_here = Path(__file__).parent

app = Flask(
    __name__,
    template_folder=str(_here / "templates"),
    static_folder=str(_here / "static"),
)

# Global model instance (single-user tool)
_model = None


@app.route("/")
def index():
    """Serve the main editor page."""
    return render_template("index.html")


@app.route("/api/generate", methods=["POST"])
def api_generate():
    """Generate Python code from a block graph."""
    try:
        graph = request.json
        config = parse_block_graph(graph)
        code = generate_code(config)
        return jsonify({"code": code})
    except Exception as e:
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 400


@app.route("/api/start", methods=["POST"])
def api_start():
    """Start a new simulation from a block graph."""
    global _model
    try:
        graph = request.json
        config = parse_block_graph(graph)
        _model = DynamicModel(config)
        return jsonify(_model.get_state())
    except Exception as e:
        _model = None
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 400


@app.route("/api/step", methods=["POST"])
def api_step():
    """Step the running model once and return new state."""
    global _model
    if _model is None:
        return jsonify({"error": "No model running. Start a simulation first."}), 400
    try:
        _model.step()
        return jsonify(_model.get_state())
    except Exception as e:
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500


@app.route("/api/stop", methods=["POST"])
def api_stop():
    """Stop the running simulation and free resources."""
    global _model
    _model = None
    return jsonify({"status": "stopped"})
