/* ========================================
   DigiDeck Digimon Database - Modern JavaScript
   ======================================== */

// ========================================
// STATE MANAGEMENT
// ========================================
const AppState = {
  data: {
    currentTab: 'digimon',
    searchTerm: '',
    filters: {
      digimon: { level: '' },
      cards: { type: 'Digimon' }
    },
    cache: {
      digimon: null,
      cards: null
    },
    isLoading: false
  },

  setState(updates) {
    this.data = { ...this.data, ...updates };
  },

  clearCache(tab) {
    if (tab) {
      this.data.cache[tab] = null;
    } else {
      this.data.cache = { digimon: null, cards: null };
    }
  }
};

// ========================================
// UTILITY FUNCTIONS
// ========================================
async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    showError('Failed to load data. Please check your connection and try again.');
    return null;
  }
}

function showLoading() {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.classList.remove('hidden');
  }
  AppState.setState({ isLoading: true });
}

function hideLoading() {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.classList.add('hidden');
  }
  AppState.setState({ isLoading: false });
}

function showError(message) {
  const errorEl = document.getElementById('error-message');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    setTimeout(() => {
      errorEl.classList.add('hidden');
    }, 5000);
  }
}

// ========================================
// API LAYER
// ========================================
const DigimonAPI = {
  baseURL: 'https://digimon-api.vercel.app/api/digimon',

  async searchByName(name) {
    return fetchData(`${this.baseURL}/name/${name}`);
  },

  async searchByLevel(level) {
    return fetchData(`${this.baseURL}/level/${level}`);
  }
};

const TCGCardAPI = {
  baseURL: 'https://digimoncard.io/api-public/search',

  async search(name, type) {
    const params = new URLSearchParams({
      n: name,
      series: 'Digimon Card Game',
      type: type
    });
    return fetchData(`${this.baseURL}?${params}`);
  }
};

// ========================================
// TAB CONTROLLER
// ========================================
function switchTab(tabName) {
  // Update state
  AppState.setState({ currentTab: tabName });

  // Update tab button UI
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });

  // Update tab panel UI
  document.querySelectorAll('.tab-panel').forEach(panel => {
    const panelTab = panel.id.replace('-panel', '');
    panel.classList.toggle('active', panelTab === tabName);
  });

  // Auto-search if search term exists
  if (AppState.data.searchTerm) {
    performSearch();
  }
}

// ========================================
// SEARCH CONTROLLER
// ========================================
async function performSearch() {
  const { currentTab, searchTerm, filters, cache } = AppState.data;

  // Validate search term
  if (!searchTerm.trim()) {
    showError('Please enter a search term');
    return;
  }

  // Check cache first
  const cacheKey = `${currentTab}_${searchTerm}_${JSON.stringify(filters[currentTab])}`;
  if (cache[currentTab] && cache[currentTab].key === cacheKey) {
    renderResults(cache[currentTab].data, currentTab);
    return;
  }

  // Show loading state
  showLoading();

  // Perform search based on active tab
  let results;
  if (currentTab === 'digimon') {
    results = await searchDigimon(searchTerm, filters.digimon.level);
  } else {
    results = await searchCards(searchTerm, filters.cards.type);
  }

  hideLoading();

  // Cache results
  if (results) {
    AppState.data.cache[currentTab] = {
      key: cacheKey,
      data: results
    };
    renderResults(results, currentTab);
  }
}

async function searchDigimon(name, level) {
  if (level) {
    return await DigimonAPI.searchByLevel(level);
  } else if (name) {
    return await DigimonAPI.searchByName(name);
  }
  return [];
}

async function searchCards(name, type) {
  return await TCGCardAPI.search(name, type);
}

