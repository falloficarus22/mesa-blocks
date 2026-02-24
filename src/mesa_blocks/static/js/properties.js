/**
 * Mesa Blocks — properties.js
 * Properties panel UI and logic
 */

class PropertiesManager {
    constructor(workspace) {
        this.workspace = workspace;
        this.container = document.getElementById('properties-content');
        this.currentBlockId = null;
    }

    show(block) {
        this.currentBlockId = block.id;
        this.container.innerHTML = '';

        // Block header info
        const info = document.createElement('div');
        info.className = 'prop-block-info';
        info.innerHTML = `
            <div class="prop-block-icon">${block.def.icon}</div>
            <div>
                <div class="prop-block-name">${block.def.label}</div>
                <div class="prop-block-type">ID: ${block.id}</div>
            </div>
        `;
        this.container.appendChild(info);

        // Properties
        if (!block.def.props || block.def.props.length === 0) {
            const msg = document.createElement('p');
            msg.className = 'placeholder-text';
            msg.innerText = 'No editable properties for this block.';
            this.container.appendChild(msg);
            return;
        }

        block.def.props.forEach(prop => {
            const group = document.createElement('div');
            group.className = 'prop-group';

            const label = document.createElement('label');
            label.className = 'prop-label';
            label.innerText = prop.label;
            group.appendChild(label);

            let input;
            if (prop.type === 'select') {
                input = document.createElement('select');
                input.className = 'prop-input';
                prop.options.forEach(opt => {
                    const o = document.createElement('option');
                    o.value = opt;
                    o.text = opt.charAt(0).toUpperCase() + opt.slice(1).replace('_', ' ');
                    input.appendChild(o);
                });
                input.value = block.properties[prop.name];
            } else if (prop.type === 'boolean') {
                input = document.createElement('input');
                input.type = 'checkbox';
                input.className = 'prop-input';
                input.checked = block.properties[prop.name];
            } else {
                input = document.createElement('input');
                input.type = prop.type;
                input.className = 'prop-input';
                input.value = block.properties[prop.name];
                if (prop.min !== undefined) input.min = prop.min;
                if (prop.max !== undefined) input.max = prop.max;
                if (prop.step !== undefined) input.step = prop.step;
            }

            input.onchange = (e) => {
                const val = prop.type === 'boolean' ? e.target.checked : e.target.value;
                block.properties[prop.name] = val;

                // If it's the "name" property of an agent, update block label?
                // Actually, let's keep it simple for now. 

                this.workspace.onConfigChanged();
            };

            group.appendChild(input);
            this.container.appendChild(group);
        });
    }

    hide() {
        this.currentBlockId = null;
        this.container.innerHTML = '<p class="placeholder-text">Select a block to edit its properties</p>';
    }

    refresh() {
        if (this.currentBlockId) {
            const block = this.workspace.blocks.get(this.currentBlockId);
            if (block) this.show(block);
        }
    }
}
