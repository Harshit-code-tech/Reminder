function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.querySelector('#id_image_files');
    const audioInput = document.querySelector('#id_audio_files');
    const previewContainer = document.querySelector('#media-preview');
    const removeCheckbox = document.querySelector('input[name="remove_media"]');
    const eventTypeSelect = document.getElementById('id_event_type');
    const recurringField = document.getElementById('recurring-field');
    const customLabelField = document.getElementById('custom-label-field');
    const recipientEmailInput = document.getElementById('id_recipient_email');
    const form = document.querySelector('form');
    const memoryTypeRadios = document.querySelectorAll('input[name="memory_display_type"]');
    const highlightsSection = document.getElementById('highlights-section');
    const threadOfMemoriesSection = document.getElementById('thread-of-memories-section');
        const sections = document.querySelectorAll('.form-section');
    const progressBar = document.querySelector('.progress-bar');
    const nextButtons = document.querySelectorAll('.next-section-btn');
    const prevButtons = document.querySelectorAll('.prev-section-btn');
    let currentSection = 0;

    function updateProgressBar() {
        const progress = ((currentSection + 1) / sections.length) * 100;
        progressBar.style.width = `${progress}%`;
    }

    function showSection(index) {
        sections.forEach((section, idx) => {
            section.classList.toggle('hidden', idx !== index);
        });
        currentSection = index;
        updateProgressBar();
    }

    nextButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (currentSection < sections.length - 1) {
                showSection(currentSection + 1);
            }
        });
    });

    prevButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (currentSection > 0) {
                showSection(currentSection - 1);
            }
        });
    });

    // Initialize progress bar
    updateProgressBar();

    // Enhanced image previews
    const imagePreviewContainer = document.querySelector('.image-preview-container');

    if (imageInput && imagePreviewContainer) {
        imageInput.addEventListener('change', (event) => {
            imagePreviewContainer.innerHTML = '';
            Array.from(event.target.files).slice(0, 3).forEach(file => {
                const previewUrl = URL.createObjectURL(file);

                const previewDiv = document.createElement('div');
                previewDiv.className = 'relative group';

                const img = document.createElement('img');
                img.src = previewUrl;
                img.className = 'h-32 w-auto object-cover rounded-lg border border-gray-200 dark:border-gray-700';

                const removeBtn = document.createElement('button');
                removeBtn.innerHTML = '×';
                removeBtn.className = 'absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity';

                previewDiv.appendChild(img);
                previewDiv.appendChild(removeBtn);
                imagePreviewContainer.appendChild(previewDiv);
            });
        });
    }

    // Audio preview
    const audioPreviewContainer = document.querySelector('.audio-preview-container');

    if (audioInput && audioPreviewContainer) {
        audioInput.addEventListener('change', (event) => {
            audioPreviewContainer.innerHTML = '';
            Array.from(event.target.files).slice(0, 1).forEach(file => {
                const previewUrl = URL.createObjectURL(file);

                const audioContainer = document.createElement('div');
                audioContainer.className = 'p-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-800';

                const audio = document.createElement('audio');
                audio.controls = true;
                audio.className = 'w-full';
                audio.src = previewUrl;

                const filename = document.createElement('p');
                filename.className = 'text-xs text-gray-500 dark:text-gray-400 mt-1 truncate';
                filename.textContent = file.name;

                audioContainer.appendChild(audio);
                audioContainer.appendChild(filename);
                audioPreviewContainer.appendChild(audioContainer);
            });
        });
    }

    // Feedback widget
    const feedbackToggle = document.querySelector('.feedback-toggle');
    const feedbackForm = document.querySelector('.feedback-form');
    const ratingButtons = document.querySelectorAll('.rating-btn');
    const submitFeedback = document.querySelector('.submit-feedback');

    if (feedbackToggle && feedbackForm) {
        feedbackToggle.addEventListener('click', () => {
            feedbackForm.classList.toggle('hidden');
        });

        ratingButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                ratingButtons.forEach(b => b.classList.remove('text-yellow-500'));
                btn.classList.add('text-yellow-500');
            });
        });

        submitFeedback.addEventListener('click', () => {
            const rating = document.querySelector('.rating-btn.text-yellow-500')?.dataset.rating;
            const comment = document.querySelector('.feedback-form textarea').value;

            if (rating) {
                // Here you'd send feedback to the server
                console.log('Feedback:', { rating, comment });

                // Feedback animation and message
                feedbackForm.innerHTML = '<p class="text-green-600 dark:text-green-400 font-semibold py-3 text-center">Thank you for your feedback!</p>';

                // Hide the form after delay
                setTimeout(() => {
                    feedbackForm.classList.add('hidden');
                    setTimeout(() => {
                        // Reset the form
                        feedbackForm.innerHTML = document.querySelector('.feedback-form').innerHTML;
                    }, 500);
                }, 2000);
            }
        });
    }

    // Form validation enhancement

    if (form) {
        form.addEventListener('submit', function(e) {
            const nameInput = document.querySelector('#id_name');
            const dateInput = document.querySelector('#id_date');

            let isValid = true;

            if (!nameInput.value.trim()) {
                isValid = false;
                highlightField(nameInput, 'Name is required');
            }

            if (!dateInput.value) {
                isValid = false;
                highlightField(dateInput, 'Date is required');
            }

            if (!isValid) {
                e.preventDefault();
                showSection(0); // Go back to first section
            }
        });
    }

    function highlightField(field, message) {
        field.classList.add('border-red-500');
        field.classList.add('bg-red-50');

        const errorMsg = document.createElement('p');
        errorMsg.className = 'text-red-600 text-xs mt-1';
        errorMsg.textContent = message;

        const parent = field.parentElement;
        const existingError = parent.querySelector('.text-red-600');

        if (!existingError) {
            parent.appendChild(errorMsg);
        }

        field.addEventListener('focus', function() {
            field.classList.remove('border-red-500');
            field.classList.remove('bg-red-50');
            const error = parent.querySelector('.text-red-600');
            if (error) error.remove();
        }, { once: true });
    }

    // Animated background for form
    const formContainer = document.querySelector('.max-w-3xl');
    if (formContainer) {
        formContainer.style.position = 'relative';
        formContainer.style.zIndex = '1';

        const bg = document.createElement('div');
        bg.classList.add('animated-bg');
        bg.style.position = 'absolute';
        bg.style.top = '0';
        bg.style.left = '0';
        bg.style.width = '100%';
        bg.style.height = '100%';
        bg.style.zIndex = '-1';
        bg.style.opacity = '0.5';
        bg.style.background = 'linear-gradient(135deg, rgba(167, 139, 250, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)';

        formContainer.prepend(bg);

        document.addEventListener('mousemove', (e) => {
            const x = e.clientX / window.innerWidth;
            const y = e.clientY / window.innerHeight;

            bg.style.background = `linear-gradient(135deg,
                rgba(167, 139, 250, ${0.05 + x * 0.1}) ${(y * 10)}%,
                rgba(139, 92, 246, ${0.05 + y * 0.1}) ${90 + x * 10}%)`;
        });
    }


    let previewUrls = [];

    function clearPreviews() {
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        previewUrls = [];
        previewContainer.innerHTML = '';
    }
        // Memory display type toggle

    // Handle Thread of Memories functionality
    if (memoryTypeRadios.length && highlightsSection && threadOfMemoriesSection) {
        const memoriesContainer = document.getElementById('memories-container');
        const addMemoryBtn = document.getElementById('add-memory-btn');
        const threadOfMemoriesInput = document.getElementById('id_thread_of_memories');

        // Set thread_of_memories input as hidden
        if (threadOfMemoriesInput) {
            threadOfMemoriesInput.style.display = 'none';
        }

        // Toggle between highlights and thread of memories
        memoryTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.value === 'highlights') {
                    highlightsSection.classList.remove('hidden');
                    threadOfMemoriesSection.classList.add('hidden');
                    // Clear thread of memories field
                    if (threadOfMemoriesInput) {
                        threadOfMemoriesInput.value = '';
                    }
                } else if (radio.value === 'thread_of_memories') {
                    highlightsSection.classList.add('hidden');
                    threadOfMemoriesSection.classList.remove('hidden');
                    // Clear highlights field
                    document.getElementById('id_highlights').value = '';
                    // Update thread of memories data
                    updateThreadOfMemoriesData();
                }
            });
        });

        // Add more memory entries
        if (addMemoryBtn && memoriesContainer) {
            addMemoryBtn.addEventListener('click', () => {
                const newMemoryEntry = document.createElement('div');
                newMemoryEntry.className = 'memory-entry bg-white dark:bg-slate-700 p-3 rounded-lg mb-4 shadow-sm';
                newMemoryEntry.innerHTML = `
                    <div class="flex justify-between items-center mb-2">
                        <h4 class="text-sm font-medium text-purple-600">Memory Entry</h4>
                        <button type="button" class="remove-memory-btn text-red-500 hover:text-red-700">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="grid grid-cols-2 gap-3 mb-2">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                            <input type="text" class="memory-year w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 text-gray-800 shadow-sm" placeholder="e.g., 2023">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                            <input type="text" class="memory-title w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 text-gray-800 shadow-sm" placeholder="e.g., Event Title">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea class="memory-description w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 text-gray-800 shadow-sm" rows="2" placeholder="Write a brief description of this memory..."></textarea>
                    </div>
                `;

                memoriesContainer.appendChild(newMemoryEntry);

                // Add event listener to the remove button
                const removeBtn = newMemoryEntry.querySelector('.remove-memory-btn');
                if (removeBtn) {
                    removeBtn.addEventListener('click', () => {
                        newMemoryEntry.remove();
                        updateThreadOfMemoriesData();
                    });
                }

                // Add event listeners to new inputs
                const inputs = newMemoryEntry.querySelectorAll('input, textarea');
                inputs.forEach(input => {
                    input.addEventListener('input', updateThreadOfMemoriesData);
                });
            });
        }

        // Quick text parser functionality
        const quickTextInput = document.getElementById('quick-text-input');
        const parseQuickTextBtn = document.getElementById('parse-quick-text');
        
        if (quickTextInput && parseQuickTextBtn && memoriesContainer) {
            parseQuickTextBtn.addEventListener('click', () => {
                const quickText = quickTextInput.value.trim();
                if (!quickText) {
                    alert('Please enter some text to parse.');
                    return;
                }
                
                // Parse the text using regex to find year + content patterns
                const pattern = /(\d{4})\s+([^0-9]*?)(?=\d{4}|$)/g;
                const matches = [];
                let match;
                
                while ((match = pattern.exec(quickText)) !== null) {
                    matches.push({
                        year: match[1],
                        content: match[2].trim()
                    });
                }
                
                if (matches.length < 2) {
                    alert('Could not parse at least 2 memories from the text. Please ensure each memory starts with a year (e.g., "2022 Title Description...")');
                    return;
                }
                
                // Clear existing memory entries
                memoriesContainer.innerHTML = '';
                
                // Create memory entries from parsed data
                matches.forEach((memory, index) => {
                    const content = memory.content;
                    let title = '';
                    let description = '';
                    
                    // Try to split content into title and description
                    // Look for sentence boundaries or use word count
                    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
                    if (sentences.length >= 2) {
                        title = sentences[0].trim();
                        description = sentences.slice(1).join('. ').trim();
                    } else {
                        // Use word count to split
                        const words = content.split(' ');
                        if (words.length > 8) {
                            title = words.slice(0, 8).join(' ');
                            description = words.slice(8).join(' ');
                        } else {
                            title = content.length > 50 ? content.substring(0, 50) + '...' : content;
                            description = content;
                        }
                    }
                    
                    // Create memory entry
                    const memoryEntry = document.createElement('div');
                    memoryEntry.className = 'memory-entry bg-white dark:bg-slate-700 p-3 rounded-lg mb-4 shadow-sm';
                    memoryEntry.innerHTML = `
                        <div class="flex justify-between items-center mb-2">
                            <h4 class="text-sm font-medium text-purple-600">Memory ${index + 1}</h4>
                            <button type="button" class="remove-memory-btn text-red-500 hover:text-red-700">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="grid grid-cols-2 gap-3 mb-2">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                                <input type="text" class="memory-year w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 text-gray-800 shadow-sm" value="${memory.year}">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                                <input type="text" class="memory-title w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 text-gray-800 shadow-sm" value="${title}">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                            <textarea class="memory-description w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 text-gray-800 shadow-sm" rows="2">${description}</textarea>
                        </div>
                    `;
                    
                    memoriesContainer.appendChild(memoryEntry);
                    
                    // Add event listeners
                    const removeBtn = memoryEntry.querySelector('.remove-memory-btn');
                    if (removeBtn) {
                        removeBtn.addEventListener('click', () => {
                            memoryEntry.remove();
                            updateThreadOfMemoriesData();
                        });
                    }
                    
                    const inputs = memoryEntry.querySelectorAll('input, textarea');
                    inputs.forEach(input => {
                        input.addEventListener('input', updateThreadOfMemoriesData);
                    });
                });
                
                // Update the hidden field
                updateThreadOfMemoriesData();
                
                // Clear the quick text input
                quickTextInput.value = '';
                
                alert(`Successfully parsed ${matches.length} memories!`);
            });
        }

        // Add event listeners to existing memory inputs
        const memoryEntries = document.querySelectorAll('.memory-entry');
        memoryEntries.forEach(entry => {
            const inputs = entry.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                input.addEventListener('input', updateThreadOfMemoriesData);
            });
        });

        // Function to update the thread_of_memories field based on UI inputs
        function updateThreadOfMemoriesData() {
            if (!threadOfMemoriesInput) return;

            const memoryEntries = document.querySelectorAll('.memory-entry');
            let threadData = [];

            memoryEntries.forEach(entry => {
                const yearInput = entry.querySelector('.memory-year');
                const titleInput = entry.querySelector('.memory-title');
                const descriptionInput = entry.querySelector('.memory-description');

                if (yearInput && titleInput && descriptionInput) {
                    const year = yearInput.value.trim();
                    const title = titleInput.value.trim();
                    const description = descriptionInput.value.trim();

                    // Only add memory if at least title or description is provided
                    if (title || description) {
                        threadData.push({
                            year: year,
                            title: title,
                            description: description
                        });
                    }
                }
            });

            // Store as JSON to prevent injection attacks and parsing issues
            threadOfMemoriesInput.value = JSON.stringify(threadData);
            console.log(`DEBUG JS: Updated thread of memories with ${threadData.length} entries:`, threadData);
            console.log(`DEBUG JS: Hidden field value:`, threadOfMemoriesInput.value);
        }

        // Initial update of thread of memories data
        updateThreadOfMemoriesData();
        
        // Initialize existing thread of memories data when editing
        initializeExistingMemories();
    }
    
    // Function to initialize existing thread of memories data when editing
    function initializeExistingMemories() {
        const threadOfMemoriesInput = document.getElementById('id_thread_of_memories');
        const memoriesContainer = document.getElementById('memories-container');
        
        if (!threadOfMemoriesInput || !memoriesContainer) return;
        
        const existingData = threadOfMemoriesInput.value;
        if (!existingData || !existingData.trim()) return;
        
        let memoriesData = [];
        
        try {
            // Try to parse as JSON (new format)
            memoriesData = JSON.parse(existingData);
        } catch (e) {
            // Fallback to legacy text format parsing
            const lines = existingData.split('\n').filter(line => line.trim());
            if (lines.length < 2) return;
            
            // Parse legacy format: alternating header/description lines
            for (let i = 0; i < lines.length; i += 2) {
                if (i + 1 < lines.length) {
                    const headerLine = lines[i];
                    const description = lines[i + 1];
                    
                    // Extract year and title from header line
                    let year = '';
                    let title = headerLine;
                    
                    if (headerLine.includes(':')) {
                        const parts = headerLine.split(':', 2);
                        const firstPart = parts[0].trim();
                        if (firstPart.match(/^\d{4}$/)) { // If first part is a 4-digit year
                            year = firstPart;
                            title = parts[1].trim();
                        }
                    }
                    
                    memoriesData.push({
                        year: year,
                        title: title,
                        description: description
                    });
                }
            }
        }
        
        if (!Array.isArray(memoriesData) || memoriesData.length === 0) return;
        
        // Clear default memory entries
        memoriesContainer.innerHTML = '';
        
        // Create memory entries from parsed data
        memoriesData.forEach(memory => {
            const newMemoryEntry = document.createElement('div');
            newMemoryEntry.className = 'memory-entry bg-white dark:bg-slate-700 p-3 rounded-lg mb-4 shadow-sm';
            newMemoryEntry.innerHTML = `
                <div class="grid grid-cols-2 gap-3 mb-2">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                        <input type="text" class="memory-year w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 text-gray-800 shadow-sm" placeholder="e.g., 2020" value="${memory.year || ''}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                        <input type="text" class="memory-title w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 text-gray-800 shadow-sm" placeholder="e.g., Event Title" value="${memory.title || ''}">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea class="memory-description w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 text-gray-800 shadow-sm" rows="2" placeholder="Write a brief description of this memory...">${memory.description || ''}</textarea>
                </div>
                <button type="button" class="remove-memory-btn mt-2 text-red-600 hover:text-red-800 text-sm">Remove</button>
            `;
            
            memoriesContainer.appendChild(newMemoryEntry);
            
            // Add event listeners
            const removeBtn = newMemoryEntry.querySelector('.remove-memory-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    newMemoryEntry.remove();
                    updateThreadOfMemoriesData();
                });
            }
            
            const inputs = newMemoryEntry.querySelectorAll('input, textarea');
            inputs.forEach(input => {
                input.addEventListener('input', updateThreadOfMemoriesData);
            });
        });
        
        // If no entries were created, add default ones
        if (memoriesContainer.children.length === 0) {
            // Add default memory entries (same as in template)
            for (let i = 0; i < 2; i++) {
                const placeholders = [
                    { year: '2020', title: 'Our First Date', description: 'Write a brief description of this memory...' },
                    { year: '2022', title: 'Our Wedding', description: 'Write a brief description of this memory...' }
                ];
                const placeholder = placeholders[i];
                
                const newMemoryEntry = document.createElement('div');
                newMemoryEntry.className = 'memory-entry bg-white dark:bg-slate-700 p-3 rounded-lg mb-4 shadow-sm';
                newMemoryEntry.innerHTML = `
                    <div class="grid grid-cols-2 gap-3 mb-2">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                            <input type="text" class="memory-year w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 text-gray-800 shadow-sm" placeholder="e.g., ${placeholder.year}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                            <input type="text" class="memory-title w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 text-gray-800 shadow-sm" placeholder="e.g., ${placeholder.title}">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea class="memory-description w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-200 text-gray-800 shadow-sm" rows="2" placeholder="${placeholder.description}"></textarea>
                    </div>
                `;
                
                memoriesContainer.appendChild(newMemoryEntry);
                
                const inputs = newMemoryEntry.querySelectorAll('input, textarea');
                inputs.forEach(input => {
                    input.addEventListener('input', updateThreadOfMemoriesData);
                });
            }
        }
    }
    // Handle form submission
    if (form) {
        form.addEventListener('submit', event => {
            // Check if thread of memories is selected but has insufficient content
            const threadRadio = document.getElementById('id_memory_display_type_thread');
            if (threadRadio && threadRadio.checked) {
                const threadOfMemoriesInput = document.getElementById('id_thread_of_memories');
                if (threadOfMemoriesInput) {
                    console.log(`DEBUG JS SUBMIT: Thread of memories value:`, threadOfMemoriesInput.value);
                    
                    try {
                        const memoriesData = JSON.parse(threadOfMemoriesInput.value || '[]');
                        console.log(`DEBUG JS SUBMIT: Parsed ${memoriesData.length} memories:`, memoriesData);
                        
                        // Check if we have at least 2 complete memory items
                        const validMemories = memoriesData.filter(memory => 
                            (memory.title && memory.title.trim()) || 
                            (memory.description && memory.description.trim())
                        );
                        
                        console.log(`DEBUG JS SUBMIT: Found ${validMemories.length} valid memories:`, validMemories);
                        
                        if (validMemories.length < 2) {
                            event.preventDefault();
                            alert(`Thread of Memories requires at least 2 memory items. Found ${validMemories.length} valid memories. Please add some memories with titles or descriptions.`);

                        }
                    } catch (e) {
                        // Fallback to legacy text validation - more flexible parsing
                        const textContent = threadOfMemoriesInput.value.trim();
                        if (!textContent) {
                            event.preventDefault();
                            alert('Thread of Memories requires at least 2 memory items. Please add some memories.');
                            return;
                        }
                        
                        // For legacy text format, look for year patterns (4 digits followed by text)
                        // Updated regex to be more flexible - allows space or no space after year
                        const yearPattern = /^\s*\d{4}\s*.+/gm;
                        let memoryEntries = textContent.match(yearPattern) || [];
                        
                        // If standard year pattern doesn't work, try alternative patterns
                        if (memoryEntries.length < 2) {
                            // Look for lines that start with 4 digits (more flexible)
                            const flexibleYearPattern = /^\d{4}.*\S/gm;
                            memoryEntries = textContent.match(flexibleYearPattern) || [];
                        }
                        
                        // If still no year patterns, try looking for substantial content blocks
                        if (memoryEntries.length < 2) {
                            // Split by double newlines or single newlines for memory blocks
                            let contentBlocks = textContent.split(/\n\s*\n/).filter(block => block.trim().length > 20);
                            
                            // If double newline split doesn't work well, try single newline blocks
                            if (contentBlocks.length < 2) {
                                const lines = textContent.split('\n').filter(line => line.trim().length > 0);
                                // Group lines that seem to belong to the same memory
                                contentBlocks = [];
                                let currentBlock = '';
                                
                                for (let i = 0; i < lines.length; i++) {
                                    const line = lines[i].trim();
                                    if (/^\d{4}/.test(line)) {
                                        // New year block starts
                                        if (currentBlock.trim()) {
                                            contentBlocks.push(currentBlock.trim());
                                        }
                                        currentBlock = line;
                                    } else if (line) {
                                        currentBlock += '\n' + line;
                                    }
                                }
                                
                                // Add the last block
                                if (currentBlock.trim()) {
                                    contentBlocks.push(currentBlock.trim());
                                }
                            }
                            
                            if (contentBlocks.length < 2) {
                                event.preventDefault();
                                alert('Thread of Memories requires at least 2 memory items. Please add more memories with descriptions.');
                                return;
                            }
                        }
                        
                        // Additional validation: ensure we have meaningful content
                        const totalContentLength = textContent.replace(/\s/g, '').length;
                        if (totalContentLength < 50) {
                            event.preventDefault();
                            alert('Thread of Memories requires more detailed content. Please add more memories with descriptions.');

                        }
                    }
                }
            }
        });
    }



    function createPreview(file) {
        const previewUrl = URL.createObjectURL(file);
        previewUrls.push(previewUrl);
        const element = document.createElement(
            file.type.startsWith('image/') ? 'img' :
            file.type.startsWith('audio/') ? 'audio' : null
        );

        if (!element) return;

        element.src = previewUrl;
        if (file.type.startsWith('image/')) {
            element.className = 'max-w-xs mt-2 rounded-lg shadow-md';
        } else if (file.type.startsWith('audio/')) {
            element.controls = true;
            element.className = 'mt-2';
        }

        previewContainer.appendChild(element);
    }

    if (imageInput && audioInput && previewContainer) {
        imageInput.addEventListener('change', (event) => {
            clearPreviews();
            Array.from(event.target.files).slice(0, 3).forEach(createPreview);
        });
        audioInput.addEventListener('change', (event) => {
            Array.from(event.target.files).slice(0, 1).forEach(createPreview);
        });
    }

    if (removeCheckbox && previewContainer) {
        removeCheckbox.addEventListener('change', () => {
            previewContainer.style.display = removeCheckbox.checked ? 'none' : '';
            if (removeCheckbox.checked) clearPreviews();
        });
    }

    if (eventTypeSelect && recurringField && customLabelField) {
        const toggleFields = () => {
            const isRecurringEvent = ['birthday', 'anniversary'].includes(eventTypeSelect.value);

            recurringField.style.display = isRecurringEvent ? 'block' : 'none';

            const recurringCheckbox = recurringField.querySelector('input[type="checkbox"]');
            if (recurringCheckbox) {
                if (!isRecurringEvent) {
                    recurringCheckbox.checked = false;
                    recurringCheckbox.disabled = true;
                } else {
                    recurringCheckbox.disabled = false;
                }
            }
        };

        toggleFields();
        eventTypeSelect.addEventListener('change', toggleFields);
    }

    if (recipientEmailInput) {
        form.addEventListener('submit', (event) => {
            if (recipientEmailInput.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmailInput.value)) {
                event.preventDefault();
                alert('Please enter a valid email address for the recipient.');
                recipientEmailInput.focus();
            }
        });
    }

    const downloadLinks = document.querySelectorAll('a[data-download="media"]');
    downloadLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const url = link.href;
            const jwt = getCookie('jwt');
            if (!jwt) {
                alert('Authentication required.');
                return;
            }
            fetch(url, {
                headers: { 'Authorization': `Bearer ${jwt}` }
            })
                .then(res => {
                    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
                    return res.blob();
                })
                .then(blob => {
                    const downloadUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = url.split('/').pop();
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(downloadUrl);
                })
                .catch(err => {
                    console.error('Download failed:', err);
                    alert('Failed to download media.');
                });
        });
    });


});