// ========================================
// RENDERER
// ========================================
function renderResults(data, tabType) {
  const container = document.getElementById(`${tabType}-results`);

  if (!container) {
    console.error(`Container not found: ${tabType}-results`);
    return;
  }

  container.innerHTML = '';

  if (!data || data.length === 0) {
    container.innerHTML = '<p class="no-results">No results found. Try a different search term.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  data.forEach((item, index) => {
    const card = tabType === 'digimon'
      ? createDigimonCard(item, index)
      : createTCGCard(item, index);
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

function createDigimonCard(digimon, index) {
  const card = document.createElement('div');
  card.className = 'result-card';
  card.style.animationDelay = `${index * 50}ms`;

  const title = document.createElement('h2');
  title.className = 'card-title';
  title.textContent = digimon.name;

  const img = document.createElement('img');
  img.className = 'card-image';
  img.src = digimon.img;
  img.alt = digimon.name;
  img.loading = 'lazy';

  const level = document.createElement('span');
  level.className = 'card-level';
  level.textContent = digimon.level;

  card.appendChild(title);
  card.appendChild(img);
  card.appendChild(level);

  return card;
}

function createTCGCard(cardData, index) {
  const card = document.createElement('div');
  card.className = 'result-card';
  card.style.animationDelay = `${index * 50}ms`;

  const title = document.createElement('h2');
  title.className = 'card-title';
  title.textContent = cardData.name;

  const cardNumber = document.createElement('span');
  cardNumber.className = 'card-number';
  // Updated field name: cardnumber → id
  cardNumber.textContent = `#${cardData.id || cardData.cardnumber || 'N/A'}`;

  card.appendChild(title);
  card.appendChild(cardNumber);

  // Construct image URL from card ID
  // Pattern: https://images.digimoncard.io/images/cards/{id}.webp
  if (cardData.id) {
    const imageUrl = `https://images.digimoncard.io/images/cards/${cardData.id}.webp`;
    const img = document.createElement('img');
    img.className = 'card-image2';
    img.src = imageUrl;
    img.alt = cardData.name;
    img.loading = 'lazy';

    // Add error handler for broken images
    img.onerror = function() {
      this.style.display = 'none';
      const noImage = document.createElement('p');
      noImage.textContent = '(Image not available)';
      noImage.style.color = 'rgba(255, 255, 255, 0.5)';
      this.parentElement.appendChild(noImage);
    };

    card.appendChild(img);
  } else {
    // No card ID available
    const noImage = document.createElement('p');
    noImage.textContent = '(No image available)';
    noImage.style.color = 'rgba(255, 255, 255, 0.5)';
    card.appendChild(noImage);
  }

  // Stage (if available)
  if (cardData.stage) {
    const stage = document.createElement('span');
    stage.className = 'card-level';
    stage.textContent = cardData.stage;
    card.appendChild(stage);
  }

  // Color
  if (cardData.color) {
    const color = document.createElement('span');
    color.className = 'card-color';
    color.style.backgroundColor = cardData.color;

    // Set text color to white for dark backgrounds
    const darkColors = ['Black', 'Purple', 'Blue', 'Red', 'Green'];
    if (darkColors.includes(cardData.color)) {
      color.style.color = 'white';
    }

    color.textContent = cardData.color;
    card.appendChild(color);
  }

  // Effects - Updated field names: maineffect → main_effect, soureeffect → source_effect
  if (cardData.main_effect || cardData.source_effect || cardData.maineffect || cardData.soureeffect) {
    const effect = document.createElement('div');
    effect.className = 'card-effect';

    const mainEffect = cardData.main_effect || cardData.maineffect;
    const sourceEffect = cardData.source_effect || cardData.soureeffect;

    if (mainEffect) {
      effect.innerHTML = `<strong>Main Effect:</strong> ${mainEffect}`;
    } else if (sourceEffect) {
      effect.innerHTML = `<strong>Inherited/Security Effect:</strong> ${sourceEffect}`;
    }

    card.appendChild(effect);
  }

  return card;
}

// ========================================
// EVENT HANDLERS
// ========================================
function initializeEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.dataset.tab;
      switchTab(tabName);
    });
  });

  // Search button
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const searchInput = document.getElementById('searchInput');
      const searchTerm = searchInput.value.trim();

      if (!searchTerm) {
        showError('Please enter a search term');
        return;
      }

      AppState.setState({ searchTerm });
      AppState.clearCache(AppState.data.currentTab); // Clear current tab cache
      performSearch();
    });
  }

  // Enter key on search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('searchBtn').click();
      }
    });
  }

  // Level filter change (Digimon tab)
  const levelFilter = document.getElementById('levelFilter');
  if (levelFilter) {
    levelFilter.addEventListener('change', (e) => {
      AppState.setState({
        filters: {
          ...AppState.data.filters,
          digimon: { level: e.target.value }
        }
      });
      AppState.clearCache('digimon'); // Clear digimon cache when filter changes

      if (AppState.data.searchTerm && AppState.data.currentTab === 'digimon') {
        performSearch();
      }
    });
  }

  // Type filter change (Cards tab)
  const typeFilter = document.getElementById('typeFilter');
  if (typeFilter) {
    typeFilter.addEventListener('change', (e) => {
      AppState.setState({
        filters: {
          ...AppState.data.filters,
          cards: { type: e.target.value }
        }
      });
      AppState.clearCache('cards'); // Clear cards cache when filter changes

      if (AppState.data.searchTerm && AppState.data.currentTab === 'cards') {
        performSearch();
      }
    });
  }
}

// ========================================
// INITIALIZATION
// ========================================
function initializeApp() {
  console.log('DigiDeck initialized!');

  // Initialize event listeners
  initializeEventListeners();

  // Set initial tab
  switchTab('digimon');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
