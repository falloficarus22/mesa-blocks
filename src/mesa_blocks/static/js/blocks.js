/**
 * Mesa Blocks — blocks.js
 * Core block system and workspace management
 */

const BLOCK_DEFS = {
    model: {
        category: "model",
        label: "Model",
        icon: "box",
        color: "#6366f1",
        outputs: [
            { id: "space", label: "Space", type: "space" },
            { id: "agents", label: "Agents", type: "agent", multi: true },
            { id: "data", label: "Data", type: "data", multi: true }
        ],
        props: [
            { name: "seed", type: "number", default: 42, label: "Seed" },
            { name: "steps", type: "number", default: 100, label: "Max Steps" }
        ]
    },
    grid: {
        category: "space",
        label: "Grid Space",
        icon: "map",
        color: "#10b981",
        inputs: [
            { id: "model", label: "Model", type: "space" }
        ],
        props: [
            { name: "width", type: "number", default: 20, label: "Width" },
            { name: "height", type: "number", default: 20, label: "Height" },
            { name: "torus", type: "boolean", default: true, label: "Torus" },
            { name: "neighborhood", type: "select", default: "moore", label: "Neighborhood", options: ["moore", "von_neumann"] }
        ]
    },
    agent: {
        category: "agent",
        label: "Agent Type",
        icon: "user",
        color: "#f59e0b",
        inputs: [
            { id: "model", label: "Model", type: "agent" }
        ],
        outputs: [
            { id: "behaviors", label: "Behaviors", type: "behavior", multi: true }
        ],
        props: [
            { name: "name", type: "text", default: "MyAgent", label: "Name" },
            { name: "count", type: "number", default: 50, label: "Count" },
            { name: "color", type: "color", default: "#3b82f6", label: "Color" }
        ]
    },
    move_random: {
        category: "behavior",
        label: "Move Random",
        icon: "shuffle",
        color: "#ec4899",
        inputs: [
            { id: "agent", label: "Agent", type: "behavior" }
        ],
        props: []
    },
    move_to_empty: {
        category: "behavior",
        label: "Move to Empty",
        icon: "arrow-right",
        color: "#ec4899",
        inputs: [
            { id: "agent", label: "Agent", type: "behavior" }
        ],
        props: []
    },
    die: {
        category: "behavior",
        label: "Die",
        icon: "skull",
        color: "#ef4444",
        inputs: [
            { id: "agent", label: "Agent", type: "behavior" }
        ],
        props: [
            { name: "probability", type: "number", default: 0.05, label: "Probability", min: 0, max: 1, step: 0.01 }
        ]
    },
    reproduce: {
        category: "behavior",
        label: "Reproduce",
        icon: "refresh-cw",
        color: "#22c55e",
        inputs: [
            { id: "agent", label: "Agent", type: "behavior" }
        ],
        props: [
            { name: "probability", type: "number", default: 0.05, label: "Probability", min: 0, max: 1, step: 0.01 }
        ]
    },
    count_agents: {
        category: "data",
        label: "Count Agents",
        icon: "bar-chart-3",
        color: "#8b5cf6",
        inputs: [
            { id: "model", label: "Model", type: "data" }
        ],
        props: [
            { name: "label", type: "text", default: "Agent Count", label: "Chart Label" }
        ]
    }
};

class Block {
    constructor(id, type, x, y, workspace) {
        this.id = id;
        this.type = type;
        this.x = x;
        this.y = y;
        this.workspace = workspace;
        this.def = BLOCK_DEFS[type];
        this.properties = {};

        // Initialize default properties
        if (this.def.props) {
            this.def.props.forEach(p => {
                this.properties[p.name] = p.default;
            });
        }

        this.element = this.createHTMLElement();
        this.workspace.canvasElement.appendChild(this.element);
        this.initDragging();
    }

