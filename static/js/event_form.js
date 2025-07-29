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
                            <input type="text" class="memory-year w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-800 shadow-sm" placeholder="e.g., 2023">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                            <input type="text" class="memory-title w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-800 shadow-sm" placeholder="e.g., Event Title">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea class="memory-description w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-800 shadow-sm" rows="2" placeholder="Write a brief description of this memory..."></textarea>
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

                    if (year || title || description) {
                        // Format as expected by the backend parser: "YEAR: Title\nDescription"
                        const headerLine = year ? `${year}: ${title}` : title;
                        threadData.push(headerLine);
                        threadData.push(description);
                    }
                }
            });

            threadOfMemoriesInput.value = threadData.join('\n');
        }

        // Initial update of thread of memories data
        updateThreadOfMemoriesData();
    }
    // Handle form submission

    if (form) {
        form.addEventListener('submit', event => {
            // Check if thread of memories is selected but has less than 2 valid memories
            const threadRadio = document.getElementById('id_memory_display_type_thread');
            if (threadRadio && threadRadio.checked) {
                const threadOfMemoriesInput = document.getElementById('id_thread_of_memories');
                if (threadOfMemoriesInput) {
                    const lines = threadOfMemoriesInput.value.split('\n').filter(line => line.trim());
                    // Check if we have at least 2 memory entries (each with 2 lines)
                    if (lines.length < 4) {
                        event.preventDefault();
                        alert('Thread of Memories requires at least 2 complete memory entries (with year/title and description).');
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
            const isOther = eventTypeSelect.value === 'other';
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