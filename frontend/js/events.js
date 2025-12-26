// Events Page JavaScript
let currentPage = 1;
let currentType = '';
let currentStatus = '';
let currentSearch = '';
let totalPages = 1;
let allEvents = [];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    updateNavigation();
    setupEventListeners();
    loadEvents();
    updateCreateButtonVisibility();
});

// Setup event listeners
const setupEventListeners = () => {
    // Type filter chips
    const filterChips = document.getElementById('filterChips');
    filterChips.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip')) {
            document.querySelectorAll('.chip').forEach(chip => chip.classList.remove('active'));
            e.target.classList.add('active');
            currentType = e.target.dataset.type;
            currentPage = 1;
            loadEvents();
        }
    });

    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    statusFilter.addEventListener('change', () => {
        currentStatus = statusFilter.value;
        currentPage = 1;
        loadEvents();
    });

    // Search input
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce((e) => {
        currentSearch = e.target.value.trim();
        currentPage = 1;
        loadEvents();
    }, 300));
};

// Update create button visibility
const updateCreateButtonVisibility = () => {
    const createBtn = document.getElementById('createEventBtn');
    if (isAuthenticated()) {
        createBtn.style.display = 'flex';
    } else {
        createBtn.style.display = 'none';
    }
};

// Load events from API
const loadEvents = async (append = false) => {
    const eventsGrid = document.getElementById('eventsGrid');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const loadMoreContainer = document.getElementById('loadMoreContainer');

    if (!append) {
        eventsGrid.innerHTML = '';
        loadingState.classList.remove('hidden');
    }
    emptyState.classList.add('hidden');

    try {
        const params = {
            page: currentPage,
            limit: 6
        };

        if (currentType) params.type = currentType;
        if (currentStatus) params.status = currentStatus;
        if (currentSearch) params.search = currentSearch;

        const response = await api.getEvents(params);

        loadingState.classList.add('hidden');

        if (response.success) {
            const { data, pagination } = response;
            totalPages = pagination.totalPages;

            if (data.length === 0 && !append) {
                emptyState.classList.remove('hidden');
                loadMoreContainer.classList.add('hidden');
            } else {
                allEvents = append ? [...allEvents, ...data] : data;
                renderEvents(data, append);

                // Show/hide load more button
                if (currentPage >= totalPages) {
                    loadMoreContainer.classList.add('hidden');
                } else {
                    loadMoreContainer.classList.remove('hidden');
                }
            }
        }
    } catch (error) {
        loadingState.classList.add('hidden');
        showToast(error.message || 'Failed to load events', 'error');
    }
};

// Render events to grid
const renderEvents = (events, append = false) => {
    const eventsGrid = document.getElementById('eventsGrid');
    const user = getUser();

    const eventsHTML = events.map(event => createEventCard(event, user)).join('');

    if (append) {
        eventsGrid.insertAdjacentHTML('beforeend', eventsHTML);
    } else {
        eventsGrid.innerHTML = eventsHTML;
    }
};

// Create event card HTML
const createEventCard = (event, user) => {
    const statusBadgeClass = {
        'upcoming': 'badge-upcoming',
        'completed': 'badge-completed',
        'cancelled': 'badge-cancelled'
    }[event.status] || 'badge-upcoming';

    const statusLabel = event.status.charAt(0).toUpperCase() + event.status.slice(1);
    const isOwner = user && user.id === event.creator_id;
    const priceDisplay = formatPrice(event.price);
    const dateDisplay = formatDateRange(event.date, event.end_date);

    // Random placeholder images for events without images
    const placeholderImages = [
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600',
        'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600',
        'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600',
        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600',
        'https://images.unsplash.com/photo-1559223607-a43c990c692c?w=600',
        'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=600'
    ];
    const imageUrl = event.image || placeholderImages[event.id % placeholderImages.length];

    return `
        <article class="card event-card" data-id="${event.id}">
            <div class="event-card-image">
                <img src="${imageUrl}" alt="${event.name}" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'image-placeholder\\'><span class=\\'material-symbols-outlined\\'>event</span></div>'">
                <div class="event-badges">
                    <span class="badge ${statusBadgeClass}">${statusLabel}</span>
                    <span class="badge badge-type">${event.type}</span>
                </div>
                <button class="favorite-btn ${event.isFavorite ? 'active' : ''}" 
                        onclick="toggleFavorite(${event.id}, this)"
                        title="${event.isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                    <span class="material-symbols-outlined">${event.isFavorite ? 'favorite' : 'favorite_border'}</span>
                </button>
            </div>
            <div class="event-card-content">
                <div class="event-card-header">
                    <div>
                        <h3 class="event-title">${event.name}</h3>
                        <div class="event-date">
                            <span class="material-symbols-outlined">calendar_today</span>
                            <span>${dateDisplay}</span>
                        </div>
                    </div>
                    <span class="event-price ${priceDisplay === 'Free' ? 'free' : ''}">${priceDisplay}</span>
                </div>
                <div class="event-divider"></div>
                <div class="event-card-footer">
                    <div class="event-location">
                        <span class="material-symbols-outlined">location_on</span>
                        <span>${event.location}</span>
                    </div>
                    <div class="flex gap-2">
                        ${isOwner ? `
                            <button class="btn btn-icon btn-ghost" onclick="openEditEventModal(${event.id})" title="Edit">
                                <span class="material-symbols-outlined">edit</span>
                            </button>
                            <button class="btn btn-icon btn-ghost" onclick="openDeleteModal(${event.id})" title="Delete">
                                <span class="material-symbols-outlined">delete</span>
                            </button>
                        ` : ''}
                        <button class="event-details-btn" onclick="viewEventDetails(${event.id})">
                            Details →
                        </button>
                    </div>
                </div>
            </div>
        </article>
    `;
};