    createHTMLElement() {
        const el = document.createElement('div');
        el.className = 'block';
        el.dataset.blockId = this.id;
        el.style.left = `${this.x}px`;
        el.style.top = `${this.y}px`;
        el.style.setProperty('--block-color', this.def.color);

        // Convert hex to RGB for semi-transparent glow
        const r = parseInt(this.def.color.slice(1, 3), 16);
        const g = parseInt(this.def.color.slice(3, 5), 16);
        const b = parseInt(this.def.color.slice(5, 7), 16);
        el.style.setProperty('--block-color-rgb', `${r}, ${g}, ${b}`);

        const header = document.createElement('div');
        header.className = 'block-header';
        header.innerHTML = `
            <span class="block-icon"><i data-lucide="${this.def.icon}"></i></span>
            <span class="block-label">${this.def.label}</span>
        `;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'block-delete';
        deleteBtn.innerHTML = '<i data-lucide="x"></i>';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            this.workspace.removeBlock(this.id);
        };
        header.appendChild(deleteBtn);

        const body = document.createElement('div');
        body.className = 'block-body';

        const portsIn = document.createElement('div');
        portsIn.className = 'block-ports-in';
        if (this.def.inputs) {
            this.def.inputs.forEach(input => {
                const port = this.createPortElement(input, 'in');
                portsIn.appendChild(port);
            });
        }

        const portsOut = document.createElement('div');
        portsOut.className = 'block-ports-out';
        if (this.def.outputs) {
            this.def.outputs.forEach(output => {
                const port = this.createPortElement(output, 'out');
                portsOut.appendChild(port);
            });
        }

        body.appendChild(portsIn);
        body.appendChild(portsOut);

        el.appendChild(header);
        el.appendChild(body);

        el.onclick = (e) => {
            e.stopPropagation();
            this.workspace.selectBlock(this.id);
        };

        return el;
    }

    createPortElement(portDef, dir) {
        const el = document.createElement('div');
        el.className = `port port-${dir}`;
        el.dataset.portId = portDef.id;
        el.dataset.portType = portDef.type;
        el.dataset.multi = portDef.multi ? 'true' : 'false';
        el.style.setProperty('--port-color', this.def.color);

        const dot = document.createElement('span');
        dot.className = 'port-dot';

        const label = document.createElement('span');
        label.className = 'port-label';
        label.innerText = portDef.label;

        if (dir === 'in') {
            el.appendChild(dot);
            el.appendChild(label);
        } else {
            el.appendChild(label);
            el.appendChild(dot);
        }

        el.onmousedown = (e) => {
            e.stopPropagation();
            this.workspace.onPortMouseDown(e, this.id, portDef.id, dir);
        };

        return el;
    }

    initDragging() {
        let isDragging = false;
        let startX, startY;

        this.element.onmousedown = (e) => {
            if (e.target.closest('.port') || e.target.closest('.block-delete')) return;

            isDragging = true;
            this.element.classList.add('dragging');
            this.workspace.selectBlock(this.id);

            startX = e.clientX - this.x;
            startY = e.clientY - this.y;

            const onMouseMove = (e) => {
                if (!isDragging) return;
                this.x = e.clientX - startX;
                this.y = e.clientY - startY;

                // Snap to grid (optional, but good for neatness)
                // this.x = Math.round(this.x / 20) * 20;
                // this.y = Math.round(this.y / 20) * 20;

                this.element.style.left = `${this.x}px`;
                this.element.style.top = `${this.y}px`;
                this.workspace.connections.updateBlockConnections(this.id);
            };

            const onMouseUp = () => {
                isDragging = false;
                this.element.classList.remove('dragging');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                this.workspace.onConfigChanged();
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };
    }

    getPortElement(portId, dir) {
        return this.element.querySelector(`.port-${dir}[data-port-id="${portId}"]`);
    }

    getPortCenter(portId, dir) {
        const portEl = this.getPortElement(portId, dir);
        if (!portEl) return null;
        const dot = portEl.querySelector('.port-dot');
        const rect = dot.getBoundingClientRect();
        const canvasRect = this.workspace.canvasElement.getBoundingClientRect();
        return {
            x: rect.left - canvasRect.left + rect.width / 2,
            y: rect.top - canvasRect.top + rect.height / 2
        };
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            x: this.x,
            y: this.y,
            properties: this.properties
        };
    }
}

