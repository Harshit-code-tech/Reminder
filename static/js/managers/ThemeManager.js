/**
 * ThemeManager — theme data, dark/light switching, and system preference sync.
 * Extracted from greeting_card.js.
 */

class ThemeManager {
    constructor(app) {
        this.app = app;
        this.themes = this._buildThemes();
    }

    get elements() { return this.app.elements; }

    _buildThemes() {
        return {
            birthday: {
                password: (name) => name.trim().toLowerCase(),
                quotes: [
                    "May your day be as bright as your smile!",
                    "Another year of awesome you!",
                    "Age is merely the number of years the world has been enjoying you.",
                    "Shine bright today and always!",
                    "You're not getting older, you're getting better!",
                    "May your birthday be filled with laughter and joy!"
                ],
                confettiColors: ['#fde68a', '#fbbf24', '#f59e0b', '#d97706']
            },
            anniversary: {
                password: (date) => date,
                quotes: [
                    "Love grows stronger every year!",
                    "The best is yet to come.",
                    "Forever isn't long enough with you.",
                    "Through all the seasons, my love for you grows.",
                    "Every moment with you is a blessing.",
                    "Here's to many more years of happiness together."
                ],
                confettiColors: ['#fbcfe8', '#f472b6', '#db2777', '#be185d']
            },
            raksha_bandhan: {
                password: (input) => {
                    const normalized = input.trim().toLowerCase();
                    return ['rakhi', 'thread', 'bond', 'राखी', 'धागा'].includes(normalized);
                },
                quotes: [
                    "भाई-बहन का प्यार, जीवन का सबसे प्यारा उपहार",
                    "Siblings are the threads that weave the fabric of our hearts",
                    "In you, I found a lifelong friend and protector",
                    "The sacred thread binds us not just for today, but for all lifetimes",
                    "Through all seasons of life, our bond remains unbreakable",
                    "राखी का धागा, प्रेम का प्रसाद"
                ],
                confettiColors: ['#DC2626', '#F59E0B', '#FF6B35', '#10B981', '#7C3AED']
            },
            other: {
                password: (label) => label.trim().toLowerCase(),
                quotes: [
                    "Cherish every moment of your journey!",
                    "Keep shining your light on the world!",
                    "The adventure continues!",
                    "You're making a difference every day.",
                    "The best journeys are shared with friends like you.",
                    "Celebrating this special occasion with you!"
                ],
                confettiColors: ['#a5f3fc', '#22d3ee', '#0891b2', '#0e7490']
            }
        };
    }

    // Legacy method — returns the themes object (kept for backward compat)
    initializeThemes() {
        return this.themes;
    }

    setupThemeSystem() {
        // Birthday card always uses the fixed dark theme — no toggle, no user preference.
        if (this.app.eventType === 'birthday') {
            this.setTheme('dark');
            return;
        }

        if (!this.elements.themeToggle) return;

        // Get saved theme or system preference
        const savedTheme = localStorage.getItem('cardTheme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;

        // Apply initial theme
        this.setTheme(isDark ? 'dark' : 'light');

        // Theme toggle click handler
        this.elements.themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            this.setTheme(newTheme);
        });

        // Listen for system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('cardTheme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    setTheme(theme) {
        // Add transition class
        document.documentElement.classList.add('theme-transition');

        // Set theme
        document.documentElement.setAttribute('data-theme', theme);

        // Update toggle button (may be absent on birthday card)
        if (this.elements.themeToggle) {
            this.elements.themeToggle.setAttribute('aria-pressed', theme === 'dark');

            // Add active animation
            this.elements.themeToggle.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.elements.themeToggle.style.transform = '';
            }, 150);
        }

        // Update background effects
        this.app.updateBackgroundEffects(theme);

        // Save preference
        localStorage.setItem('cardTheme', theme);

        // Remove transition class
        setTimeout(() => {
            document.documentElement.classList.remove('theme-transition');
        }, CONFIG.TRANSITIONS.THEME);
    }
}

window.ThemeManager = ThemeManager;
