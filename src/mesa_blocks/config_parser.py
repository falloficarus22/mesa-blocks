"""Parse block graph JSON into a flat model configuration."""


def parse_block_graph(graph):
    """Convert block graph {blocks: [...], connections: [...]} to model config.

    Algorithm:
    1. Index blocks by id.
    2. Find the single 'model' block.
    3. Follow 'space' connection from model → space block → extract space config.
    4. Follow 'agents' connections from model → agent blocks.
    5. For each agent block, follow 'behaviors' connections → behavior blocks.
    6. Follow 'data' connections from model → data blocks.
    7. Return flat config dict.
    """
    blocks = {b["id"]: b for b in graph["blocks"]}
    connections = graph["connections"]

    # Find model block
    model_block = next(
        (b for b in blocks.values() if b["type"] == "model"),
        None,
    )
    if model_block is None:
        raise ValueError("No model block found in the block graph.")

    # Space
    space_conn = next(
        (c for c in connections if c["from"] == model_block["id"] and c["fromPort"] == "space"),
        None,
    )
    if space_conn and space_conn["to"] in blocks:
        space_block = blocks[space_conn["to"]]
        space_config = dict(space_block.get("properties", {}))
    else:
        space_config = {
            "width": 20,
            "height": 20,
            "torus": True,
            "neighborhood": "moore",
        }

    # Agents
    agent_conns = [
        c
        for c in connections
        if c["from"] == model_block["id"] and c["fromPort"] == "agents"
    ]
    agent_configs = []
    for ac in agent_conns:
        if ac["to"] not in blocks:
            continue
        agent_block = blocks[ac["to"]]
        # Behaviors connected to this agent
        behavior_conns = [
            c
            for c in connections
            if c["from"] == agent_block["id"] and c["fromPort"] == "behaviors"
        ]
        behaviors = []
        for bc in behavior_conns:
            if bc["to"] not in blocks:
                continue
            b = blocks[bc["to"]]
            behaviors.append({
                "subtype": b["type"],
                "properties": dict(b.get("properties", {})),
            })

        agent_configs.append({
            "name": agent_block["properties"].get("name", "Agent"),
            "count": int(agent_block["properties"].get("count", 50)),
            "color": agent_block["properties"].get("color", "#3b82f6"),
            "behaviors": behaviors,
        })

    # Data collectors
    data_conns = [
        c
        for c in connections
        if c["from"] == model_block["id"] and c["fromPort"] == "data"
    ]
    data_configs = []
    for dc in data_conns:
        if dc["to"] not in blocks:
            continue
        d = blocks[dc["to"]]
        data_configs.append({
            "subtype": d["type"],
            "properties": dict(d.get("properties", {})),
        })

    return {
        "seed": int(model_block["properties"].get("seed", 42)),
        "steps": int(model_block["properties"].get("steps", 100)),
        "space": space_config,
        "agents": agent_configs,
        "data": data_configs,
    }
