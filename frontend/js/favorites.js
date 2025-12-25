// Favorites Page JavaScript
let currentPage = 1;
let totalPages = 1;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!isAuthenticated()) {
        showToast('Please login to view your favorites', 'warning');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1500);
        return;
    }

    updateNavigation();
    loadFavorites();
});

// Load favorites from API
const loadFavorites = async (append = false) => {
    const favoritesGrid = document.getElementById('favoritesGrid');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const loadMoreContainer = document.getElementById('loadMoreContainer');

    if (!append) {
        favoritesGrid.innerHTML = '';
        loadingState.classList.remove('hidden');
    }
    emptyState.classList.add('hidden');

    try {
        const response = await api.getFavorites({ page: currentPage, limit: 9 });

        loadingState.classList.add('hidden');

        if (response.success) {
            const { data, pagination } = response;
            totalPages = pagination.totalPages;

            // Update count
            document.getElementById('favoriteCount').innerHTML =
                `You have <span style="color: white; font-weight: 700;">${pagination.total}</span> saved events.`;

            if (data.length === 0 && !append) {
                emptyState.classList.remove('hidden');
                loadMoreContainer.classList.add('hidden');
            } else {
                renderFavorites(data, append);

                if (currentPage >= totalPages) {
                    loadMoreContainer.classList.add('hidden');
                } else {
                    loadMoreContainer.classList.remove('hidden');
                }
            }
        }
    } catch (error) {
        loadingState.classList.add('hidden');
        showToast(error.message || 'Failed to load favorites', 'error');
    }
};

// Render favorites to grid
const renderFavorites = (favorites, append = false) => {
    const favoritesGrid = document.getElementById('favoritesGrid');

    const favoritesHTML = favorites.map(event => createFavoriteCard(event)).join('');

    if (append) {
        favoritesGrid.insertAdjacentHTML('beforeend', favoritesHTML);
    } else {
        favoritesGrid.innerHTML = favoritesHTML;
    }
};

// Create favorite card HTML
const createFavoriteCard = (event) => {
    const dateDisplay = formatDateRange(event.date, event.end_date);
    const typeColors = {
        'conference': 'var(--primary)',
        'concert': '#EC4899',
        'workshop': 'var(--secondary)',
        'meetup': '#8B5CF6'
    };
    const typeColor = typeColors[event.type] || 'var(--primary)';

    // Placeholder images
    const placeholderImages = [
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600',
        'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600',
        'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600',
        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600',
        'https://images.unsplash.com/photo-1559223607-a43c990c692c?w=600'
    ];
    const imageUrl = event.image || placeholderImages[event.id % placeholderImages.length];

    return `
        <article class="card event-card" data-id="${event.id}">
            <div class="event-card-image" style="height: 220px;">
                <img src="${imageUrl}" alt="${event.name}" style="width: 100%; height: 100%; object-fit: cover;">
                <div style="position: absolute; inset: 0; background: linear-gradient(to top, var(--surface-dark), transparent 60%);"></div>
                <div style="position: absolute; bottom: 16px; left: 16px;">
                    <span class="badge badge-type" style="background: ${typeColor};">${event.type}</span>
                </div>
            </div>
            <div class="event-card-content">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="event-title" style="font-size: 1.25rem;">${event.name}</h3>
                        <div class="flex items-center gap-4 mt-2">
                            <div class="event-date" style="color: var(--primary);">
                                <span class="material-symbols-outlined">calendar_month</span>
                                <span>${dateDisplay}</span>
                            </div>
                            <div class="event-location" style="color: var(--primary);">
                                <span class="material-symbols-outlined">location_on</span>
                                <span>${event.location}</span>
                            </div>
                        </div>
                    </div>
                </div>
                ${event.description ? `
                    <p style="color: var(--text-grey); font-size: 0.875rem; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${event.description}
                    </p>
                ` : ''}
                <div class="event-divider mt-4"></div>
                <div class="event-card-footer mt-4">
                    <button class="btn btn-ghost" onclick="triggerAutoScrape(${event.id})" style="color: var(--secondary);">
                        <span class="material-symbols-outlined">bolt</span>
                        Auto-Scrape
                    </button>
                    <div class="flex items-center gap-3">
                        <button class="btn btn-icon btn-ghost favorite-btn active" 
                                onclick="removeFavorite(${event.id}, this)"
                                title="Remove from favorites"
                                style="background: var(--surface-light); color: var(--primary);">
                            <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">favorite</span>
                        </button>
                        <a href="/event-detail.html?id=${event.id}" class="btn btn-primary" style="background: white; color: black;">
                            View
                        </a>
                    </div>
                </div>
            </div>
        </article>
    `;
};

// Load more favorites
const loadMoreFavorites = () => {
    currentPage++;
    loadFavorites(true);
};

// Remove from favorites
const removeFavorite = async (eventId, button) => {
    try {
        await api.removeFavorite(eventId);

        // Animate removal
        const card = button.closest('.event-card');
        card.style.transition = 'all 0.3s ease';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9)';

        setTimeout(() => {
            card.remove();

            // Check if grid is empty
            const favoritesGrid = document.getElementById('favoritesGrid');
            if (favoritesGrid.children.length === 0) {
                document.getElementById('emptyState').classList.remove('hidden');
                document.getElementById('loadMoreContainer').classList.add('hidden');
            }

            // Update count
            const countEl = document.getElementById('favoriteCount');
            const currentCount = parseInt(countEl.textContent.match(/\d+/)[0]) - 1;
            countEl.innerHTML = `You have <span style="color: white; font-weight: 700;">${currentCount}</span> saved events.`;
        }, 300);

        showToast('Removed from favorites', 'success');
    } catch (error) {
        showToast(error.message || 'Failed to remove from favorites', 'error');
    }
};

// Trigger auto-scrape for event venue
const triggerAutoScrape = (eventId) => {
    // Redirect to automation page with event context
    window.location.href = `/automation.html?eventId=${eventId}`;
};

// Search functionality
document.getElementById('searchInput').addEventListener('input', debounce((e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    const cards = document.querySelectorAll('.event-card');

    cards.forEach(card => {
        const title = card.querySelector('.event-title').textContent.toLowerCase();
        const location = card.querySelector('.event-location span:last-child').textContent.toLowerCase();

        if (title.includes(searchTerm) || location.includes(searchTerm)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}, 200));
