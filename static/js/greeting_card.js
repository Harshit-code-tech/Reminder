document.addEventListener('DOMContentLoaded', function() {
  // Configuration
  const themes = {
    'birthday': {
      password: function(name) { return name.trim().toLowerCase(); },
      quotes: [
        "May your day be as bright as your smile!",
        "Another year of awesome you!",
        "Age is merely the number of years the world has been enjoying you.",
        "Shine bright today and always!",
        "You're not getting older, you're getting better!"
      ],
      confettiColors: ['#fde68a', '#fbbf24', '#f59e0b', '#d97706']
    },
    'anniversary': {
      password: function(date) { return date; },
      quotes: [
        "Love grows stronger every year!",
        "The best is yet to come.",
        "Forever isn't long enough with you.",
        "Through all the seasons, my love for you grows.",
        "Every moment with you is a blessing."
      ],
      confettiColors: ['#fbcfe8', '#f472b6', '#db2777', '#be185d']
    },
    'other': {
      password: function(label) { return label.trim().toLowerCase(); },
      quotes: [
        "Cherish every moment of your journey!",
        "Keep shining your light on the world!",
        "The adventure continues!",
        "You're making a difference every day.",
        "The best journeys are shared with friends like you."
      ],
      confettiColors: ['#a5f3fc', '#22d3ee', '#0891b2', '#0e7490']
    }
  };

  // Card Elements
  const cardContainer = document.querySelector('.card-container');
  const eventType = cardContainer.dataset.theme || 'birthday';
  const culturalTheme = cardContainer.dataset.culturalTheme === 'true';
  const cardPages = document.querySelectorAll('.card-page');
  const pageIndicators = document.querySelectorAll('.page-indicator .indicator');
  const recipientNameElements = document.querySelectorAll('.recipient-name');
  const saveButton = document.querySelector('.save-button');
  const saveCardButton = document.querySelector('.save-card');

  // Page 1 Elements
  const passwordInput = document.querySelector('.password-input');
  const unlockButton = document.querySelector('.unlock-button');
  const passwordHint = document.querySelector('.password-hint');

  // Page Navigation
  const nextButtons = document.querySelectorAll('.nav-button.next');
  const prevButtons = document.querySelectorAll('.nav-button.prev');

  // Current state
  let currentPage = 1;
  let unlocked = false;
  let savedData = JSON.parse(localStorage.getItem('cardState')) || { leaves: [], unlocked: false };

  // Load saved state
  if (savedData.unlocked) {
    unlocked = true;
    goToPage(1);
  }

  // Create Diyas if cultural theme is enabled
  if (culturalTheme) {
    createDiyas();
  }

  // Initialize quotes
  initializeQuotes();

  // Set random motivational quote
  function initializeQuotes() {
    const quoteElements = document.querySelectorAll('.inspiration-quote');
    const themeQuotes = themes[eventType].quotes;

    quoteElements.forEach(quoteEl => {
      const randomQuote = themeQuotes[Math.floor(Math.random() * themeQuotes.length)];
      quoteEl.textContent = randomQuote;
    });
  }

  // Create floating diyas for cultural theme
  function createDiyas() {
    const diyaContainers = document.querySelectorAll('.diya-container');

    diyaContainers.forEach(container => {
      for (let i = 0; i < 5; i++) {
        const diya = document.createElement('div');
        diya.className = 'diya';
        diya.style.left = `${Math.random() * 80 + 10}%`;
        diya.style.top = `${Math.random() * 80 + 10}%`;
        diya.style.animationDelay = `${Math.random() * 2}s`;

        const flame = document.createElement('div');
        flame.className = 'flame';
        diya.appendChild(flame);

        container.appendChild(diya);
      }
    });
  }

  // Handle media display
  function setupMediaDisplay() {
    const mediaDisplays = document.querySelectorAll('.media-display');

    mediaDisplays.forEach(display => {
      if (display.dataset.mediaUrls) {
        const mediaUrls = display.dataset.mediaUrls.split(',').filter(url => url.trim() !== '');
        display.innerHTML = '';

        mediaUrls.forEach(url => {
          if (url.match(/\.(jpeg|jpg|gif|png)$/i)) {
            const img = document.createElement('img');
            img.src = url;
            img.alt = "Event Media";
            img.className = "media-image";
            display.appendChild(img);
          } else if (url.match(/\.(mp3|wav|flac)$/i)) {
            const audioPlayer = document.querySelector('.audio-player');
            if (audioPlayer) {
              const audio = document.createElement('audio');
              audio.controls = true;
              const source = document.createElement('source');
              source.src = url;
              audio.appendChild(source);
              audioPlayer.appendChild(audio);
            }
          }
        });

        const images = display.querySelectorAll('.media-image');
        if (images.length > 1) {
          let currentIndex = 0;
          images.forEach((img, i) => {
            if (i > 0) img.style.display = 'none';
          });

          const controls = document.createElement('div');
          controls.className = 'slideshow-controls';

          const prevBtn = document.createElement('button');
          prevBtn.className = 'slideshow-btn prev';
          prevBtn.innerHTML = '←';
          prevBtn.addEventListener('click', () => {
            images[currentIndex].style.display = 'none';
            currentIndex = (currentIndex - 1 + images.length) % images.length;
            images[currentIndex].style.display = 'block';
          });

          const nextBtn = document.createElement('button');
          nextBtn.className = 'slideshow-btn next';
          nextBtn.innerHTML = '→';
          nextBtn.addEventListener('click', () => {
            images[currentIndex].style.display = 'none';
            currentIndex = (currentIndex + 1) % images.length;
            images[currentIndex].style.display = 'block';
          });

          controls.appendChild(prevBtn);
          controls.appendChild(nextBtn);
          display.appendChild(controls);
        }
      }
    });
  }

  // Page Navigation
  function goToPage(pageNum) {
    if (pageNum < 1 || pageNum > cardPages.length) return;
    if (pageNum > 1 && !unlocked) {
      shakePasswordInput();
      return;
    }

    currentPage = pageNum;

    cardPages.forEach((page, index) => {
      page.classList.toggle('active', index + 1 === currentPage);
    });

    pageIndicators.forEach((indicator, index) => {
      indicator.textContent = index + 1 === currentPage ? '●' : '○';
      indicator.classList.toggle('active', index + 1 === currentPage);
    });

    initPage(pageNum);
  }

  // Password validation
  function validatePassword() {
    const recipientName = recipientNameElements[0]?.textContent || '';
    let expectedPassword;

    switch (eventType) {
      case 'birthday':
        expectedPassword = themes.birthday.password(recipientName);
        break;
      case 'anniversary':
        expectedPassword = passwordInput.value.trim();
        break;
      case 'other':
        const customLabel = cardContainer.dataset.customLabel || '';
        expectedPassword = customLabel ?
                          themes.other.password(customLabel) :
                          themes.other.password(recipientName);
        break;
    }

    const inputPassword = passwordInput.value.trim().toLowerCase();

    if (inputPassword && (inputPassword === expectedPassword || inputPassword === recipientName.toLowerCase().trim())) {
      unlocked = true;
      savedData.unlocked = true;
      localStorage.setItem('cardState', JSON.stringify(savedData));
      showConfetti();
      setTimeout(() => goToPage(2), 1000);
      return true;
    }

    shakePasswordInput();
    return false;
  }

  function shakePasswordInput() {
    passwordInput.classList.add('error');
    passwordInput.style.animation = 'shake 0.5s ease';
    setTimeout(() => {
      passwordInput.style.animation = '';
      passwordInput.classList.remove('error');
    }, 500);
  }

  // Birthday Countdown
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

      const interval = setInterval(() => {
        count--;
        countdownElement.textContent = count;

        if (count < 0) {
          clearInterval(interval);
          countdownElement.style.display = 'none';
          if (giftReveal) {
            giftReveal.classList.remove('hidden');
          }
        }
      }, 1000);
    });
  }

  // Anniversary Clock
  function setupAnniversaryClock() {
    if (eventType !== 'anniversary') return;

    const clock = document.querySelector('.anniversary-clock');
    if (!clock) return;

    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours() % 12 || 12;
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();

      const hourDeg = (hours + minutes / 60) * 30;
      const minuteDeg = (minutes + seconds / 60) * 6;
      const secondDeg = seconds * 6;

      const hourHand = clock.querySelector('.hour-hand');
      const minuteHand = clock.querySelector('.minute-hand');
      const secondHand = clock.querySelector('.second-hand');

      if (hourHand) hourHand.style.transform = `rotate(${hourDeg}deg)`;
      if (minuteHand) minuteHand.style.transform = `rotate(${minuteDeg}deg)`;
      if (secondHand) secondHand.style.transform = `rotate(${secondDeg}deg)`;
    };

    updateClock();
    setInterval(updateClock, 1000);
  }

  // Birthday Cake
  function setupBirthdayCake() {
    if (eventType !== 'birthday') return;

    const cake = document.querySelector('.birthday-cake');
    if (!cake) return;

    cake.addEventListener('click', function() {
      const flames = cake.querySelectorAll('.flame');
      flames.forEach(flame => {
        flame.style.opacity = '0';
        flame.style.transform = 'scale(0)';
      });

      showSparkles(cake);
      const instruction = document.querySelector('.cake-instruction');
      if (instruction) {
        instruction.textContent = 'Your wish has been made!';
      }
    });
  }

  // Anniversary Dance
  function setupAnniversaryDance() {
    if (eventType !== 'anniversary') return;

    const danceButton = document.querySelector('.dance-button');
    const danceAnimation = document.querySelector('.dance-animation');

    if (!danceButton || !danceAnimation) return;

    danceButton.addEventListener('click', function() {
      danceAnimation.innerHTML = '';
      danceButton.textContent = 'Dancing...';
      danceButton.disabled = true;

      for (let i = 0; i < 20; i++) {
        const heart = document.createElement('div');
        heart.textContent = '💖';
        heart.style.position = 'absolute';
        heart.style.fontSize = `${Math.random() * 20 + 15}px`;
        heart.style.left = `${Math.random() * 100}%`;
        heart.style.top = `${Math.random() * 100}%`;
        heart.style.opacity = '0';
        heart.style.animation = `fadeInOut ${Math.random() * 3 + 2}s ease infinite`;
        heart.style.animationDelay = `${Math.random() * 2}s`;

        danceAnimation.appendChild(heart);
      }

      setTimeout(() => {
        danceAnimation.innerHTML = '';
        danceButton.textContent = 'Dance Again!';
        danceButton.disabled = false;
      }, 5000);
    });
  }

  // Memory Tree
  function setupMemoryTree() {
    const tree = document.querySelector('.memory-tree');
    const treeInstruction = document.querySelector('.tree-instruction');
    if (!tree) return;

    // Load saved leaves
    savedData.leaves.forEach(leaf => {
      const leafEl = document.createElement('div');
      leafEl.className = 'memory-leaf';
      leafEl.style.left = `${leaf.x}px`;
      leafEl.style.top = `${leaf.y}px`;
      tree.appendChild(leafEl);
    });

    tree.addEventListener('click', function(e) {
      const rect = tree.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const leaf = document.createElement('div');
      leaf.className = 'memory-leaf';
      leaf.style.left = `${x}px`;
      leaf.style.top = `${y}px`;
      tree.appendChild(leaf);

      savedData.leaves.push({ x, y });
      localStorage.setItem('cardState', JSON.stringify(savedData));

      if (tree.querySelectorAll('.memory-leaf').length > 5 && treeInstruction) {
        treeInstruction.textContent = 'Your tree is flourishing!';
      }
    });
  }

  // Display confetti
  function showConfetti() {
    const colors = themes[eventType].confettiColors;
    const container = document.getElementById('page-1');

    for (let i = 0; i < 100; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.top = `-20px`;
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.width = `${Math.random() * 10 + 5}px`;
      confetti.style.height = `${Math.random() * 10 + 5}px`;
      confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
      confetti.style.animation = `fall ${Math.random() * 3 + 2}s ease-in forwards`;

      container.appendChild(confetti);
      setTimeout(() => confetti.remove(), 5000);
    }
  }

  // Show sparkles
  function showSparkles(element) {
    const rect = element.getBoundingClientRect();
    const container = element.parentElement;

    for (let i = 0; i < 30; i++) {
      const sparkle = document.createElement('div');
      sparkle.className = 'sparkle';
      sparkle.style.position = 'absolute';
      sparkle.style.left = `${rect.left + Math.random() * rect.width - 10}px`;
      sparkle.style.top = `${rect.top + Math.random() * rect.height - 10}px`;
      sparkle.style.width = `${Math.random() * 6 + 4}px`;
      sparkle.style.height = sparkle.style.width;
      sparkle.style.backgroundColor = themes[eventType].confettiColors[
        Math.floor(Math.random() * themes[eventType].confettiColors.length)
      ];
      sparkle.style.borderRadius = '50%';
      sparkle.style.boxShadow = `0 0 ${Math.random() * 10 + 5}px ${sparkle.style.backgroundColor}`;
      sparkle.style.animation = `sparkle ${Math.random() * 1 + 1}s ease-out forwards`;

      document.body.appendChild(sparkle);
      setTimeout(() => sparkle.remove(), 2000);
    }
  }

  // Play final farewell animation
  function playFinalAnimation() {
    const finalAnimation = document.querySelector('#page-5 .final-animation');
    if (!finalAnimation) return;

    if (eventType === 'birthday') {
      for (let i = 0; i < 10; i++) {
        const balloon = document.createElement('div');
        balloon.textContent = '🎈';
        balloon.style.position = 'absolute';
        balloon.style.fontSize = `${Math.random() * 20 + 20}px`;
        balloon.style.left = `${Math.random() * 100}%`;
        balloon.style.bottom = `-50px`;
        balloon.style.opacity = '0';
        balloon.style.animation = `riseUp ${Math.random() * 3 + 4}s ease-out forwards`;
        balloon.style.animationDelay = `${Math.random() * 2}s`;

        finalAnimation.appendChild(balloon);
        setTimeout(() => balloon.remove(), 6000);
      }
    } else if (eventType === 'anniversary') {
      for (let i = 0; i < 20; i++) {
        const heart = document.createElement('div');
        heart.textContent = '💖';
        heart.style.position = 'absolute';
        heart.style.fontSize = `${Math.random() * 20 + 15}px`;
        heart.style.left = `${Math.random() * 100}%`;
        heart.style.top = `-50px`;
        heart.style.opacity = '0';
        heart.style.animation = `fallSlowly ${Math.random() * 5 + 5}s ease-in forwards`;
        heart.style.animationDelay = `${Math.random() * 3}s`;

        finalAnimation.appendChild(heart);
        setTimeout(() => heart.remove(), 8000);
      }
    } else {
      for (let i = 0; i < 50; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle-final';
        sparkle.style.position = 'absolute';
        sparkle.style.width = `${Math.random() * 10 + 5}px`;
        sparkle.style.height = sparkle.style.width;
        sparkle.style.backgroundColor = themes.other.confettiColors[
          Math.floor(Math.random() * themes.other.confettiColors.length)
        ];
        sparkle.style.borderRadius = '50%';
        sparkle.style.left = `${Math.random() * 100}%`;
        sparkle.style.top = `${Math.random() * 100}%`;
        sparkle.style.opacity = '0';
        sparkle.style.boxShadow = `0 0 ${Math.random() * 15 + 5}px ${sparkle.style.backgroundColor}`;
        sparkle.style.animation = `twinkle ${Math.random() * 3 + 2}s ease infinite`;
        sparkle.style.animationDelay = `${Math.random() * 3}s`;

        finalAnimation.appendChild(sparkle);
        setTimeout(() => sparkle.remove(), 5000);
      }
    }

    const playVoiceNoteButton = document.querySelector('.play-voice-note');
    if (playVoiceNoteButton) {
      playVoiceNoteButton.addEventListener('click', function() {
        const noteText = document.querySelector('.voice-note-text');
        if (noteText) {
          noteText.style.display = 'block';
          this.textContent = 'Reading...';
          setTimeout(() => {
            this.textContent = 'Play Voice Note';
          }, 3000);
        }
      });
    }
  }

  // Save functionality
  function setupSaveFunctionality() {
    if (saveButton) {
      saveButton.addEventListener('click', function() {
        localStorage.setItem('cardState', JSON.stringify(savedData));
        alert('This memory has been saved to your collection!');
      });
    }

    if (saveCardButton) {
      saveCardButton.addEventListener('click', function() {
        localStorage.setItem('cardState', JSON.stringify(savedData));
        alert('Card saved! You can access it anytime from your saved cards.');
      });
    }
  }

  // Page-specific initialization
  function initPage(pageNum) {
    switch (pageNum) {
      case 1:
        if (unlockButton && passwordInput) {
          unlockButton.addEventListener('click', validatePassword);
          passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') validatePassword();
          });
        }
        break;
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
        break;
    }
  }

  // Event listeners for navigation
  nextButtons.forEach(button => {
    button.addEventListener('click', () => goToPage(currentPage + 1));
  });

  prevButtons.forEach(button => {
    button.addEventListener('click', () => goToPage(currentPage - 1));
  });

  pageIndicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => {
      if (index + 1 <= currentPage + 1) {
        goToPage(index + 1);
      }
    });
  });

  // Initialize save functionality
  setupSaveFunctionality();

  // Initialize first page
  goToPage(1);
});