document.addEventListener('DOMContentLoaded', function() {
  // Utility to get CSRF token from cookie
  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  // Theme configuration
  const themes = {
    'birthday': {
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
    'anniversary': {
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
    'other': {
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

  // Card Elements
  const cardContainer = document.querySelector('.card-container');
  const eventType = cardContainer?.dataset.theme || 'birthday';
  const culturalTheme = cardContainer?.dataset.culturalTheme === 'true';
  const customLabel = cardContainer?.dataset.customLabel || '';
  const cardPages = document.querySelectorAll('.card-page');
  const pageIndicators = document.querySelectorAll('.page-indicator .indicator');
  const recipientNameElements = document.querySelectorAll('.recipient-name');

  // Cache DOM elements
  const elements = {
    cardPasswordForm: document.querySelector('form[action*="validate_card_password"]'),
    cardPasswordInput: document.querySelector('#card-password-input'),
    passwordContainer: document.querySelector('.password-container'),
    passwordHint: document.querySelector('.password-hint'),
    nextButtons: document.querySelectorAll('.nav-button.next'),
    prevButtons: document.querySelectorAll('.nav-button.prev'),
    saveButton: document.querySelector('.save-button'),
    saveCardButton: document.querySelector('.save-card'),
    shareButton: document.querySelector('.share-card'),
    voiceNote: document.querySelector('.voice-note-text'),
    playVoiceNote: document.querySelector('.play-voice-note'),
    shareModal: document.querySelector('#share-modal'),
    sharePasswordForm: document.querySelector('#share-modal form'),
    sharePasswordInput: document.querySelector('#share-password'),
    closeModalButton: document.querySelector('#close-share-modal'),
    shareUrlContainer: document.querySelector('#share-url-container'),
    shareUrlElement: document.querySelector('#share-url'),
    whatsappLink: document.querySelector('#whatsapp-share'),
    twitterLink: document.querySelector('#twitter-share'),
    emailLink: document.querySelector('#email-share')
  };

  // Current state
  let currentPage = 1;
  let unlocked = false;
  const storageKey = `cardState_${window.location.pathname}`;
  let savedData = getSavedData();

  function getSavedData() {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || {
        leaves: [],
        unlocked: false,
        lastVisited: Date.now()
      };
    } catch (e) {
      console.error('Error parsing saved card data:', e);
      return { leaves: [], unlocked: false, lastVisited: Date.now() };
    }
  }

  function saveData(data = {}) {
    try {
      savedData = { ...savedData, ...data, lastVisited: Date.now() };
      localStorage.setItem(storageKey, JSON.stringify(savedData));
      return true;
    } catch (e) {
      console.error('Error saving card data:', e);
      return false;
    }
  }

  // Load saved state
  if (savedData.unlocked) {
    unlocked = true;
    goToPage(savedData.lastPage || 1);
  }

  // Initialize UI elements
  if (culturalTheme) {
    createDiyas();
  }
  initializeQuotes();
  setupPasswordPanel();

  // Ensure password panel visibility
  function setupPasswordPanel() {
    if (!elements.passwordContainer || !elements.cardPasswordInput) return;
    const requiresPassword = elements.passwordContainer.classList.contains('visible');
    const cardPage = document.querySelector('#page-1');

    if (requiresPassword && !unlocked) {
      elements.passwordContainer.style.display = 'block';
      cardPage.classList.remove('active');
      elements.cardPasswordInput.focus();

      if (elements.cardPasswordForm) {
        elements.cardPasswordForm.addEventListener('submit', function(e) {
          e.preventDefault();
          const formData = new FormData(this);
          const csrftoken = getCookie('csrftoken');
          fetch(this.action, {
            method: 'POST',
            headers: { 'X-CSRFToken': csrftoken },
            body: formData
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              unlocked = true;
              saveData({ unlocked: true });
              showConfetti();
              elements.passwordContainer.style.display = 'none';
              cardPage.classList.add('active');
              goToPage(1);
            } else {
              shakePasswordInput(data.error || 'Incorrect password');
            }
          })
          .catch(err => {
            console.error('Error validating card password:', err);
            shakePasswordInput('Validation failed');
          });
        });
      }
    } else {
      elements.passwordContainer.style.display = 'none';
      cardPage.classList.add('active');
    }
  }

  // Shake password input on error
  function shakePasswordInput(message) {
    if (!elements.cardPasswordInput) return;
    elements.cardPasswordInput.classList.add('error');
    elements.cardPasswordInput.style.animation = 'shake 0.5s ease';

    if (message && elements.passwordHint) {
      const originalHint = elements.passwordHint.innerHTML;
      elements.passwordHint.innerHTML = `<span class="error-message">${message}</span>`;
      setTimeout(() => {
        elements.passwordHint.innerHTML = originalHint;
      }, 3000);
    }

    setTimeout(() => {
      elements.cardPasswordInput.style.animation = '';
      elements.cardPasswordInput.classList.remove('error');
    }, 500);
  }

  // Initialize quotes
  function initializeQuotes() {
    try {
      const quoteElements = document.querySelectorAll('.inspiration-quote');
      const themeQuotes = themes[eventType]?.quotes || themes.birthday.quotes;
      quoteElements.forEach(quoteEl => {
        const randomQuote = themeQuotes[Math.floor(Math.random() * themeQuotes.length)];
        quoteEl.textContent = randomQuote;
      });
    } catch (e) {
      console.error('Error initializing quotes:', e);
    }
  }

  // Create floating diyas
  function createDiyas() {
    try {
      const diyaContainers = document.querySelectorAll('.diya-container');
      diyaContainers.forEach(container => {
        const containerFragment = document.createDocumentFragment();
        for (let i = 0; i < 5; i++) {
          const diya = document.createElement('div');
          diya.className = 'diya';
          diya.style.left = `${Math.random() * 80 + 10}%`;
          diya.style.top = `${Math.random() * 80 + 10}%`;
          diya.style.animationDelay = `${Math.random() * 2}s`;
          const flame = document.createElement('div');
          flame.className = 'flame';
          diya.appendChild(flame);
          containerFragment.appendChild(diya);
        }
        container.appendChild(containerFragment);
      });
    } catch (e) {
      console.error('Error creating diyas:', e);
    }
  }

  // Media display setup
  function setupMediaDisplay() {
    try {
      const mediaDisplays = document.querySelectorAll('.media-display');
      mediaDisplays.forEach(display => {
        if (!display.dataset.mediaUrls) return;
        const mediaUrls = display.dataset.mediaUrls.split(',').filter(url => url.trim() !== '');
        if (!mediaUrls.length) return;

        display.innerHTML = '';
        const fragment = document.createDocumentFragment();
        const imageUrls = [];
        const audioUrls = [];

        mediaUrls.forEach(url => {
          if (url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) imageUrls.push(url);
          else if (url.match(/\.(mp3|wav|flac|ogg)$/i)) audioUrls.push(url);
        });

        if (imageUrls.length) {
          imageUrls.forEach((url, i) => {
            const img = document.createElement('img');
            img.src = url;
            img.alt = "Event Media";
            img.className = "media-image";
            img.loading = "lazy";
            img.style.display = i > 0 ? 'none' : 'block';
            fragment.appendChild(img);
          });
        }

        display.appendChild(fragment);
        const images = display.querySelectorAll('.media-image');
        if (images.length > 1) setupSlideshow(display, images);
        if (audioUrls.length) setupAudioPlayer(audioUrls);
      });
    } catch (e) {
      console.error('Error setting up media display:', e);
    }
  }

  // Slideshow functionality
  function setupSlideshow(display, images) {
    let currentIndex = 0;
    const controls = document.createElement('div');
    controls.className = 'slideshow-controls';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'slideshow-btn prev';
    prevBtn.innerHTML = '←';
    prevBtn.setAttribute('aria-label', 'Previous image');

    const nextBtn = document.createElement('button');
    nextBtn.className = 'slideshow-btn next';
    nextBtn.innerHTML = '→';
    nextBtn.setAttribute('aria-label', 'Next image');

    const indicators = document.createElement('div');
    indicators.className = 'slideshow-indicators';

    for (let i = 0; i < images.length; i++) {
      const dot = document.createElement('span');
      dot.className = i === 0 ? 'indicator active' : 'indicator';
      dot.setAttribute('data-index', i);
      indicators.appendChild(dot);
    }

    prevBtn.addEventListener('click', () => showSlide(currentIndex - 1));
    nextBtn.addEventListener('click', () => showSlide(currentIndex + 1));
    indicators.addEventListener('click', (e) => {
      if (e.target.classList.contains('indicator')) {
        const index = parseInt(e.target.dataset.index);
        showSlide(index);
      }
    });

    function showSlide(index) {
      currentIndex = (index + images.length) % images.length;
      images.forEach((img, i) => img.style.display = i === currentIndex ? 'block' : 'none');
      const dots = indicators.querySelectorAll('.indicator');
      dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
    }

    let touchStartX = 0;
    display.addEventListener('touchstart', (e) => touchStartX = e.changedTouches[0].screenX, { passive: true });
    display.addEventListener('touchend', (e) => {
      const diff = e.changedTouches[0].screenX - touchStartX;
      if (diff > 50) showSlide(currentIndex - 1);
      else if (diff < -50) showSlide(currentIndex + 1);
    }, { passive: true });

    display.setAttribute('tabindex', '0');
    display.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') showSlide(currentIndex - 1);
      else if (e.key === 'ArrowRight') showSlide(currentIndex + 1);
    });

    controls.appendChild(prevBtn);
    controls.appendChild(indicators);
    controls.appendChild(nextBtn);
    display.appendChild(controls);

    if (images.length > 1) {
      let slideshowInterval = setInterval(() => showSlide(currentIndex + 1), 5000);
      display.addEventListener('mouseenter', () => clearInterval(slideshowInterval));
      display.addEventListener('focus', () => clearInterval(slideshowInterval));
      display.addEventListener('mouseleave', () => slideshowInterval = setInterval(() => showSlide(currentIndex + 1), 5000));
      display.addEventListener('blur', () => slideshowInterval = setInterval(() => showSlide(currentIndex + 1), 5000));
    }
  }

  // Audio player setup
  function setupAudioPlayer(audioUrls) {
    const audioPlayer = document.querySelector('.audio-player');
    if (!audioPlayer) return;
    audioPlayer.innerHTML = '';
    const audio = document.createElement('audio');
    audio.controls = true;
    audioUrls.forEach(url => {
      const source = document.createElement('source');
      source.src = url;
      audio.appendChild(source);
    });
    audioPlayer.appendChild(audio);
  }

  // Page navigation
  function goToPage(pageNum) {
    if (!pageNum || pageNum < 1 || pageNum > cardPages.length) return;
    if (pageNum > 1 && !unlocked) {
      shakePasswordInput('Please unlock the card first');
      return;
    }
    if (Math.abs(pageNum - currentPage) > 1) return; // Restrict to sequential navigation

    currentPage = pageNum;
    saveData({ lastPage: currentPage });

    cardPages.forEach((page, index) => {
      const isActive = index + 1 === currentPage;
      page.classList.toggle('active', isActive);
      page.setAttribute('aria-hidden', !isActive);
    });

    pageIndicators.forEach((indicator, index) => {
      const isActive = index + 1 === currentPage;
      indicator.textContent = isActive ? '●' : '○';
      indicator.classList.toggle('active', isActive);
      indicator.setAttribute('aria-selected', isActive);
    });

    initPage(pageNum);
  }

  // Page-specific initialization
  function initPage(pageNum) {
    try {
      switch (pageNum) {
        case 2:
          setupBirthdayCountdown();
          setupAnniversaryClock();
          break;
        case 3:
          setupMediaDisplay();
          break;
        case 4:
          setupBirthdayCake();
          setupAnniversaryDance();
          setupMemoryTree();
          break;
        case 5:
          playFinalAnimation();
          setupVoiceNotePlayer();
          break;
      }
    } catch (e) {
      console.error(`Error initializing page ${pageNum}:`, e);
    }
  }

  // Birthday countdown
  function setupBirthdayCountdown() {
    if (eventType !== 'birthday') return;
    const countdownElement = document.querySelector('.countdown');
    const giftReveal = document.querySelector('.gift-reveal');
    const actionButton = document.querySelector('.action-button');
    if (!countdownElement || !actionButton) return;

    actionButton.addEventListener('click', function() {
      let count = 5;
      actionButton.style.display = 'none';
      countdownElement.textContent = count;
      countdownElement.setAttribute('aria-live', 'assertive');
      const interval = setInterval(() => {
        count--;
        countdownElement.textContent = count;
        if (count < 0) {
          clearInterval(interval);
          countdownElement.style.display = 'none';
          if (giftReveal) {
            giftReveal.classList.remove('hidden');
            giftReveal.setAttribute('aria-hidden', 'false');
          }
        }
      }, 1000);
    });
  }

  // Memory tree
  function setupMemoryTree() {
    const tree = document.querySelector('.memory-tree');
    const treeInstruction = document.querySelector('.tree-instruction');
    if (!tree) return;

    if (savedData.leaves && Array.isArray(savedData.leaves)) {
      const fragment = document.createDocumentFragment();
      savedData.leaves.forEach(leaf => {
        const leafEl = document.createElement('div');
        leafEl.className = 'memory-leaf';
        leafEl.style.left = `${leaf.x}px`;
        leafEl.style.top = `${leaf.y}px`;
        fragment.appendChild(leafEl);
      });
      tree.appendChild(fragment);
    }

    tree.addEventListener('click', function(e) {
      const rect = tree.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const leaf = document.createElement('div');
      leaf.className = 'memory-leaf';
      leaf.style.left = `${x}px`;
      leaf.style.top = `${y}px`;
      tree.appendChild(leaf);

      leaf.animate([
        { transform: 'scale(0)', opacity: 0 },
        { transform: 'scale(1.2)', opacity: 0.8 },
        { transform: 'scale(1)', opacity: 1 }
      ], { duration: 500, easing: 'ease-out' });

      if (!savedData.leaves) savedData.leaves = [];
      savedData.leaves.push({ x, y });
      saveData();

      if (tree.querySelectorAll('.memory-leaf').length > 5 && treeInstruction) {
        treeInstruction.textContent = 'Your tree is flourishing!';
      }
    });
  }

  // Confetti animation
  function showConfetti() {
    const colors = themes[eventType]?.confettiColors || themes.birthday.confettiColors;
    const container = document.getElementById('page-1');
    if (!container) return;

    const confettiPieces = [];
    const confettiDensity = Math.min(100, window.innerWidth / 10);

    for (let i = 0; i < confettiDensity; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.top = `-20px`;
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.width = `${Math.random() * 10 + 5}px`;
      confetti.style.height = `${Math.random() * 10 + 5}px`;
      confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

      confetti.speedY = Math.random() * 3 + 2;
      confetti.speedX = Math.random() * 2 - 1;
      confetti.rotateSpeed = Math.random() * 6 - 3;

      container.appendChild(confetti);
      confettiPieces.push({
        element: confetti,
        x: parseFloat(confetti.style.left),
        y: -20,
        speedY: confetti.speedY,
        speedX: confetti.speedX,
        rotate: Math.random() * 360,
        rotateSpeed: confetti.rotateSpeed
      });
    }

    let animationId;
    const animate = () => {
      confettiPieces.forEach((piece, i) => {
        piece.y += piece.speedY;
        piece.x += piece.speedX;
        piece.rotate += piece.rotateSpeed;
        piece.element.style.top = `${piece.y}px`;
        piece.element.style.left = `${piece.x}%`;
        piece.element.style.transform = `rotate(${piece.rotate}deg)`;
        if (piece.y > container.offsetHeight + 100) {
          piece.element.remove();
          confettiPieces.splice(i, 1);
        }
      });
      if (confettiPieces.length > 0) animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    setTimeout(() => {
      cancelAnimationFrame(animationId);
      confettiPieces.forEach(piece => piece.element.remove());
      confettiPieces.length = 0;
    }, 5000);
  }

  // Anniversary clock
  function setupAnniversaryClock() {
    if (eventType !== 'anniversary') return;
    const clockContainer = document.querySelector('.anniversary-clock');
    if (!clockContainer) return;

    const clockFace = document.createElement('div');
    clockFace.className = 'clock-face';
    const hourHand = document.createElement('div');
    hourHand.className = 'clock-hand hour';
    const minuteHand = document.createElement('div');
    minuteHand.className = 'clock-hand minute';
    const secondHand = document.createElement('div');
    secondHand.className = 'clock-hand second';
    const clockCenter = document.createElement('div');
    clockCenter.className = 'clock-center';

    for (let i = 1; i <= 12; i++) {
      const marker = document.createElement('div');
      marker.className = 'clock-marker';
      marker.textContent = i;
      marker.style.transform = `rotate(${i * 30}deg) translateY(-40px) rotate(${-i * 30}deg)`;
      clockFace.appendChild(marker);
    }

    clockFace.appendChild(hourHand);
    clockFace.appendChild(minuteHand);
    clockFace.appendChild(secondHand);
    clockFace.appendChild(clockCenter);
    clockContainer.appendChild(clockFace);

    const milestoneText = document.querySelector('.milestone-text');
    let animationStartTime = null;
    let animationSpeed = 50;

    function animateClock(timestamp) {
      if (!animationStartTime) animationStartTime = timestamp;
      const progress = (timestamp - animationStartTime) * animationSpeed;
      const date = new Date(progress);
      const seconds = date.getSeconds();
      const minutes = date.getMinutes();
      const hours = date.getHours() % 12;

      secondHand.style.transform = `rotate(${(seconds * 6)}deg)`;
      minuteHand.style.transform = `rotate(${(minutes * 6)}deg)`;
      hourHand.style.transform = `rotate(${(hours * 30) + (minutes * 0.5)}deg)`;

      if (progress < 86400000) requestAnimationFrame(animateClock);
      else if (milestoneText) {
        milestoneText.classList.add('highlight');
        milestoneText.textContent = "Here's to many more years together! 💕";
      }
    }

    requestAnimationFrame(animateClock);
  }

  // Anniversary dance
  function setupAnniversaryDance() {
    if (eventType !== 'anniversary') return;
    const danceButton = document.querySelector('.dance-button');
    const danceAnimation = document.querySelector('.dance-animation');
    if (!danceButton || !danceAnimation) return;

    danceButton.addEventListener('click', function() {
      danceAnimation.innerHTML = '';
      danceAnimation.classList.add('active');
      const dancers = document.createElement('div');
      dancers.className = 'dancers';
      dancers.textContent = '💃 🕺';
      const hearts = document.createElement('div');
      hearts.className = 'hearts';

      for (let i = 0; i < 15; i++) {
        const heart = document.createElement('span');
        heart.textContent = '❤️';
        heart.className = 'heart';
        heart.style.left = `${Math.random() * 80 + 10}%`;
        heart.style.animationDuration = `${Math.random() * 2 + 2}s`;
        heart.style.animationDelay = `${Math.random() * 3}s`;
        hearts.appendChild(heart);
      }

      const notes = ['🎵', '🎶', '♪', '♫', '🎼'];
      for (let i = 0; i < 10; i++) {
        const note = document.createElement('span');
        note.textContent = notes[Math.floor(Math.random() * notes.length)];
        note.className = 'music-note';
        note.style.left = `${Math.random() * 80 + 10}%`;
        note.style.animationDuration = `${Math.random() * 2 + 1}s`;
        note.style.animationDelay = `${Math.random() * 2}s`;
        hearts.appendChild(note);
      }

      danceAnimation.appendChild(dancers);
      danceAnimation.appendChild(hearts);
      danceButton.textContent = 'Keep Dancing!';

      try {
        if (window.AudioContext || window.webkitAudioContext) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          const audioCtx = new AudioContext();
          const playNote = (frequency, startTime, duration) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            gainNode.gain.setValueAtTime(0.3, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
          };

          const now = audioCtx.currentTime;
          const waltzNotes = [
            { note: 440, time: 0, duration: 0.5 },
            { note: 493.88, time: 0.5, duration: 0.5 },
            { note: 523.25, time: 1, duration: 0.5 },
            { note: 440, time: 1.5, duration: 0.5 },
            { note: 493.88, time: 2, duration: 0.5 },
            { note: 523.25, time: 2.5, duration: 0.5 },
          ];

          waltzNotes.forEach(noteObj => playNote(noteObj.note, now + noteObj.time, noteObj.duration));
        }
      } catch (e) {
        console.error('Error playing music:', e);
      }
    });
  }

  // Birthday cake
  function setupBirthdayCake() {
    if (eventType !== 'birthday') return;
    const cake = document.querySelector('.birthday-cake');
    const instruction = document.querySelector('.cake-instruction');
    if (!cake) return;

    const candles = document.createElement('div');
    candles.className = 'candles';
    for (let i = 0; i < 5; i++) {
      const candle = document.createElement('div');
      candle.className = 'candle';
      const flame = document.createElement('div');
      flame.className = 'flame';
      candle.appendChild(flame);
      candles.appendChild(candle);
    }
    cake.appendChild(candles);

    let isBurning = true;
    cake.addEventListener('click', function() {
      if (!isBurning) return;
      const blowAnimation = document.createElement('div');
      blowAnimation.className = 'blow-animation';
      cake.appendChild(blowAnimation);

      const flames = cake.querySelectorAll('.flame');
      flames.forEach(flame => flame.classList.add('extinguished'));
      if (instruction) instruction.textContent = 'Your wish has been made! 🌟';
      isBurning = false;

      setTimeout(() => {
        showConfetti();
        const wishGranted = document.createElement('div');
        wishGranted.className = 'wish-granted';
        wishGranted.textContent = 'Wish Granted!';
        wishGranted.style.opacity = '0';
        cake.appendChild(wishGranted);
        setTimeout(() => wishGranted.style.opacity = '1', 100);
      }, 1000);
    });
  }

  // Final animation
  function playFinalAnimation() {
    const finalAnimation = document.querySelector('.final-animation');
    if (!finalAnimation) return;
    const fragment = document.createDocumentFragment();
    let animationElements = [];

    if (eventType === 'birthday') {
      for (let i = 0; i < 10; i++) {
        const balloon = document.createElement('div');
        balloon.className = 'balloon';
        balloon.innerHTML = '🎈';
        balloon.style.left = `${Math.random() * 80 + 10}%`;
        balloon.style.animationDuration = `${Math.random() * 5 + 5}s`;
        balloon.style.animationDelay = `${Math.random() * 2}s`;
        fragment.appendChild(balloon);
        animationElements.push(balloon);
      }
      for (let i = 0; i < 5; i++) {
        const gift = document.createElement('div');
        gift.className = 'gift';
        gift.innerHTML = '🎁';
        gift.style.left = `${Math.random() * 80 + 10}%`;
        gift.style.animationDuration = `${Math.random() * 3 + 3}s`;
        gift.style.animationDelay = `${Math.random() * 2}s`;
        fragment.appendChild(gift);
        animationElements.push(gift);
      }
    } else if (eventType === 'anniversary') {
      const rings = document.createElement('div');
      rings.className = 'rings';
      rings.innerHTML = '💍 💍';
      fragment.appendChild(rings);
      animationElements.push(rings);
      for (let i = 0; i < 15; i++) {
        const heart = document.createElement('div');
        heart.className = 'heart';
        heart.innerHTML = ['❤️', '💖', '💘', '💕', '💗'][Math.floor(Math.random() * 5)];
        heart.style.left = `${Math.random() * 80 + 10}%`;
        heart.style.animationDuration = `${Math.random() * 4 + 4}s`;
        heart.style.animationDelay = `${Math.random() * 3}s`;
        fragment.appendChild(heart);
        animationElements.push(heart);
      }
    } else {
      for (let i = 0; i < 20; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.innerHTML = ['✨', '🌟', '⭐', '💫', '🌠'][Math.floor(Math.random() * 5)];
        star.style.left = `${Math.random() * 80 + 10}%`;
        star.style.animationDuration = `${Math.random() * 4 + 3}s`;
        star.style.animationDelay = `${Math.random() * 2}s`;
        fragment.appendChild(star);
        animationElements.push(star);
      }
    }

    finalAnimation.appendChild(fragment);
    setTimeout(() => {
      animationElements.forEach(el => el?.parentNode?.removeChild(el));
      animationElements = [];
    }, 10000);
  }

  // Voice note player
  function setupVoiceNotePlayer() {
    if (!elements.playVoiceNote || !elements.voiceNote) return;
    elements.playVoiceNote.addEventListener('click', function() {
      elements.voiceNote.hidden = !elements.voiceNote.hidden;
      if (!elements.voiceNote.hidden) {
        this.textContent = 'Hide Reflection';
        if (window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(elements.voiceNote.textContent);
          speechSynthesis.speak(utterance);
        }
      } else {
        this.textContent = 'Play Reflection';
        if (window.speechSynthesis) speechSynthesis.cancel();
      }
    });
  }

  // Sharing functionality
  function setupSharing() {
    if (elements.shareButton) {
      elements.shareButton.addEventListener('click', () => {
        elements.shareModal.style.display = 'flex';
        elements.sharePasswordInput?.focus();
      });
    }

    if (elements.closeModalButton) {
      elements.closeModalButton.addEventListener('click', () => {
        elements.shareModal.style.display = 'none';
        if (elements.sharePasswordInput) elements.sharePasswordInput.value = '';
        elements.shareUrlContainer.style.display = 'none';
      });
    }

    if (elements.sharePasswordForm) {
      elements.sharePasswordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const csrftoken = getCookie('csrftoken');

        fetch(this.action, {
          method: 'POST',
          headers: { 'X-CSRFToken': csrftoken },
          body: formData
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            elements.shareUrlElement.textContent = data.share_url;
            elements.shareUrlContainer.style.display = 'block';
            elements.whatsappLink.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(data.share_url)}`;
            elements.twitterLink.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(data.share_url)}`;
            elements.emailLink.href = `mailto:?body=${encodeURIComponent(data.share_url)}`;
            if (data.warning) showFeedback(data.warning);
            if (navigator.share) {
              navigator.share({
                title: 'Greeting Card',
                text: 'Check out my greeting card!',
                url: data.share_url
              }).catch(err => console.error('Share failed:', err));
            }
          } else {
            showFeedback(data.error || 'Failed to generate share link');
          }
        })
        .catch(err => {
          console.error('Error generating share link:', err);
          showFeedback('Failed to generate share link');
        });
      });
    }
  }

  // Navigation event listeners
  elements.nextButtons.forEach(button => button.addEventListener('click', () => goToPage(currentPage + 1)));
  elements.prevButtons.forEach(button => button.addEventListener('click', () => goToPage(currentPage - 1)));

  // Feedback toast
  function showFeedback(message) {
    const toast = document.createElement('div');
    toast.className = 'feedback-toast';
    toast.textContent = message;
    toast.setAttribute('aria-live', 'assertive');
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    }, 10);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Initialize first page
  setupSharing();
  goToPage(1);
});