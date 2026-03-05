/**
 * Raksha Bandhan Card Module
 * Contains all Raksha Bandhan-specific interactive logic.
 * Methods are mixed into GreetingCardApp prototype.
 */

(function() {
    'use strict';

    const RakshaBandhanMixin = {

        initializeRakhiLoadingScreen() {
            const loadingScreen = document.getElementById('rakhi-loading');
            if (!loadingScreen) {
                console.error('Rakhi loading screen element not found');
                return;
            }
            console.log('Rakhi loading screen found');
            this.createFloatingPetals();

            setTimeout(() => {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 1000);
            }, 3000);
        },

        createFloatingPetals() {
            const petalsContainer = document.querySelector('.floating-petals');
            if (!petalsContainer) return;

            const petalTypes = ['petal', 'petal marigold', 'petal rose'];

            setInterval(() => {
                if (this.eventType !== 'raksha_bandhan') return;

                const petal = document.createElement('div');
                petal.className = petalTypes[Math.floor(Math.random() * petalTypes.length)];
                petal.style.left = Math.random() * 100 + '%';
                petal.style.animationDuration = (Math.random() * 3 + 2) + 's';
                petal.style.animationDelay = Math.random() * 2 + 's';

                petalsContainer.appendChild(petal);

                setTimeout(() => {
                    if (petal.parentNode) {
                        petal.parentNode.removeChild(petal);
                    }
                }, 6000);
            }, 800);
        },

        setupRakhiSVGCeremony() {
            const startRitualBtn = document.getElementById('start-ritual-btn');
            if (!startRitualBtn) return;
            if (this.animationInProgress) return;

            startRitualBtn.addEventListener('click', () => {
                this.startRakhiRitual();
            });

            this.setupRakhiGiftHandlers();
        },

        startRakhiRitual() {
            if (this.animationInProgress) return;

            this.animationInProgress = true;
            const startBtn = document.getElementById('start-ritual-btn');
            const instruction = document.querySelector('.ritual-instruction');

            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sacred Ritual in Progress...';

            this.audioManager.playBellSound();
            this.runRakhiAnimationSequence(instruction);
        },

        runRakhiAnimationSequence(instruction) {
            const sister = document.getElementById('sister');
            const brotherLeftHand = document.querySelector('.brother-left-hand');
            const wristRakhi = document.getElementById('wrist-rakhi');
            const foreheadTilak = document.getElementById('forehead-tilak');

            instruction.textContent = '👣 Sister approaches with love and ready to annoy his brother... | बहन प्यार से पास आ रही है, शरारत का पूरा मूड है...';
            sister.classList.add('sister-walking');

            setTimeout(() => {
                instruction.textContent = '🤝 Brother extends his hand for the sacred thread... | भाई ने रक्षासूत्र के लिए हाथ बढ़ाया...';
                if (brotherLeftHand) {
                    brotherLeftHand.classList.add('brother-extending-hand');
                }
                this.audioManager.playBellSound();

                setTimeout(() => {
                    instruction.textContent = '🔗 Sister ties the sacred rakhi with prayers... | बहन ने प्रेम और प्रार्थनाओं के साथ राखी बाँधी...';
                    if (wristRakhi) {
                        wristRakhi.classList.add('wrist-rakhi-appearing');
                    }
                    this.audioManager.playBellSound();

                    setTimeout(() => {
                        instruction.textContent = '🌺 Applying tilak for divine blessings... | ईश्वर की कृपा के लिए बहन तिलक लगा रही है...';
                        if (foreheadTilak) {
                            foreheadTilak.classList.add('forehead-tilak-appearing');
                        }
                        this.audioManager.playBellSound();

                        setTimeout(() => {
                            instruction.textContent = '✨ The sacred bond is blessed with divine grace... | यह पवित्र बंधन अब ईश्वर की कृपा से संजोया गया है...';
                            this.showBeautifulRakhiDisplay();
                            this.audioManager.playSuccessSound();

                            setTimeout(() => {
                                instruction.innerHTML = '🎁 <strong>Click the gift</strong> to receive your blessing!<br>🎁 <strong>तोहफ़ा खोलो</strong> और आशीर्वाद पाओ!';
                            }, 2000);

                        }, 2000);
                    }, 2500);
                }, 2000);
            }, 3000);
        },

        showBeautifulRakhiDisplay() {
            const rakhiContainer = document.getElementById('beautiful-rakhi');
            if (rakhiContainer) {
                rakhiContainer.classList.add('show');
                setTimeout(() => this.audioManager.playBlessingSound(), 500);
            }
        },

        setupRakhiGiftHandlers() {
            const giftIcon = document.getElementById('gift-icon');
            if (giftIcon) {
                giftIcon.addEventListener('click', () => this.showRakhiGiftPopup());
            }

            const closeRakhi = document.getElementById('close-rakhi');
            if (closeRakhi) {
                closeRakhi.addEventListener('click', () => this.closeRakhiDisplay());
            }

            const closeGift = document.getElementById('close-gift-popup');
            if (closeGift) {
                closeGift.addEventListener('click', () => this.closeRakhiGiftPopup());
            }
        },

        showRakhiGiftPopup() {
            const giftPopup = document.getElementById('gift-popup');
            if (giftPopup) {
                giftPopup.classList.add('show');
                this.audioManager.playSuccessSound();
                this.showConfetti();
            }
        },

        closeRakhiDisplay() {
            const rakhiContainer = document.getElementById('beautiful-rakhi');
            if (rakhiContainer) {
                rakhiContainer.classList.remove('show');
            }
            setTimeout(() => this.triggerRakhiNextSection(), 500);
        },

        closeRakhiGiftPopup() {
            const giftPopup = document.getElementById('gift-popup');
            if (giftPopup) {
                giftPopup.classList.remove('show');
            }
            setTimeout(() => {
                this.closeRakhiDisplay();
            }, 300);
        },

        triggerRakhiNextSection() {
            const instruction = document.querySelector('.ritual-instruction');
            if (instruction) {
                instruction.innerHTML = '✨ <strong>पवित्र रस्म पूरी हुई!</strong> Sacred ceremony completed! <br>आपका बंधन ईश्वर के प्रेम से पवित्र हुआ है। Your bond is blessed with divine love.';
            }

            this.showFeedback('🎉 Sacred Raksha Bandhan ceremony completed! May your bond grow stronger.', 'success');
            this.animationInProgress = false;

            const startBtn = document.getElementById('start-ritual-btn');
            if (startBtn) {
                startBtn.style.display = 'none';
            }

            const hasThreadOfMemories = this.cardContainer.dataset.threadOfMemories === 'true';
            if (hasThreadOfMemories) {
                setTimeout(() => this.showThreadOfMemories(), 2000);
            } else {
                setTimeout(() => this.showMilestonePopup(), 2000);
            }
        },

        setupRakhiBlessings() {
            this.initializeMemoryThread();
            this.setupBlessingShower();
            this.setupDiyaCeremony();
            this.setupPromiseTree();
            this.initializeBlessingRain();
            console.log('Rakhi blessings setup completed');
        },

        setupPromiseTree() {
            const promiseTree = document.getElementById('promise-tree');
            const treeBranches = document.querySelector('.tree-branches');
            if (!promiseTree) return;

            const promises = [
                "I promise to always support you",
                "I promise to be there in tough times",
                "I promise to celebrate your successes",
                "I promise to protect your dreams",
                "I promise to share your joys"
            ];

            let promiseIndex = 0;
            const branchPositions = [
                { top: '10%', left: '15%', rotate: '-15deg' },
                { top: '25%', left: '75%', rotate: '10deg' },
                { top: '45%', left: '30%', rotate: '-5deg' },
                { top: '60%', left: '65%', rotate: '8deg' },
                { top: '75%', left: '40%', rotate: '-12deg' }
            ];

            this.addDecorativeLeaves(treeBranches);

            promiseTree.addEventListener('click', () => {
                if (promiseIndex < promises.length) {
                    const branch = document.createElement('div');
                    branch.className = 'promise-branch';
                    branch.textContent = promises[promiseIndex];

                    const position = branchPositions[promiseIndex];
                    branch.style.top = position.top;
                    branch.style.left = position.left;
                    branch.style.transform = `rotate(${position.rotate}) scale(0)`;

                    treeBranches.appendChild(branch);

                    setTimeout(() => {
                        branch.style.animation = 'branchGrow 0.5s forwards';
                    }, 50);

                    this.audioManager.playBellSound();
                    promiseIndex++;

                    const instruction = document.querySelector('.tree-instruction');
                    if (instruction) {
                        instruction.textContent = promiseIndex >= promises.length ?
                            "Your tree of promises is complete! ✨" :
                            `Click to add ${5 - promiseIndex} more ${promiseIndex === 4 ? 'promise' : 'promises'}`;
                    }

                    if (promiseIndex >= promises.length) {
                        setTimeout(() => {
                            const foliage = promiseTree.querySelector('.tree-foliage');
                            if (foliage) {
                                foliage.style.animation = 'pulse 2s infinite';
                            }
                            this.showConfetti();
                            this.revealAudioOrQuote();
                        }, 1000);
                    }
                }
            });
        },

        addDecorativeLeaves(container) {
            if (!container) return;
            const leafEmojis = ['🍃', '🌿', '☘️'];
            for (let i = 0; i < 8; i++) {
                const leaf = document.createElement('div');
                leaf.textContent = leafEmojis[Math.floor(Math.random() * leafEmojis.length)];
                leaf.style.position = 'absolute';
                leaf.style.fontSize = `${Math.random() * 8 + 12}px`;
                leaf.style.top = `${Math.random() * 80 + 10}%`;
                leaf.style.left = `${Math.random() * 80 + 10}%`;
                leaf.style.opacity = '0.7';
                leaf.style.transform = `rotate(${Math.random() * 360}deg)`;
                leaf.style.pointerEvents = 'none';
                container.appendChild(leaf);
            }
        },

        setupBlessingShower() {
            const blessingBtn = document.getElementById('blessing-shower-btn');
            const blessingShower = document.getElementById('blessing-shower');

            if (blessingBtn && blessingShower) {
                blessingBtn.addEventListener('click', () => {
                    console.log('Blessing button clicked');
                    this.audioManager.playBlessingSound();
                    this.createBlessingParticles(blessingShower);
                });
            } else {
                console.error('Blessing button or shower container not found');
            }
        },

        createBlessingParticles(blessingShower) {
            const blessings = ['🌸', '🌼', '💰', '🪙', '✨', '💝', '🙏', '❤️'];

            for (let i = 0; i < 20; i++) {
                setTimeout(() => {
                    const particle = document.createElement('div');
                    particle.className = 'blessing-particle';
                    particle.textContent = blessings[Math.floor(Math.random() * blessings.length)];
                    particle.style.position = 'fixed';
                    particle.style.left = Math.random() * 100 + '%';
                    particle.style.top = -30 + 'px';
                    particle.style.animationDelay = `${Math.random()}s`;
                    blessingShower.appendChild(particle);

                    setTimeout(() => {
                        if (particle.parentNode) {
                            particle.parentNode.removeChild(particle);
                        }
                    }, 3500);
                }, i * 100);
            }
        },

        setupDiyaCeremony() {
            const diyas = document.querySelectorAll('.ceremony-diya');
            let litDiyas = 0;

            diyas.forEach(diya => {
                const wish = diya.getAttribute('data-wish');
                if (wish) {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'diya-tooltip';
                    tooltip.textContent = wish.charAt(0).toUpperCase() + wish.slice(1);
                    diya.appendChild(tooltip);

                    diya.addEventListener('mouseenter', () => {
                        tooltip.style.opacity = '1';
                        tooltip.style.transform = 'translateY(-5px)';
                    });

                    diya.addEventListener('mouseleave', () => {
                        tooltip.style.opacity = '0';
                        tooltip.style.transform = 'translateY(0)';
                    });
                }

                diya.addEventListener('click', () => {
                    if (diya.classList.contains('lit')) return;

                    diya.classList.add('lit');
                    const flame = diya.querySelector('.diya-flame-unlit');
                    if (flame) {
                        flame.className = 'diya-flame-lit';
                    }

                    this.audioManager.playBellSound();
                    litDiyas++;

                    if (litDiyas >= diyas.length) {
                        setTimeout(() => {
                            this.audioManager.playSuccessSound();
                            alert('🎉 All diyas lit! Your blessings are complete. The divine light shines upon you!');
                            this.revealAudioOrQuote();
                        }, 1000);
                    }
                });
            });
        },

        initializeBlessingRain() {
            const blessingRainContainer = document.getElementById('blessing-rain');
            if (!blessingRainContainer) return;

            const blessings = ['🌸', '🌼', '🙏', '✨', '💝', '❤️'];
            const createBlessing = () => {
                const blessing = document.createElement('div');
                blessing.className = 'blessing-particle';
                blessing.textContent = blessings[Math.floor(Math.random() * blessings.length)];
                blessing.style.left = `${Math.random() * 100}%`;
                blessing.style.animationDuration = `${Math.random() * 2 + 2}s`;
                blessing.style.animationDelay = `${Math.random() * 1}s`;
                blessingRainContainer.appendChild(blessing);

                setTimeout(() => {
                    if (blessing.parentNode) {
                        blessing.parentNode.removeChild(blessing);
                    }
                }, 4000);
            };

            setInterval(createBlessing, 300);
        },

        createRakhiAnimation() {
            const elements = [];
            const symbols = ['🕉️', '🪔', '🌸', '🌺', '💐', '✨'];
            for (let i = 0; i < 20; i++) {
                const symbol = document.createElement('div');
                symbol.innerHTML = symbols[Math.floor(Math.random() * symbols.length)];
                symbol.style.cssText = `
                    position: fixed;
                    left: ${Math.random() * 95}vw;
                    top: ${Math.random() * 95}vh;
                    font-size: ${Math.random() * 15 + 25}px;
                    animation: floatUp ${Math.random() * 3 + 3}s ease-out ${Math.random() * 2}s infinite;
                    pointer-events: none;
                    color: var(--rakhi-gold);
                    z-index: 9999;
                    text-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
                `;
                document.body.appendChild(symbol);
                elements.push(symbol);
            }
            return elements;
        },

        closeAllRakhiPopups() {
            const giftPopup = document.getElementById('gift-popup');
            const rakhiContainer = document.getElementById('beautiful-rakhi');

            if (giftPopup && giftPopup.classList.contains('show')) {
                this.closeRakhiGiftPopup();
            } else if (rakhiContainer && rakhiContainer.classList.contains('show')) {
                this.closeRakhiDisplay();
            }
        }
    };

    // Apply mixin to GreetingCardApp prototype when available
    function applyMixin() {
        if (typeof GreetingCardApp !== 'undefined') {
            Object.keys(RakshaBandhanMixin).forEach(key => {
                GreetingCardApp.prototype[key] = RakshaBandhanMixin[key];
            });
            console.log('Raksha Bandhan module loaded');
        }
    }

    // Try immediately, or wait for script load
    if (typeof GreetingCardApp !== 'undefined') {
        applyMixin();
    } else {
        // Will be applied after greeting_card.js defines the class
        window._rakhiMixin = RakshaBandhanMixin;
    }
})();
