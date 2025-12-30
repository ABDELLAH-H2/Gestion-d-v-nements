// Automation Page JavaScript
let scrapingLogs = [];

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for auth initialization to complete
    await api.init();

    // Check authentication
    if (!isAuthenticated()) {
        showToast('Please login to access automation', 'warning');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1500);
        return;
    }

    updateSidebarUser();
    loadScrapingLogs();
    checkUrlParams();
});

// Update sidebar user info
const updateSidebarUser = () => {
    const user = getUser();
    const sidebarUser = document.getElementById('sidebarUser');

    // Check if element exists before manipulating
    if (!sidebarUser) {
        return; // Element doesn't exist in this page layout
    }

    if (user) {
        sidebarUser.innerHTML = `
            <div style="width: 32px; height: 32px; border-radius: 50%; background-size: cover; background-position: center; border: 2px solid rgba(255,255,255,0.1);"
                 style="background-image: url('${user.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.username) + '&background=6366F1&color=fff'}')">
            </div>
            <div style="display: flex; flex-direction: column;">
                <span style="font-size: 0.875rem; color: white; font-weight: 500;">${user.username}</span>
                <span style="font-size: 0.75rem; color: var(--text-grey);">${user.email}</span>
            </div>
        `;
    }
};

// Check URL params for event context
const checkUrlParams = () => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('eventId');

    if (eventId) {
        // Auto-fill with event venue keyword
        document.getElementById('scrapingKeyword').value = 'event venues';
        showToast('Configure scraping for event venue discovery', 'info');
    }
};

// Trigger scraping workflow
const triggerScraping = async () => {
    const city = document.getElementById('scrapingCity').value.trim();
    const keyword = document.getElementById('scrapingKeyword').value.trim();
    const triggerBtn = document.getElementById('triggerScrapingBtn');

    if (!city || !keyword) {
        showToast('Please enter both city and keyword', 'warning');
        return;
    }

    // Disable button
    triggerBtn.disabled = true;
    triggerBtn.innerHTML = `
        <span class="flex items-center gap-2">
            <span class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></span>
            Processing...
        </span>
    `;

    try {
        const response = await api.triggerScraping({ city, keyword });

        if (response.success) {
            showToast('Scraping workflow triggered successfully!', 'success');

            // Update last run info
            document.getElementById('lastRunInfo').innerHTML = `
                <span class="material-symbols-outlined" style="font-size: 18px;">schedule</span>
                <span>Last Run: Just now — <strong>${response.message || 'Processing'}</strong></span>
            `;

            // Add to logs
            addLogEntry({
                status: 'success',
                jobId: `#job_${Date.now().toString(36)}`,
                trigger: 'Manual Trigger',
                city: city,
                keyword: keyword,
                time: 'Just now'
            });

            // Open Google Sheet if URL provided
            if (response.sheetUrl) {
                showToast('Scraping complete! Click the button below to view results.', 'success');

                // Change button to "View Results"
                triggerBtn.disabled = false;
                triggerBtn.className = 'btn btn-success'; // Ensure you have a success class or use inline style
                triggerBtn.style.backgroundColor = '#10B981'; // Green color
                triggerBtn.innerHTML = `
                    <span class="flex items-center gap-2">
                        <span class="material-symbols-outlined">table_view</span>
                        View Scraped Results
                    </span>
                `;
                triggerBtn.onclick = () => window.open(response.sheetUrl, '_blank');

                // Reset button after 10 seconds
                setTimeout(() => {
                    triggerBtn.className = 'btn btn-primary';
                    triggerBtn.style.backgroundColor = '';
                    triggerBtn.innerHTML = `
                        <span class="flex items-center gap-2">
                            <span class="material-symbols-outlined">bolt</span>
                            Trigger n8n Google Maps Scraper
                        </span>
                    `;
                    triggerBtn.onclick = triggerScraping;
                }, 10000);

                return; // Stop here so we don't reset the button immediately in 'finally'
            }
        }
    } catch (error) {
        showToast(error.message || 'Failed to trigger scraping', 'error');

        // Add failed log entry
        addLogEntry({
            status: 'error',
            jobId: `#job_${Date.now().toString(36)}`,
            trigger: 'Manual Trigger',
            city: city,
            keyword: keyword,
            time: 'Just now'
        });
    } finally {
        // Only reset if we didn't just show the success button
        if (!triggerBtn.innerHTML.includes('View Scraped Results')) {
            triggerBtn.disabled = false;
            triggerBtn.innerHTML = `
                <span class="flex items-center gap-2">
                    <span class="material-symbols-outlined">bolt</span>
                    Trigger n8n Google Maps Scraper
                </span>
            `;
        }
    }
};

// Add log entry to table
const addLogEntry = (log) => {
    scrapingLogs.unshift(log);
    renderLogs();
};

// Render logs table
const renderLogs = () => {
    const tbody = document.getElementById('logsTableBody');

    if (scrapingLogs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-grey);">
                    No scraping jobs yet. Trigger your first scraping above.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = scrapingLogs.map(log => `
        <tr style="transition: background 0.2s;">
            <td>
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined" style="font-size: 18px; color: ${log.status === 'success' ? '#4ADE80' : log.status === 'warning' ? '#FBBF24' : '#F87171'};">
                        ${log.status === 'success' ? 'check_circle' : log.status === 'warning' ? 'warning' : 'error'}
                    </span>
                    <span style="font-weight: 500; text-transform: capitalize;">${log.status}</span>
                </div>
            </td>
            <td style="font-family: monospace; font-size: 0.75rem; color: var(--text-grey);">${log.jobId}</td>
            <td>${log.trigger}</td>
            <td>${log.city}</td>
            <td>${log.keyword}</td>
            <td style="text-align: right; color: var(--text-grey);">${log.time}</td>
        </tr>
    `).join('');
};

// Load scraping logs (from localStorage for demo)
const loadScrapingLogs = () => {
    const savedLogs = localStorage.getItem('scrapingLogs');
    if (savedLogs) {
        scrapingLogs = JSON.parse(savedLogs);
        renderLogs();
    }
};

// Save logs to localStorage
const saveLogs = () => {
    localStorage.setItem('scrapingLogs', JSON.stringify(scrapingLogs.slice(0, 20)));
};

// Update addLogEntry to save
const originalAddLogEntry = addLogEntry;
window.addLogEntry = (log) => {
    originalAddLogEntry(log);
    saveLogs();
};
