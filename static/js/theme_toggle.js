document.addEventListener('DOMContentLoaded', () => {
    const starsContainer = document.createElement('div');
    starsContainer.className = 'stars';
    document.body.appendChild(starsContainer);
    for (let i = 0; i < 100; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.width = `${Math.random() * 3 + 1}px`;
        star.style.height = star.style.width;
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.animationDelay = `${Math.random() * 5}s`;
        starsContainer.appendChild(star);
    }
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const modeLabel = document.querySelector('.mode-label');
        if (modeLabel) modeLabel.textContent = 'Night Mode';
    }
    const lampString = document.querySelector('.lamp-string');
    if (lampString) {
        lampString.addEventListener('click', (e) => {
            const transition = document.querySelector('.mode-transition');
            const rect = lampString.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            transition.style.setProperty('--x', `${x}px`);
            transition.style.setProperty('--y', `${y}px`);
            transition.classList.add('active', document.body.classList.contains('dark-mode') ? 'to-light' : 'to-dark');
            setTimeout(() => {
                document.body.classList.toggle('dark-mode');
                const isDarkMode = document.body.classList.contains('dark-mode');
                localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
                const modeLabel = document.querySelector('.mode-label');
                if (modeLabel) {
                    modeLabel.textContent = isDarkMode ? 'Night Mode' : 'Day Mode';
                }
                transition.classList.remove('active', 'to-dark', 'to-light');
            }, 500);
        });
    }
});