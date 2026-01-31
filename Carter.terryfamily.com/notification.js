// Notification utility
// Creates toast-style pop-ups that slide in from the top-right just like a macOS/iOS text banner.

(function () {
    // Create the shared container once the DOM is ready
    function setupContainer() {
        if (document.getElementById('notification-container')) return;
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupContainer);
    } else {
        setupContainer();
    }

    /**
     * Display a notification.
     * @param {string} title - Title text (bold line at top)
     * @param {string} body - Body text below the title.
     * @param {number} [duration=4000] - How long the notification stays visible (ms).
     */
    window.showNotification = function (title, body, duration = 4000) {
        setupContainer();
        const container = document.getElementById('notification-container');
        const note = document.createElement('div');
        note.className = 'notification';
        note.style.setProperty('--duration', `${duration - 700}ms`); // subtract slide-out delay

        const titleEl = document.createElement('div');
        titleEl.className = 'notification-title';
        titleEl.textContent = title;
        note.appendChild(titleEl);

        if (body) {
            const bodyEl = document.createElement('div');
            bodyEl.className = 'notification-body';
            bodyEl.textContent = body;
            note.appendChild(bodyEl);
        }

        container.appendChild(note);

        // Remove element after it fully slides out
        setTimeout(() => {
            note.remove();
            // Remove container when empty to keep DOM clean
            if (!container.hasChildNodes()) {
                container.remove();
            }
        }, duration + 700); // account for slide-out animation length
    };
})(); 