// Venues Page JavaScript
let allVenues = [];
let currentPage = 1;
let totalPages = 1;
let isLoading = false;
const VENUES_PER_PAGE = 12;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize auth
    await api.init();

    // Setup search functionality
    const searchInput = document.getElementById('venueSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterVenues, 300));
    }
});

// Load venues from database
const loadVenues = async () => {
    if (isLoading) return;

    isLoading = true;
    currentPage = 1;
    allVenues = [];

    const loadBtn = document.getElementById('loadVenuesBtn');
    const originalContent = loadBtn.innerHTML;
    loadBtn.disabled = true;
    loadBtn.innerHTML = `
        <span class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></span>
        Loading...
    `;

    try {
        const response = await api.getScrapedVenues({ page: 1, limit: 100 });

        if (response.success && response.data) {
            allVenues = response.data;
            totalPages = response.pagination?.totalPages || 1;

            // Update stats
            updateStats();

            // Render venues
            renderVenues(allVenues.slice(0, VENUES_PER_PAGE));

            // Show load more if needed
            if (allVenues.length > VENUES_PER_PAGE) {
                document.getElementById('loadMoreContainer').style.display = 'flex';
            }

            showToast(`Loaded ${allVenues.length} venues successfully!`, 'success');
        } else {
            showEmptyState();
        }
    } catch (error) {
        console.error('Error loading venues:', error);
        showToast('Failed to load venues. Please try again.', 'error');
        showEmptyState();
    } finally {
        isLoading = false;
        loadBtn.disabled = false;
        loadBtn.innerHTML = originalContent;
    }
};

// Load more venues
const loadMoreVenues = () => {
    currentPage++;
    const start = (currentPage - 1) * VENUES_PER_PAGE;
    const end = start + VENUES_PER_PAGE;
    const moreVenues = allVenues.slice(start, end);

    if (moreVenues.length > 0) {
        appendVenues(moreVenues);
    }

    // Hide load more if no more venues
    if (end >= allVenues.length) {
        document.getElementById('loadMoreContainer').style.display = 'none';
    }
};

// Update stats display
const updateStats = () => {
    const totalVenuesEl = document.getElementById('totalVenues');
    const withWebsiteEl = document.getElementById('withWebsite');
    const lastScrapedEl = document.getElementById('lastScraped');

    // Total venues
    totalVenuesEl.textContent = allVenues.length;

    // Venues with website
    const withWebsite = allVenues.filter(v => v.website).length;
    withWebsiteEl.textContent = withWebsite;

    // Last scraped date
    if (allVenues.length > 0) {
        const latestDate = new Date(Math.max(...allVenues.map(v => new Date(v.scraped_at))));
        lastScrapedEl.textContent = formatRelativeTime(latestDate);
    } else {
        lastScrapedEl.textContent = '--';
    }
};

// Format relative time
const formatRelativeTime = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Render venues to grid
const renderVenues = (venues) => {
    const grid = document.getElementById('venuesGrid');

    if (venues.length === 0) {
        showEmptyState();
        return;
    }

    grid.innerHTML = venues.map(venue => createVenueCard(venue)).join('');
};

// Append more venues to grid
const appendVenues = (venues) => {
    const grid = document.getElementById('venuesGrid');
    const newCards = venues.map(venue => createVenueCard(venue)).join('');
    grid.insertAdjacentHTML('beforeend', newCards);
};

// Create venue card HTML
const createVenueCard = (venue) => {
    const scrapedDate = new Date(venue.scraped_at);
    const formattedDate = scrapedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const websiteLink = venue.website
        ? `<a href="${venue.website}" target="_blank" rel="noopener">${truncateUrl(venue.website)}</a>`
        : '<span style="color: var(--text-muted);">No website</span>';

    const phoneText = venue.phone || '<span style="color: var(--text-muted);">No phone</span>';

    return `
        <div class="venue-card">
            <div class="venue-header">
                <div class="venue-icon">
                    <span class="material-symbols-outlined">location_on</span>
                </div>
                <div>
                    <div class="venue-title">${escapeHtml(venue.title || 'Unknown Venue')}</div>
                </div>
            </div>
            
            <div class="venue-info">
                <div class="venue-info-item">
                    <span class="material-symbols-outlined">pin_drop</span>
                    <span>${escapeHtml(venue.address || 'No address')}</span>
                </div>
                <div class="venue-info-item">
                    <span class="material-symbols-outlined">call</span>
                    <span>${phoneText}</span>
                </div>
                <div class="venue-info-item">
                    <span class="material-symbols-outlined">language</span>
                    ${websiteLink}
                </div>
            </div>
            
            <div class="venue-footer">
                <span class="venue-scraped-at">Scraped: ${formattedDate}</span>
                <div class="venue-actions">
                    ${venue.phone ? `
                        <a href="tel:${venue.phone}" class="venue-action-btn" title="Call">
                            <span class="material-symbols-outlined">call</span>
                        </a>
                    ` : ''}
                    ${venue.website ? `
                        <a href="${venue.website}" target="_blank" rel="noopener" class="venue-action-btn" title="Visit Website">
                            <span class="material-symbols-outlined">open_in_new</span>
                        </a>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
};

// Filter venues based on search
const filterVenues = () => {
    const searchTerm = document.getElementById('venueSearch').value.toLowerCase().trim();

    if (!searchTerm) {
        renderVenues(allVenues.slice(0, currentPage * VENUES_PER_PAGE));
        if (allVenues.length > currentPage * VENUES_PER_PAGE) {
            document.getElementById('loadMoreContainer').style.display = 'flex';
        }
        return;
    }

    const filtered = allVenues.filter(venue =>
        (venue.title && venue.title.toLowerCase().includes(searchTerm)) ||
        (venue.address && venue.address.toLowerCase().includes(searchTerm))
    );

    renderVenues(filtered);
    document.getElementById('loadMoreContainer').style.display = 'none';
};

// Show empty state
const showEmptyState = () => {
    const grid = document.getElementById('venuesGrid');
    grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
            <span class="material-symbols-outlined">apartment</span>
            <h3>No venues found</h3>
            <p>Try triggering a scraping job from the Automation page to populate the database.</p>
            <a href="/automation.html" class="btn btn-primary">
                <span class="material-symbols-outlined">smart_toy</span>
                Go to Automation
            </a>
        </div>
    `;
    document.getElementById('loadMoreContainer').style.display = 'none';
};

// Helper: Truncate URL for display
const truncateUrl = (url) => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
    } catch {
        return url.substring(0, 30) + (url.length > 30 ? '...' : '');
    }
};

// Helper: Escape HTML to prevent XSS
const escapeHtml = (text) => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

// Make functions globally available
window.loadVenues = loadVenues;
window.loadMoreVenues = loadMoreVenues;
