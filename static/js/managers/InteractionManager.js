/**
 * InteractionManager — generic Page 4 interaction infrastructure.
 * Event-specific ceremony logic lives in each event module (card_*.js).
 */
class InteractionManager {
    constructor(app) {
        this.app = app;
    }

    // Getter proxies for frequently accessed app properties
    get eventType()    { return this.app.eventType; }
    get elements()     { return this.app.elements; }
    get audioManager() { return this.app.audioManager; }
    get savedData()    { return this.app.savedData; }
    get effectManager(){ return this.app.effectManager; }

    // Entry point called when page 4 is shown
    setupPage4() {
        this.setupInteractiveElements();
    }

    // Generic infrastructure — event-specific ceremony is fired by EventModule.onPageEnter(4, app)
    setupInteractiveElements() {
        console.log('Setting up interactive elements for:', this.eventType);
        this.setupMemoryTree();
        this.app.setupMediaDisplays();
        this.app.setupAudioControls();
    }

    // ===== EFFECT MANAGER PASSTHROUGHS (used by raksha mixin methods) =====
    addDecorativeLeaves(container) {
        return this.effectManager.addDecorativeLeaves(container);
    }

    setupBlessingShower() {
        return this.effectManager.setupBlessingShower();
    }

    createBlessingParticles(blessingShower) {
        return this.effectManager.createBlessingParticles(blessingShower);
    }

    // ===== GENERIC MEMORY TREE =====
    setupMemoryTree() {
        if (!this.elements.memoryTree) return;

        // Load saved leaves
        if (this.savedData.leaves && Array.isArray(this.savedData.leaves)) {
            this.savedData.leaves.forEach(leaf => {
                this.createMemoryLeaf(leaf.x, leaf.y);
            });
        }

        this.elements.memoryTree.addEventListener('click', (e) => {
            this.addMemoryLeaf(e);
        });
    }

    addMemoryLeaf(event) {
        const rect = this.elements.memoryTree.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        this.createMemoryLeaf(x, y);

        // Save leaf position
        if (!this.savedData.leaves) this.savedData.leaves = [];
        this.savedData.leaves.push({ x, y });
        this.app.saveData();

        // Update instruction
        const instruction = document.querySelector('.tree-instruction');
        if (instruction && this.elements.memoryTree.children.length > 5) {
            instruction.textContent = 'Your tree is flourishing! 🌳';
        }

        // Reveal audio/quote after several clicks
        if (this.elements.memoryTree.children.length >= 3) {
            this.app.revealAudioOrQuote();
        }
    }

    createMemoryLeaf(x, y) {
        const leaf = document.createElement('div');
        leaf.className = 'memory-leaf';
        leaf.style.left = `${x}px`;
        leaf.style.top = `${y}px`;
        this.elements.memoryTree.appendChild(leaf);
    }

    // ===== MEMORY THREAD (infrastructure used by Raksha Bandhan event module) =====
    initializeMemoryThread() {
        const memoryPoints = document.querySelectorAll('.memory-point');
        const memoryPopup = document.getElementById('memory-popup');

        if (!memoryPopup) return;

        memoryPoints.forEach(point => {
            point.addEventListener('mouseenter', () => this.showMemoryPopup(point, memoryPopup));
            point.addEventListener('mouseleave', () => this.hideMemoryPopup(memoryPopup));
            point.addEventListener('click',      () => this.showMemoryPopup(point, memoryPopup));
            point.addEventListener('focus',      () => this.showMemoryPopup(point, memoryPopup));
            point.addEventListener('blur',       () => this.hideMemoryPopup(memoryPopup));
        });
    }

    showMemoryPopup(point, popup) {
        const year        = point.getAttribute('data-year');
        const title       = point.getAttribute('data-title');
        const description = point.getAttribute('data-description');

        popup.querySelector('.popup-year').textContent        = year        || 'Memory';
        popup.querySelector('.popup-title').textContent       = title       || 'Special Moment';
        popup.querySelector('.popup-description').textContent = description || 'A cherished memory';

        popup.classList.remove('hidden');

        const rect          = point.getBoundingClientRect();
        const containerRect = point.closest('.thread-of-memories-container').getBoundingClientRect();
        popup.style.left    = (rect.left - containerRect.left) + 'px';
        popup.style.opacity = '1';

        if (this.eventType === 'raksha_bandhan') {
            this.audioManager.playBellSound();
        }
    }

    hideMemoryPopup(popup) {
        if (popup) {
            popup.style.opacity = '0';
            setTimeout(() => popup.classList.add('hidden'), 300);
        }
    }
}

window.InteractionManager = InteractionManager;
