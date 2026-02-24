# Mesa Blocks 🧱

**Visual, block-based model builder for Mesa agent-based models.**

Mesa Blocks allows you to rapidly prototype agent-based models by dragging and dropping blocks representing agents, spaces, and behaviors. It provides a live simulation preview and generates clean, idiomatic Python code using the [Mesa](https://github.com/mesa/mesa) framework.

![Mesa Blocks Interface](https://raw.githubusercontent.com/mesa/mesa/main/docs/img/mesa_logo.png) <!-- Replace with actual screenshot later -->

## Features

-   🏗️ **Visual Editor**: Drag blocks onto a canvas and wire them together to define your model.
-   ▶️ **Live Preview**: Run simulations directly in the browser with real-time grid and chart visualizations.
-   📄 **Code Generation**: Instant preview of runnable Python code that matches your visual model.
-   💾 **Save/Load**: Export your model configurations as JSON to share or resume later.
-   🐍 **Standard Mesa**: Generated code uses standard `mesa.Model` and `mesa.Agent` patterns.

## Installation

```bash
# Clone the repository
git clone https://github.com/youruser/mesa-blocks
cd mesa-blocks

# Install in editable mode
pip install -e .
```

## Usage

Launch the visual editor:

```bash
mesa-blocks
```

Or from Python:

```python
import mesa_blocks
mesa_blocks.run()
```

Navigate to `http://127.0.0.1:8765` in your browser.

## Block Types

-   **Model**: The main container for your simulation. Set initial seed and max steps.
-   **Grid Space**: Configure the environment (Width, Height, Torus).
-   **Agent Type**: Define agent classes with specific colors and starting counts.
-   **Behaviors**:
    -   `Move Random`: Standard random walk.
    -   `Move to Empty`: Jump to a random empty neighbor.
    -   `Die`: Probabilistic agent removal.
    -   `Reproduce`: Probabilistic creation of new agents of the same type.
-   **Data**: `Count Agents` to track population over time in the live chart.

## Architecture

Mesa Blocks follows a clean client-server architecture:
-   **Frontend**: Vanilla JS/CSS/HTML with SVG for connections.
-   **Backend**: Flask server that dynamically generates and runs Mesa models.

## License

Apache-2.0
