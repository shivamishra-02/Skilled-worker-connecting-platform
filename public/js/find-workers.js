document.addEventListener('DOMContentLoaded', function() {
    const searchBtn = document.getElementById('searchBtn');
    const workerResults = document.getElementById('workerResults');

    // Load workers on page load
    fetchWorkers();

    // Search button click handler
    searchBtn.addEventListener('click', fetchWorkers);

    async function fetchWorkers() {
        const profession = document.getElementById('profession').value;
        const location = document.getElementById('location').value;

        try {
            // Build query parameters
            const params = new URLSearchParams();
            if (profession) params.append('profession', profession);
            if (location) params.append('location', location);

            const response = await fetch(`/api/workers?${params.toString()}`);
            const workers = await response.json();

            displayWorkers(workers);
        } catch (error) {
            console.error('Error fetching workers:', error);
            workerResults.innerHTML = `
                <div class="no-workers">
                    <p>Error loading workers. Please try again.</p>
                </div>
            `;
        }
    }

    function displayWorkers(workers) {
        if (workers.length === 0) {
            workerResults.innerHTML = `
                <div class="no-workers">
                    <p>No workers found matching your criteria.</p>
                </div>
            `;
            return;
        }

        workerResults.innerHTML = workers.map(worker => `
            <div class="worker-card">
                <h3>${worker.name}</h3>
                <p><strong>Profession:</strong> ${worker.profession}</p>
                <p><strong>Location:</strong> ${worker.location}</p>
                <p><strong>Rate:</strong> ₹${worker.hourlyRate}/hour</p>
                <p class="rating">★ ${worker.rating || 'No ratings yet'}</p>
                <a href="/hire?workerId=${worker._id}" class="hire-btn">Hire Now</a>
            </div>
        `).join('');
    }
});