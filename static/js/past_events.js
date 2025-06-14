/* static/js/past_events.js */
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('event-modal');
    const modalContent = document.getElementById('modal-content');
    const openModalButtons = document.querySelectorAll('.open-modal');
    const closeModalButton = document.querySelector('.close-modal');

    // Get CSRF token from cookie
    function getCsrfToken() {
        return document.cookie.split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1] || '';
    }

    // Fetch event details and populate modal
    function loadEventDetails(eventId) {
        fetch(`/past-events/add-reflection/${eventId}/`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        })
        .then(response => response.json())
        .then(data => {
            modalContent.innerHTML = `
                <h4 class="text-lg font-semibold mb-2">${data.event.name} (${data.event.event_type_display})</h4>
                <p class="mb-2"><strong>Date:</strong> ${data.event.date}</p>
                ${data.event.message ? `<p class="mb-2"><strong>Message:</strong> <em>${data.event.message}</em></p>` : ''}
                ${data.event.media.length ? `
                    <div class="mb-4">
                        <h5 class="font-medium mb-2">Media:</h5>
                        <div class="flex flex-col gap-2">
                            ${data.event.media.map(media => `
                                ${media.media_type === 'image' ? `
                                    <img src="${media.media_file}" alt="Event Media" class="w-full h-32 object-cover rounded-lg">
                                ` : media.media_type === 'audio' ? `
                                    <audio controls class="w-full">
                                        <source src="${media.media_file}">
                                        Your browser does not support the audio element.
                                    </audio>
                                ` : ''}
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                <div class="mb-4">
                    <h5 class="font-medium mb-2">Reflection:</h5>
                    <form id="reflection-form" action="/past-events/add-reflection/${eventId}/" method="POST">
                        <input type="hidden" name="csrfmiddlewaretoken" value="${getCsrfToken()}">
                        <textarea name="note" class="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500" rows="4" placeholder="Add your thoughts...">${data.event.reflection ? data.event.reflection.note : ''}</textarea>
                        <button type="submit" class="mt-2 px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-medium transition">Save Reflection</button>
                    </form>
                </div>
            `;
            modal.classList.remove('hidden');
        })
        .catch(error => {
            console.error('Error loading event details:', error);
            modalContent.innerHTML = `<p class="text-red-500">Failed to load event details. Please try again.</p>`;
            modal.classList.remove('hidden');
        });
    }

    // Open modal
    openModalButtons.forEach(button => {
        button.addEventListener('click', () => {
            const eventId = button.dataset.eventId;
            loadEventDetails(eventId);
        });
    });

    // Close modal
    closeModalButton.addEventListener('click', () => {
        modal.classList.add('hidden');
        modalContent.innerHTML = '';
    });

    // Close modal on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            modalContent.innerHTML = '';
        }
    });

    // Handle form submission
    modalContent.addEventListener('submit', (e) => {
        if (e.target.id === 'reflection-form') {
            e.preventDefault();
            const form = e.target;
            const formData = new FormData(form);

            fetch(form.action, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCsrfToken(),
                },
                body: formData,
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    modalContent.innerHTML = `<p class="text-green-500">Reflection saved successfully!</p>`;
                    setTimeout(() => {
                        modal.classList.add('hidden');
                        modalContent.innerHTML = '';
                        window.location.reload(); // Refresh to show updated reflection
                    }, 1500);
                } else {
                    modalContent.innerHTML += `<p class="text-red-500">${data.error || 'Failed to save reflection.'}</p>`;
                }
            })
            .catch(error => {
                console.error('Error saving reflection:', error);
                modalContent.innerHTML += `<p class="text-red-500">Failed to save reflection. Please try again.</p>`;
            });
        }
    });
});