class Workspace {
    constructor(canvasId, svgId) {
        this.canvasElement = document.getElementById(canvasId);
        this.svgElement = document.getElementById(svgId);
        this.blocks = new Map();
        this.selectedBlockId = null;
        this.nextBlockId = 1;

        // Modules will be initialized in app.js
        this.connections = null;
        this.properties = null;

        this.initEvents();
    }

    initEvents() {
        this.canvasElement.onclick = () => {
            this.selectBlock(null);
        };

        // Toolbox drag-drop handling
        this.canvasElement.ondragover = (e) => {
            e.preventDefault();
        };

        this.canvasElement.ondrop = (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('block-type');
            if (type) {
                const rect = this.canvasElement.getBoundingClientRect();
                const x = e.clientX - rect.left - 40; // Roughly center the block
                const y = e.clientY - rect.top - 20;
                this.addBlock(type, x, y);
            }
        };

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Only delete if we are not in an input field
                if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA' && this.selectedBlockId) {
                    this.removeBlock(this.selectedBlockId);
                }
            }
        });
    }

    addBlock(type, x, y, id = null, properties = null) {
        const blockId = id || `b${this.nextBlockId++}`;
        const block = new Block(blockId, type, x, y, this);
        if (properties) {
            block.properties = { ...block.properties, ...properties };
        }
        this.blocks.set(blockId, block);

        // Hide hint if it was visible
        const hint = document.getElementById('workspace-hint');
        if (hint) hint.classList.add('hidden');

        this.selectBlock(blockId);

        // Initialize new icons
        if (window.lucide) {
            window.lucide.createIcons();
        }

        this.onConfigChanged();
        return block;
    }

    removeBlock(id) {
        const block = this.blocks.get(id);
        if (!block) return;

        this.connections.removeBlockConnections(id);
        block.element.remove();
        this.blocks.delete(id);

        if (this.selectedBlockId === id) {
            this.selectBlock(null);
        }

        if (this.blocks.size === 0) {
            const hint = document.getElementById('workspace-hint');
            if (hint) hint.classList.remove('hidden');
        }

        this.onConfigChanged();
    }

    selectBlock(id) {
        if (this.selectedBlockId) {
            const old = this.blocks.get(this.selectedBlockId);
            if (old) old.element.classList.remove('selected');
        }

        this.selectedBlockId = id;

        if (id) {
            const block = this.blocks.get(id);
            if (block) {
                block.element.classList.add('selected');
                if (this.properties) this.properties.show(block);
            }
        } else {
            if (this.properties) this.properties.hide();
        }
    }

    onPortMouseDown(e, blockId, portId, dir) {
        if (this.connections) {
            this.connections.startPendingConnection(blockId, portId, dir);
        }
    }

    onConfigChanged() {
        // App will listen to this to update code preview etc.
        window.dispatchEvent(new CustomEvent('mesa-blocks-changed'));
    }

    getConfig() {
        const blocks = Array.from(this.blocks.values()).map(b => b.toJSON());
        const connections = this.connections ? this.connections.toJSON() : [];
        return { blocks, connections };
    }

    loadConfig(config) {
        // Clear current
        Array.from(this.blocks.keys()).forEach(id => this.removeBlock(id));
        this.nextBlockId = 1;

        // Add blocks
        config.blocks.forEach(b => {
            this.addBlock(b.type, b.x, b.y, b.id, b.properties);
            // Update nextBlockId to avoid collisions
            const num = parseInt(b.id.substring(1));
            if (!isNaN(num) && num >= this.nextBlockId) this.nextBlockId = num + 1;
        });

        // Add connections
        if (this.connections) {
            this.connections.loadJSON(config.connections);
        }

        this.onConfigChanged();
    }
}
