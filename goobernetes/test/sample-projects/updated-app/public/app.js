// Basic App v2.0 client-side JavaScript
console.log('Basic App v2.0 loaded');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready - Basic App v2.0 initialized');

    // Fetch health check on load
    fetch('/health')
        .then(response => response.json())
        .then(data => {
            console.log('Health check:', data);
        })
        .catch(error => {
            console.log('Health check unavailable (static serving only)');
        });

    // New feature button handler
    const newFeatureBtn = document.getElementById('test-new-feature');
    const resultDiv = document.getElementById('feature-result');

    if (newFeatureBtn) {
        newFeatureBtn.addEventListener('click', () => {
            fetch('/new-feature')
                .then(response => response.json())
                .then(data => {
                    resultDiv.style.display = 'block';
                    resultDiv.textContent = JSON.stringify(data, null, 2);
                })
                .catch(error => {
                    resultDiv.style.display = 'block';
                    resultDiv.textContent = 'Feature endpoint unavailable (static serving only)';
                });
        });
    }
});
