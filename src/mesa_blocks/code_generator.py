"""Generate runnable Mesa Python code from a model configuration."""


def generate_code(config):
    """Convert a flat model config dict into clean, runnable Python source code."""
    lines = []

    # Imports
    space = config.get("space", {})
    neighborhood = space.get("neighborhood", "moore")
    grid_class = (
        "OrthogonalVonNeumannGrid" if neighborhood == "von_neumann" else "OrthogonalMooreGrid"
    )

    lines.append("import mesa")
    lines.append(f"from mesa.discrete_space import CellAgent, {grid_class}")
    lines.append("")
    lines.append("")

    # Agent classes
    for agent_cfg in config.get("agents", []):
        name = agent_cfg["name"]
        lines.append(f"class {name}(CellAgent):")
        lines.append(f'    """Agent type: {name}."""')
        lines.append("")
        lines.append("    def __init__(self, model):")
        lines.append("        super().__init__(model)")
        lines.append("")
        lines.append("    def step(self):")

        behaviors = agent_cfg.get("behaviors", [])
        if not behaviors:
            lines.append("        pass")
        else:
            for beh in behaviors:
                code_lines = _behavior_to_code(beh)
                lines.extend(code_lines)

        lines.append("")
        lines.append("")

    # Model class
    w = int(space.get("width", 20))
    h = int(space.get("height", 20))
    torus = bool(space.get("torus", True))

    lines.append("class MyModel(mesa.Model):")
    lines.append('    """Auto-generated Mesa model."""')
    lines.append("")
    lines.append("    def __init__(self, seed=None):")
    lines.append("        super().__init__(rng=seed)")
    lines.append(
        f"        self.grid = {grid_class}(({w}, {h}), torus={torus}, random=self.random)"
    )
    lines.append("")

    for agent_cfg in config.get("agents", []):
        name = agent_cfg["name"]
        count = int(agent_cfg.get("count", 50))
        lines.append(f"        for _ in range({count}):")
        lines.append(f"            agent = {name}(self)")
        lines.append("            agent.cell = self.grid.select_random_empty_cell()")
        lines.append("")

    lines.append("    def step(self):")
    lines.append('        self.agents.shuffle_do("step")')
    lines.append("")
    lines.append("")

    # Main block
    seed = int(config.get("seed", 42))
    steps = int(config.get("steps", 100))
    lines.append('if __name__ == "__main__":')
    lines.append(f"    model = MyModel(seed={seed})")
    lines.append(f"    for _ in range({steps}):")
    lines.append("        model.step()")
    lines.append('    print(f"Finished. Agents remaining: {len(model.agents)}")')
    lines.append("")

    return "\n".join(lines)


def _behavior_to_code(behavior):
    """Return indented lines of step() code for one behavior."""
    btype = behavior["subtype"]
    props = behavior.get("properties", {})
    lines = []

    if btype == "move_random":
        lines.append("        neighbors = list(self.cell.neighborhood)")
        lines.append("        if neighbors:")
        lines.append("            self.cell = self.random.choice(neighbors)")

    elif btype == "move_to_empty":
        lines.append("        empty = [c for c in self.cell.neighborhood if c.is_empty]")
        lines.append("        if empty:")
        lines.append("            self.cell = self.random.choice(empty)")

    elif btype == "die":
        prob = float(props.get("probability", 0.05))
        lines.append(f"        if self.random.random() < {prob}:")
        lines.append("            self.remove()")
        lines.append("            return")

    elif btype == "reproduce":
        prob = float(props.get("probability", 0.05))
        lines.append(f"        if self.random.random() < {prob}:")
        lines.append("            empty = [c for c in self.cell.neighborhood if c.is_empty]")
        lines.append("            if empty:")
        lines.append("                child = type(self)(self.model)")
        lines.append("                child.cell = self.random.choice(empty)")

    return lines
