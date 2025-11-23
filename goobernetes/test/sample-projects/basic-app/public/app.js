// Basic App client-side JavaScript
console.log('Basic App v1.0 loaded');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready - Basic App initialized');

    // Fetch health check on load
    fetch('/health')
        .then(response => response.json())
        .then(data => {
            console.log('Health check:', data);
        })
        .catch(error => {
            console.log('Health check unavailable (static serving only)');
        });
});
