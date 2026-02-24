/**
 * Mesa Blocks — connections.js
 * SVG connection drawing and port logic
 */

class ConnectionManager {
    constructor(workspace) {
        this.workspace = workspace;
        this.svg = workspace.svgElement;
        this.connections = new Map(); // id -> connection object
        this.nextConnId = 1;

        this.pendingConn = null; // { fromBlockId, fromPortId, fromDir, type, element }

        this.initEvents();
    }

    initEvents() {
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));

        // Listen for workspace resize if needed, though viewport fills app body
    }

    startPendingConnection(blockId, portId, dir) {
        const block = this.workspace.blocks.get(blockId);
        const portEl = block.getPortElement(portId, dir);
        const portType = portEl.dataset.portType;

        // Check if port is multi or already connected
        const isMulti = portEl.dataset.multi === 'true';
        if (!isMulti && this.isPortConnected(blockId, portId, dir)) {
            // If it's single and connected, maybe we should disconnect existing?
            // For now, let's just allow it or prevent it. 
            // Better behavior: disconnect existing and start new from that port.
            this.removeConnectionsToPort(blockId, portId, dir);
        }

        const center = block.getPortCenter(portId, dir);

        this.pendingConn = {
            fromBlockId: blockId,
            fromPortId: portId,
            fromDir: dir,
            type: portType,
            startX: center.x,
            startY: center.y,
            element: this.createSVGPath(dir === 'out' ? block.def.color : '#94a3b8')
        };

        this.pendingConn.element.classList.add('pending');
        this.svg.appendChild(this.pendingConn.element);
    }

    onMouseMove(e) {
        if (!this.pendingConn) return;

        const rect = this.workspace.canvasElement.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;

        let x1, y1, x2, y2;
        if (this.pendingConn.fromDir === 'out') {
            x1 = this.pendingConn.startX; y1 = this.pendingConn.startY;
            x2 = endX; y2 = endY;
        } else {
            x1 = endX; y1 = endY;
            x2 = this.pendingConn.startX; y2 = this.pendingConn.startY;
        }

        this.updatePath(this.pendingConn.element, x1, y1, x2, y2);
    }

    onMouseUp(e) {
        if (!this.pendingConn) return;

        const portEl = e.target.closest('.port');
        if (portEl) {
            const blockEl = portEl.closest('.block');
            const toBlockId = blockEl.dataset.blockId;
            const toPortId = portEl.dataset.portId;
            const toDir = portEl.classList.contains('port-in') ? 'in' : 'out';
            const toType = portEl.dataset.portType;

            // Validation
            const sameBlock = toBlockId === this.pendingConn.fromBlockId;
            const differentDir = toDir !== this.pendingConn.fromDir;
            const sameType = toType === this.pendingConn.type;
            const isMulti = portEl.dataset.multi === 'true';
            const portAlreadyBusy = !isMulti && this.isPortConnected(toBlockId, toPortId, toDir);

            if (!sameBlock && differentDir && sameType && !portAlreadyBusy) {
                // Success! Create connection
                if (this.pendingConn.fromDir === 'out') {
                    this.addConnection(this.pendingConn.fromBlockId, this.pendingConn.fromPortId, toBlockId, toPortId);
                } else {
                    this.addConnection(toBlockId, toPortId, this.pendingConn.fromBlockId, this.pendingConn.fromPortId);
                }
            }
        }

        this.pendingConn.element.remove();
        this.pendingConn = null;
    }

    addConnection(fromBlockId, fromPortId, toBlockId, toPortId) {
        // Prevent duplicates
        if (this.findConnection(fromBlockId, fromPortId, toBlockId, toPortId)) return;

        const id = `c${this.nextConnId++}`;
        const fromBlock = this.workspace.blocks.get(fromBlockId);
        const element = this.createSVGPath(fromBlock.def.color);

        const conn = { id, fromBlockId, fromPortId, toBlockId, toPortId, element };
        this.connections.set(id, conn);
        this.svg.appendChild(element);

        element.onclick = (e) => {
            e.stopPropagation();
            this.removeConnection(id);
        };

        this.updateConnection(id);
        this.workspace.onConfigChanged();
        this.updatePortStatus(fromBlockId, fromPortId, 'out');
        this.updatePortStatus(toBlockId, toPortId, 'in');
    }

    removeConnection(id) {
        const conn = this.connections.get(id);
        if (!conn) return;

        conn.element.remove();
        this.connections.delete(id);

        this.updatePortStatus(conn.fromBlockId, conn.fromPortId, 'out');
        this.updatePortStatus(conn.toBlockId, conn.toPortId, 'in');

        this.workspace.onConfigChanged();
    }

    removeBlockConnections(blockId) {
        const toRemove = [];
        this.connections.forEach((conn, id) => {
            if (conn.fromBlockId === blockId || conn.toBlockId === blockId) {
                toRemove.push(id);
            }
        });
        toRemove.forEach(id => this.removeConnection(id));
    }

    removeConnectionsToPort(blockId, portId, dir) {
        const toRemove = [];
        this.connections.forEach((conn, id) => {
            if (dir === 'out' && conn.fromBlockId === blockId && conn.fromPortId === portId) {
                toRemove.push(id);
            } else if (dir === 'in' && conn.toBlockId === blockId && conn.toPortId === portId) {
                toRemove.push(id);
            }
        });
        toRemove.forEach(id => this.removeConnection(id));
    }

    updateBlockConnections(blockId) {
        this.connections.forEach((conn, id) => {
            if (conn.fromBlockId === blockId || conn.toBlockId === blockId) {
                this.updateConnection(id);
            }
        });
    }

    updateConnection(id) {
        const conn = this.connections.get(id);
        if (!conn) return;

        const fromBlock = this.workspace.blocks.get(conn.fromBlockId);
        const toBlock = this.workspace.blocks.get(conn.toBlockId);

        if (!fromBlock || !toBlock) return;

        const start = fromBlock.getPortCenter(conn.fromPortId, 'out');
        const end = toBlock.getPortCenter(conn.toPortId, 'in');

        if (start && end) {
            this.updatePath(conn.element, start.x, start.y, end.x, end.y);
        }
    }

    createSVGPath(color) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", color || "var(--accent-indigo)");
        path.setAttribute("stroke-width", "3");
        path.setAttribute("stroke-linecap", "round");
        return path;
    }

    updatePath(path, x1, y1, x2, y2) {
        // Cubic Bezier curve
        const dx = Math.abs(x1 - x2) * 0.5;
        const cx1 = x1 + dx;
        const cy1 = y1;
        const cx2 = x2 - dx;
        const cy2 = y2;

        path.setAttribute("d", `M ${x1},${y1} C ${cx1},${y1} ${cx2},${y2} ${x2},${y2}`);
    }

    isPortConnected(blockId, portId, dir) {
        for (const conn of this.connections.values()) {
            if (dir === 'out' && conn.fromBlockId === blockId && conn.fromPortId === portId) return true;
            if (dir === 'in' && conn.toBlockId === blockId && conn.toPortId === portId) return true;
        }
        return false;
    }

    updatePortStatus(blockId, portId, dir) {
        const block = this.workspace.blocks.get(blockId);
        if (!block) return;
        const portEl = block.getPortElement(portId, dir);
        if (!portEl) return;
        const dot = portEl.querySelector('.port-dot');
        if (this.isPortConnected(blockId, portId, dir)) {
            dot.classList.add('connected');
        } else {
            dot.classList.remove('connected');
        }
    }

    findConnection(fromBlockId, fromPortId, toBlockId, toPortId) {
        for (const [id, conn] of this.connections) {
            if (conn.fromBlockId === fromBlockId && conn.fromPortId === fromPortId &&
                conn.toBlockId === toBlockId && conn.toPortId === toPortId) {
                return id;
            }
        }
        return null;
    }

    toJSON() {
        return Array.from(this.connections.values()).map(c => ({
            from: c.fromBlockId,
            fromPort: c.fromPortId,
            to: c.toBlockId,
            toPort: c.toPortId
        }));
    }

    loadJSON(json) {
        if (!json) return;
        json.forEach(c => {
            this.addConnection(c.from, c.fromPort, c.to, c.toPort);
        });
    }
}
