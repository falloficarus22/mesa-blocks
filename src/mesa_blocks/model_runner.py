"""Run Mesa models dynamically from a block configuration."""

import mesa
from mesa.discrete_space import (
    CellAgent,
    OrthogonalMooreGrid,
    OrthogonalVonNeumannGrid,
)


class DynamicAgent(CellAgent):
    """An agent whose behavior is driven by a JSON configuration."""

    def __init__(self, model, config):
        super().__init__(model)
        self.agent_type_name = config["name"]
        self.display_color = config.get("color", "#3b82f6")
        self._behaviors = list(config.get("behaviors", []))

    def step(self):
        for behavior in self._behaviors:
            # Guard: agent may have been removed by a previous behavior
            if self.cell is None:
                return
            self._execute_behavior(behavior)

    def _execute_behavior(self, behavior):
        btype = behavior["subtype"]
        props = behavior.get("properties", {})

        if btype == "move_random":
            neighbors = list(self.cell.neighborhood)
            if neighbors:
                self.cell = self.random.choice(neighbors)

        elif btype == "move_to_empty":
            empty = [c for c in self.cell.neighborhood if c.is_empty]
            if empty:
                self.cell = self.random.choice(empty)

        elif btype == "die":
            prob = float(props.get("probability", 0.05))
            if self.random.random() < prob:
                self.remove()

        elif btype == "reproduce":
            prob = float(props.get("probability", 0.05))
            if self.random.random() < prob:
                empty = [c for c in self.cell.neighborhood if c.is_empty]
                if empty:
                    child = DynamicAgent(
                        self.model,
                        {
                            "name": self.agent_type_name,
                            "color": self.display_color,
                            "behaviors": self._behaviors,
                        },
                    )
                    child.cell = self.random.choice(empty)


class DynamicModel(mesa.Model):
    """A Mesa model constructed dynamically from a block configuration."""

    def __init__(self, config):
        super().__init__(rng=config.get("seed", 42))
        self.config = config

        # Create space
        space = config.get("space", {})
        w = int(space.get("width", 20))
        h = int(space.get("height", 20))
        torus = bool(space.get("torus", True))

        if space.get("neighborhood") == "von_neumann":
            self.grid = OrthogonalVonNeumannGrid((w, h), torus=torus, random=self.random)
        else:
            self.grid = OrthogonalMooreGrid((w, h), torus=torus, random=self.random)

        # Create agents
        for agent_cfg in config.get("agents", []):
            count = int(agent_cfg.get("count", 50))
            for _ in range(count):
                agent = DynamicAgent(self, agent_cfg)
                agent.cell = self.grid.select_random_empty_cell()

    def step(self):
        """Advance the model by one step."""
        self.agents.shuffle_do("step")

    def get_state(self):
        """Return the current model state as a JSON-serializable dict."""
        agents_list = []
        for agent in self.agents:
            pos = None
            if hasattr(agent, "cell") and agent.cell is not None:
                pos = list(agent.cell.coordinate)
            agents_list.append({
                "id": agent.unique_id,
                "type": getattr(agent, "agent_type_name", "Agent"),
                "color": getattr(agent, "display_color", "#3b82f6"),
                "pos": pos,
            })

        # Count agents by type
        counts = {}
        for ac in self.config.get("agents", []):
            name = ac["name"]
            counts[name] = sum(
                1 for a in self.agents if getattr(a, "agent_type_name", "") == name
            )

        return {
            "step": int(self.time),
            "agents": agents_list,
            "grid_width": int(self.config["space"].get("width", 20)),
            "grid_height": int(self.config["space"].get("height", 20)),
            "counts": counts,
        }
