/**
 * Mesa Blocks — preview.js
 * Live simulation rendering (grid + charts)
 */

class PreviewManager {
    constructor() {
        this.gridCanvas = document.getElementById('grid-canvas');
        this.gridCtx = this.gridCanvas.getContext('2d');

        this.chartCanvas = document.getElementById('chart-canvas');
        this.chartCtx = this.chartCanvas.getContext('2d');

        this.history = []; // Array of counts objects
        this.maxHistory = 100;

        this.lastState = null;
    }

    update(state) {
        this.lastState = state;

        // Update counters
        document.getElementById('step-counter').innerText = `Step: ${state.step}`;
        document.getElementById('agent-count-display').innerText = `Agents: ${state.agents.length}`;

        this.drawGrid(state);
        this.updateChart(state);
    }

    drawGrid(state) {
        const ctx = this.gridCtx;
        const width = this.gridCanvas.width;
        const height = this.gridCanvas.height;

        ctx.clearRect(0, 0, width, height);

        const cols = state.grid_width;
        const rows = state.grid_height;
        const cellW = width / cols;
        const cellH = height / rows;

        // Draw grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;

        ctx.beginPath();
        for (let i = 0; i <= cols; i++) {
            ctx.moveTo(i * cellW, 0);
            ctx.lineTo(i * cellW, height);
        }
        for (let j = 0; j <= rows; j++) {
            ctx.moveTo(0, j * cellH);
            ctx.lineTo(width, j * cellH);
        }
        ctx.stroke();

        // Draw agents
        state.agents.forEach(agent => {
            if (!agent.pos) return;
            const [x, y] = agent.pos;

            ctx.fillStyle = agent.color || '#3b82f6';

            // Draw circle
            ctx.beginPath();
            ctx.arc(
                x * cellW + cellW / 2,
                y * cellH + cellH / 2,
                Math.min(cellW, cellH) * 0.4,
                0, Math.PI * 2
            );
            ctx.fill();

            // Subtle border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        });
    }

    updateChart(state) {
        // Add to history
        this.history.push(state.counts);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        this.drawChart();
    }

    drawChart() {
        const ctx = this.chartCtx;
        const w = this.chartCanvas.width;
        const h = this.chartCanvas.height;
        const padding = 10;

        ctx.clearRect(0, 0, w, h);

        if (this.history.length < 2) return;

        // Find max value for scaling
        let maxVal = 0;
        Object.keys(this.history[0]).forEach(type => {
            this.history.forEach(counts => {
                if (counts[type] > maxVal) maxVal = counts[type];
            });
        });

        if (maxVal === 0) maxVal = 10;
        maxVal *= 1.1; // 10% headroom

        const agentTypes = Object.keys(this.history[0]);

        agentTypes.forEach(type => {
            // Find color for this type from the last state
            const agentInState = this.lastState.agents.find(a => a.type === type);
            ctx.strokeStyle = agentInState ? agentInState.color : '#3b82f6';
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';

            ctx.beginPath();
            this.history.forEach((counts, i) => {
                const x = padding + (i / (this.maxHistory - 1)) * (w - 2 * padding);
                const y = (h - padding) - (counts[type] / maxVal) * (h - 2 * padding);

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Area fill (semi-transparent)
            ctx.lineTo(padding + (this.history.length - 1) / (this.maxHistory - 1) * (w - 2 * padding), h - padding);
            ctx.lineTo(padding, h - padding);
            ctx.fillStyle = ctx.strokeStyle.replace('rgb', 'rgba').replace(')', ', 0.1)');
            if (ctx.fillStyle.startsWith('#')) {
                // simple hex to rgba conversion
                const r = parseInt(ctx.strokeStyle.slice(1, 3), 16);
                const g = parseInt(ctx.strokeStyle.slice(3, 5), 16);
                const b = parseInt(ctx.strokeStyle.slice(5, 7), 16);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.1)`;
            }
            ctx.fill();
        });
    }

    reset() {
        this.history = [];
        this.drawChart(); // clear
        document.getElementById('step-counter').innerText = `Step: 0`;
        document.getElementById('agent-count-display').innerText = `Agents: 0`;
    }
}
