/**
 * Mesa Blocks — app.js
 * Main app coordinator & event handling
 */

class App {
    constructor() {
        this.workspace = new Workspace('workspace-canvas', 'connections-svg');
        this.connections = new ConnectionManager(this.workspace);
        this.properties = new PropertiesManager(this.workspace);
        this.preview = new PreviewManager();

        // Link modules back to workspace for easy access
        this.workspace.connections = this.connections;
        this.workspace.properties = this.properties;

        this.isRunning = false;
        this.stepInterval = null;
        this.speed = 150;

        this.initEvents();
        this.initToolbox();
        this.checkInitialWorkspace();
    }

    initEvents() {
        // Toolbar buttons
        document.getElementById('btn-run').onclick = () => this.startSim();
        document.getElementById('btn-pause').onclick = () => this.pauseSim();
        document.getElementById('btn-stop').onclick = () => this.stopSim();
        document.getElementById('btn-export').onclick = () => this.exportCode();
        document.getElementById('btn-save').onclick = () => this.saveConfig();
        document.getElementById('btn-load').onclick = () => document.getElementById('file-load').click();
        document.getElementById('file-load').onchange = (e) => this.loadConfig(e);

        // Speed slider
        const speedSlider = document.getElementById('speed-slider');
        speedSlider.oninput = (e) => {
            this.speed = parseInt(e.target.value);
            if (this.isRunning) {
                this.pauseSim();
                this.startSim();
            }
        };

        // Code panel toggle
        document.getElementById('btn-toggle-code').onclick = () => {
            const panel = document.getElementById('code-panel');
            panel.classList.toggle('collapsed');
            const isCollapsed = panel.classList.contains('collapsed');
            document.getElementById('btn-toggle-code').innerHTML = `<i data-lucide="chevron-${isCollapsed ? 'up' : 'down'}"></i>`;
            if (window.lucide) window.lucide.createIcons();
        };

        document.getElementById('btn-copy-code').onclick = () => this.copyCode();
        document.getElementById('btn-download-code').onclick = () => this.downloadCode();

        // Listen for workspace changes to update code preview (with debounce)
        this.generateTimer = null;
        window.addEventListener('mesa-blocks-changed', () => {
            if (this.generateTimer) clearTimeout(this.generateTimer);
            this.generateTimer = setTimeout(() => {
                this.generatePreviewCode();
            }, 250);
        });

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.startSim();
            }
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                this.exportCode();
            }
        });
    }

    initToolbox() {
        // Drag start for toolbox items
        const items = document.querySelectorAll('.toolbox-item');
        items.forEach(item => {
            item.ondragstart = (e) => {
                e.dataTransfer.setData('block-type', item.dataset.blockType);
            };
        });
    }

    checkInitialWorkspace() {
        // Just for demo: start with a Model block
        if (this.workspace.blocks.size === 0) {
            this.workspace.addBlock('model', 100, 100);
        }
    }

    async startSim() {
        if (this.isRunning) return;

        try {
            const config = this.workspace.getConfig();
            const response = await fetch('/api/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            const state = await response.json();
            if (state.error) {
                this.showToast(state.error, 'error');
                return;
            }

            this.isRunning = true;
            this.preview.reset();
            this.preview.update(state);

            this.updateToolbar();
            this.stepLoop();
            this.showToast('Simulation started', 'success');
        } catch (err) {
            console.error(err);
            this.showToast('Failed to start simulation', 'error');
        }
    }

    stepLoop() {
        if (!this.isRunning) return;

        this.stepInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/step', { method: 'POST' });
                const state = await response.json();

                if (state.error) {
                    this.pauseSim();
                    this.showToast(state.error, 'error');
                    return;
                }

                this.preview.update(state);

                // Max steps check
                const modelBlock = Array.from(this.workspace.blocks.values()).find(b => b.type === 'model');
                if (modelBlock && state.step >= modelBlock.properties.steps) {
                    this.pauseSim();
                    this.showToast('Max steps reached', 'success');
                }
            } catch (err) {
                console.error(err);
                this.pauseSim();
            }
        }, this.speed);
    }

    pauseSim() {
        this.isRunning = false;
        if (this.stepInterval) clearInterval(this.stepInterval);
        this.updateToolbar();
    }

    async stopSim() {
        this.pauseSim();
        await fetch('/api/stop', { method: 'POST' });
        this.preview.reset();
        this.showToast('Simulation stopped');
    }

    updateToolbar() {
        document.getElementById('btn-run').disabled = this.isRunning;
        document.getElementById('btn-pause').disabled = !this.isRunning;
        document.getElementById('btn-stop').disabled = false;
    }

    async generatePreviewCode() {
        try {
            const config = this.workspace.getConfig();
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            const data = await response.json();
            if (data.code) {
                const codeEl = document.getElementById('code-content');
                codeEl.innerHTML = this.highlightPython(data.code);
            }
        } catch (err) {
            console.error('Failed to generate code preview');
        }
    }

    highlightPython(code) {
        // Simple regex-based highlighter
        return code
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/\b(class|def|import|from|as|if|else|elif|for|in|while|return|pass|type|range|print|super|if __name__ == "__main__":)\b/g, '<span class="kw">$1</span>')
            .replace(/(#.*)/g, '<span class="cmt">$1</span>')
            .replace(/"([^"]*)"/g, '<span class="str">"$1"</span>')
            .replace(/\b([A-Z][a-zA-Z0-9_]+)\b(?=\()/g, '<span class="cls">$1</span>')
            .replace(/\b([a-z_][a-z0-9_]*)\b(?=\()/g, '<span class="fn">$1</span>')
            .replace(/\b(\d+)\b/g, '<span class="num">$1</span>');
    }

    copyCode() {
        const code = document.getElementById('code-content').innerText;
        navigator.clipboard.writeText(code);
        this.showToast('Code copied to clipboard', 'success');
    }

    downloadCode() {
        const code = document.getElementById('code-content').innerText;
        const blob = new Blob([code], { type: 'text/x-python' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mesa_model.py';
        a.click();
        URL.revokeObjectURL(url);
    }

    saveConfig() {
        const config = this.workspace.getConfig();
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mesa_blocks_config.json';
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('Config saved');
    }

    loadConfig(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);
                this.workspace.loadConfig(config);
                this.showToast('Config loaded', 'success');
            } catch (err) {
                this.showToast('Invalid config file', 'error');
            }
        };
        reader.readAsText(file);
    }

    showToast(message, type = '') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = 'info';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'alert-circle';

        toast.innerHTML = `<i data-lucide="${icon}" class="toast-icon"></i> <span>${message}</span>`;
        container.appendChild(toast);
        if (window.lucide) window.lucide.createIcons();

        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Global entry point
window.onload = () => {
    window.app = new App();
};
