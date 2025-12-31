// Events Page JavaScript
let currentPage = 1;
let currentType = '';
let currentStatus = '';
let currentSearch = '';
let totalPages = 1;
let allEvents = [];
let uploadedImages = []; // Store uploaded image data URLs

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for auth initialization to complete
    await api.init();

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
const loadEvents = async () => {
    const eventsGrid = document.getElementById('eventsGrid');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const paginationContainer = document.getElementById('paginationContainer');

    eventsGrid.innerHTML = '';
    loadingState.classList.remove('hidden');
    emptyState.classList.add('hidden');
    paginationContainer.innerHTML = '';

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

            if (data.length === 0) {
                emptyState.classList.remove('hidden');
            } else {
                allEvents = data;
                renderEvents(data);
                renderPagination();
            }
        }
    } catch (error) {
        loadingState.classList.add('hidden');
        showToast(error.message || 'Failed to load events', 'error');
    }
};

// Render events to grid
const renderEvents = (events) => {
    const eventsGrid = document.getElementById('eventsGrid');
    const user = getUser();

    const eventsHTML = events.map(event => createEventCard(event, user)).join('');
    eventsGrid.innerHTML = eventsHTML;
};

// Render pagination controls
const renderPagination = () => {
    const paginationContainer = document.getElementById('paginationContainer');

    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHTML = '';

    // Previous button
    paginationHTML += `
        <button class="pagination-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <span class="material-symbols-outlined">chevron_left</span>
        </button>
    `;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // Adjust startPage if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page and ellipsis
    if (startPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }

    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                ${i}
            </button>
        `;
    }

    // Last page and ellipsis
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHTML += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    // Next button
    paginationHTML += `
        <button class="pagination-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            <span class="material-symbols-outlined">chevron_right</span>
        </button>
    `;

    paginationContainer.innerHTML = paginationHTML;
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

    // Get single image
    let eventImage = '';
    if (event.image) {
        // Handle both JSON array (legacy) and single string
        try {
            const parsed = JSON.parse(event.image);
            eventImage = Array.isArray(parsed) ? parsed[0] : event.image;
        } catch {
            eventImage = event.image;
        }
    }
    if (!eventImage) {
        eventImage = placeholderImages[event.id % placeholderImages.length];
    }

    return `
        <article class="card event-card" data-id="${event.id}">
            <div class="event-card-image">
                <img src="${eventImage}" alt="${event.name}" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'image-placeholder\\'><span class=\\'material-symbols-outlined\\'>event</span></div>'">
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

// Go to specific page
const goToPage = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    currentPage = page;
    loadEvents();
    // Scroll to top of events grid
    document.getElementById('eventsGrid').scrollIntoView({ behavior: 'smooth', block: 'start' });
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
let openCreateEventModal = () => {
    isEditing = false;

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

            // Handle images for edit mode
            uploadedImages = [];
            if (event.image) {
                try {
                    const imgs = JSON.parse(event.image);
                    if (Array.isArray(imgs)) {
                        uploadedImages = imgs;
                    } else {
                        uploadedImages = [event.image];
                    }
                } catch {
                    uploadedImages = event.image ? [event.image] : [];
                }
            }
            updateImagePreviews();

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
        image: uploadedImages.length > 0 ? uploadedImages[0] : null
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

// ===== Image Upload Handling =====

// Handle image upload from file input
const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    processImageFiles(files);
};

// Process uploaded image files
const processImageFiles = (files) => {
    // Filter for WebP only
    const webpFiles = files.filter(file => file.type === 'image/webp');

    if (webpFiles.length !== files.length) {
        showToast('Only WebP images are allowed for best performance', 'warning');
    }

    if (webpFiles.length === 0) {
        return;
    }

    // Only allow 1 image
    if (uploadedImages.length >= 1) {
        showToast('Only 1 image allowed. Remove the current image first.', 'warning');
        return;
    }

    const filesToProcess = webpFiles.slice(0, 1);

    // Convert files to data URLs
    filesToProcess.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImages.push(e.target.result);
            updateImagePreviews();
        };
        reader.readAsDataURL(file);
    });
};

// Update image previews display
const updateImagePreviews = () => {
    const placeholder = document.getElementById('uploadPlaceholder');
    const previews = document.getElementById('imagePreviews');

    if (!placeholder || !previews) return;

    if (uploadedImages.length === 0) {
        placeholder.classList.remove('hidden');
        previews.classList.add('hidden');
        previews.innerHTML = '';
        return;
    }

    placeholder.classList.add('hidden');
    previews.classList.remove('hidden');

    previews.innerHTML = uploadedImages.map((img, index) => `
        <div class="image-preview">
            <img src="${img}" alt="Preview ${index + 1}">
            <button type="button" class="remove-image" onclick="removeImage(${index})" title="Remove image">×</button>
        </div>
    `).join('');
};

// Remove image from uploaded array
const removeImage = (index) => {
    uploadedImages.splice(index, 1);
    updateImagePreviews();
};

// Reset image uploads when opening create modal
const originalOpenCreateEventModal = openCreateEventModal;
openCreateEventModal = () => {
    uploadedImages = [];
    updateImagePreviews();
    originalOpenCreateEventModal();
};

// Setup drag and drop for image upload area
document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('imageUploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            processImageFiles(files);
        });
    }
});