// Load more events
const loadMoreEvents = () => {
    currentPage++;
    loadEvents(true);
};

// Toggle favorite
const toggleFavorite = async (eventId, button) => {
    if (!isAuthenticated()) {
        showToast('Please login to add favorites', 'warning');
        window.location.href = '/login.html';
        return;
    }

    const isActive = button.classList.contains('active');

    try {
        if (isActive) {
            await api.removeFavorite(eventId);
            button.classList.remove('active');
            button.innerHTML = '<span class="material-symbols-outlined">favorite_border</span>';
            showToast('Removed from favorites', 'success');
        } else {
            await api.addFavorite(eventId);
            button.classList.add('active');
            button.innerHTML = '<span class="material-symbols-outlined">favorite</span>';
            showToast('Added to favorites', 'success');
        }
    } catch (error) {
        showToast(error.message || 'Failed to update favorites', 'error');
    }
};

// View event details
const viewEventDetails = (eventId) => {
    window.location.href = `event-detail.html?id=${eventId}`;
};

// Open create event modal
const openCreateEventModal = () => {
    if (!isAuthenticated()) {
        showToast('Please login to create events', 'warning');
        window.location.href = '/login.html';
        return;
    }

    document.getElementById('modalTitle').textContent = 'Create New Event';
    document.getElementById('submitEventBtn').textContent = 'Create Event';
    document.getElementById('eventForm').reset();
    document.getElementById('eventId').value = '';
    document.getElementById('eventModal').classList.add('active');
};

// Open edit event modal
const openEditEventModal = async (eventId) => {
    try {
        const response = await api.getEvent(eventId);
        if (response.success) {
            const event = response.data;

            document.getElementById('modalTitle').textContent = 'Edit Event';
            document.getElementById('submitEventBtn').textContent = 'Update Event';
            document.getElementById('eventId').value = event.id;
            document.getElementById('eventName').value = event.name;
            document.getElementById('eventType').value = event.type;
            document.getElementById('eventStatus').value = event.status;
            document.getElementById('eventDescription').value = event.description || '';
            document.getElementById('eventDate').value = event.date.split('T')[0];
            document.getElementById('eventEndDate').value = event.end_date ? event.end_date.split('T')[0] : '';
            document.getElementById('eventLocation').value = event.location;
            document.getElementById('eventCapacity').value = event.capacity || '';
            document.getElementById('eventPrice').value = event.price || '';
            document.getElementById('eventImage').value = event.image || '';

            document.getElementById('eventModal').classList.add('active');
        }
    } catch (error) {
        showToast(error.message || 'Failed to load event', 'error');
    }
};

// Close event modal
const closeEventModal = () => {
    document.getElementById('eventModal').classList.remove('active');
};

// Handle event form submit
const handleEventSubmit = async (e) => {
    e.preventDefault();

    const eventId = document.getElementById('eventId').value;
    const eventData = {
        name: document.getElementById('eventName').value,
        type: document.getElementById('eventType').value,
        status: document.getElementById('eventStatus').value,
        description: document.getElementById('eventDescription').value,
        date: document.getElementById('eventDate').value,
        end_date: document.getElementById('eventEndDate').value || null,
        location: document.getElementById('eventLocation').value,
        capacity: parseInt(document.getElementById('eventCapacity').value) || 100,
        price: parseFloat(document.getElementById('eventPrice').value) || 0,
        image: document.getElementById('eventImage').value || null
    };

    try {
        let response;
        if (eventId) {
            response = await api.updateEvent(eventId, eventData);
            showToast('Event updated successfully', 'success');
        } else {
            response = await api.createEvent(eventData);
            showToast('Event created successfully', 'success');
        }

        closeEventModal();
        currentPage = 1;
        loadEvents();
    } catch (error) {
        showToast(error.message || 'Failed to save event', 'error');
    }
};

// Delete modal
let eventToDelete = null;

const openDeleteModal = (eventId) => {
    eventToDelete = eventId;
    document.getElementById('deleteModal').classList.add('active');
};

const closeDeleteModal = () => {
    eventToDelete = null;
    document.getElementById('deleteModal').classList.remove('active');
};

// Confirm delete
document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (!eventToDelete) return;

    try {
        await api.deleteEvent(eventToDelete);
        showToast('Event deleted successfully', 'success');
        closeDeleteModal();
        currentPage = 1;
        loadEvents();
    } catch (error) {
        showToast(error.message || 'Failed to delete event', 'error');
    }
});

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
});

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(modal => {
            modal.classList.remove('active');
        });
    }
});
