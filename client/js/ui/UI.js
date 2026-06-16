export class UI {
    constructor() {
        this.healthBar = document.getElementById('health-bar');
        this.essenceValue = document.getElementById('essence-value');
        this.statusElement = document.getElementById('status');
    }
    
    updateHealth(hp) {
        const percent = Math.max(0, (hp / 100) * 100);
        this.healthBar.style.width = `${percent}%`;
    }
    
    updateEssence(essence) {
        this.essenceValue.innerText = essence;
    }
    
    setStatus(text) {
        this.statusElement.innerText = text;
    }
}