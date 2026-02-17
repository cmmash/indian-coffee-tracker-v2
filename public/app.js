let coffees = [];
let filteredCoffees = [];

const API_BASE = '/api';

const state = {
  selectedRoaster: '',
  selectedRoastLevel: '',
  searchQuery: ''
};

const elements = {
  coffeeGrid: null,
  roasterFilter: null,
  roastLevelFilter: null,
  searchInput: null,
  resetBtn: null,
  loading: null,
  error: null,
  resultsCount: null
};

async function fetchCoffees() {
  try {
    showLoading(true);
    hideError();
    const response = await fetch(`${API_BASE}/coffees`);
    if (!response.ok) throw new Error('Failed to fetch coffees');
    coffees = await response.json();
    populateFilters();
    applyFilters();
  } catch (error) {
    console.error('Error fetching coffees:', error);
    showError('Failed to load coffees. Please try again later.');
  } finally {
    showLoading(false);
  }
}

function populateFilters() {
  const roasters = [...new Set(coffees.map(c => c.roaster))].sort();
  const roastLevels = [...new Set(coffees.map(c => c.roastLevel))].sort();
  
  elements.roasterFilter.innerHTML = '<option value="">All Roasters</option>' +
    roasters.map(r => `<option value="${r}">${r}</option>`).join('');
  
  elements.roastLevelFilter.innerHTML = '<option value="">All Roast Levels</option>' +
    roastLevels.map(rl => `<option value="${rl}">${capitalizeRoastLevel(rl)}</option>`).join('');
}

function applyFilters() {
  filteredCoffees = coffees.filter(coffee => {
    const matchesRoaster = !state.selectedRoaster || coffee.roaster === state.selectedRoaster;
    const matchesRoastLevel = !state.selectedRoastLevel || coffee.roastLevel === state.selectedRoastLevel;
    const matchesSearch = !state.searchQuery || 
      coffee.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      coffee.roaster.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      (coffee.origin && coffee.origin.toLowerCase().includes(state.searchQuery.toLowerCase()));
    
    return matchesRoaster && matchesRoastLevel && matchesSearch;
  });
  
  renderCoffees();
  updateResultsCount();
}

function renderCoffees() {
  if (filteredCoffees.length === 0) {
    elements.coffeeGrid.innerHTML = `
      <div class="col-span-full text-center py-16">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="mt-2 text-lg font-medium text-gray-900">No coffees found</h3>
        <p class="mt-1 text-sm text-gray-500">Try adjusting your filters or search query.</p>
      </div>
    `;
    return;
  }
  
  elements.coffeeGrid.innerHTML = filteredCoffees.map(coffee => createCoffeeCard(coffee)).join('');
  
  document.querySelectorAll('[data-coffee-id]').forEach(card => {
    card.addEventListener('click', async (e) => {
      const coffeeId = e.currentTarget.dataset.coffeeId;
      await showCoffeeDetails(coffeeId);
    });
  });
}

function createCoffeeCard(coffee) {
  const roastLevelColor = getRoastLevelColor(coffee.roastLevel);
  const stockBadge = coffee.inStock 
    ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">In Stock</span>'
    : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Out of Stock</span>';
  
  return `
    <div data-coffee-id="${coffee.id}" class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer">
      <div class="p-6">
        <div class="flex justify-between items-start mb-3">
          <h3 class="text-xl font-bold text-gray-900 flex-1">${escapeHtml(coffee.name)}</h3>
          ${stockBadge}
        </div>
        <p class="text-sm text-gray-600 mb-2">${escapeHtml(coffee.roaster)}</p>
        ${coffee.origin ? `<p class="text-sm text-gray-500 mb-3"><span class="font-semibold">Origin:</span> ${escapeHtml(coffee.origin)}</p>` : ''}
        
        <div class="flex items-center gap-2 mb-3">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${roastLevelColor}">
            ${capitalizeRoastLevel(coffee.roastLevel)}
          </span>
          <span class="text-sm text-gray-500">${coffee.weight}g</span>
        </div>
        
        ${coffee.tastingNotes && coffee.tastingNotes.length > 0 ? `
          <div class="mb-3">
            <p class="text-xs font-semibold text-gray-700 mb-1">Tasting Notes:</p>
            <div class="flex flex-wrap gap-1">
              ${coffee.tastingNotes.slice(0, 3).map(note => 
                `<span class="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded">${escapeHtml(note)}</span>`
              ).join('')}
              ${coffee.tastingNotes.length > 3 ? `<span class="text-xs text-gray-500">+${coffee.tastingNotes.length - 3} more</span>` : ''}
            </div>
          </div>
        ` : ''}
        
        ${coffee.description ? `
          <p class="text-sm text-gray-600 mb-3 line-clamp-2">${escapeHtml(coffee.description)}</p>
        ` : ''}
        
        <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
          <span class="text-2xl font-bold text-gray-900">$${parseFloat(coffee.currentPrice).toFixed(2)}</span>
          <button class="text-sm text-blue-600 hover:text-blue-800 font-medium">View Details â</button>
        </div>
      </div>
    </div>
  `;
}

async function showCoffeeDetails(coffeeId) {
  try {
    const response = await fetch(`${API_BASE}/coffees/${coffeeId}`);
    if (!response.ok) throw new Error('Failed to fetch coffee details');
    const coffee = await response.json();
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
    modal.innerHTML = `
      <div class="relative top-20 mx-auto p-8 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
        <div class="flex justify-between items-start mb-4">
          <h2 class="text-3xl font-bold text-gray-900">${escapeHtml(coffee.name)}</h2>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="space-y-4">
          <div>
            <p class="text-lg text-gray-700"><span class="font-semibold">Roaster:</span> ${escapeHtml(coffee.roaster)}</p>
            ${coffee.origin ? `<p class="text-lg text-gray-700"><span class="font-semibold">Origin:</span> ${escapeHtml(coffee.origin)}</p>` : ''}
            <p class="text-lg text-gray-700"><span class="font-semibold">Roast Level:</span> ${capitalizeRoastLevel(coffee.roastLevel)}</p>
            <p class="text-lg text-gray-700"><span class="font-semibold">Weight:</span> ${coffee.weight}g</p>
          </div>
          
          ${coffee.description ? `
            <div>
              <h3 class="font-semibold text-gray-900 mb-2">Description</h3>
              <p class="text-gray-700">${escapeHtml(coffee.description)}</p>
            </div>
          ` : ''}
          
          ${coffee.tastingNotes && coffee.tastingNotes.length > 0 ? `
            <div>
              <h3 class="font-semibold text-gray-900 mb-2">Tasting Notes</h3>
              <div class="flex flex-wrap gap-2">
                ${coffee.tastingNotes.map(note => 
                  `<span class="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm">${escapeHtml(note)}</span>`
                ).join('')}
              </div>
            </div>
          ` : ''}
          
          <div class="bg-blue-50 p-4 rounded-lg">
            <p class="text-3xl font-bold text-blue-900">$${parseFloat(coffee.currentPrice).toFixed(2)}</p>
            <p class="text-sm text-gray-600 mt-1">${coffee.inStock ? 'In Stock' : 'Out of Stock'}</p>
          </div>
          
          ${coffee.priceHistory && coffee.priceHistory.length > 0 ? `
            <div>
              <h3 class="font-semibold text-gray-900 mb-3">Price History</h3>
              <div class="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    ${coffee.priceHistory.slice().reverse().map(ph => `
                      <tr>
                        <td class="py-2 text-sm text-gray-900">${new Date(ph.effectiveDate).toLocaleDateString()}</td>
                        <td class="py-2 text-sm text-gray-900 text-right font-medium">$${parseFloat(ph.price).toFixed(2)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  } catch (error) {
    console.error('Error fetching coffee details:', error);
    alert('Failed to load coffee details.');
  }
}

function getRoastLevelColor(roastLevel) {
  const colors = {
    'light': 'bg-yellow-100 text-yellow-800',
    'medium': 'bg-orange-100 text-orange-800',
    'medium-dark': 'bg-amber-100 text-amber-800',
    'dark': 'bg-brown-100 text-brown-800'
  };
  return colors[roastLevel] || 'bg-gray-100 text-gray-800';
}

function capitalizeRoastLevel(roastLevel) {
  return roastLevel.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showLoading(show) {
  elements.loading.classList.toggle('hidden', !show);
}

function showError(message) {
  elements.error.textContent = message;
  elements.error.classList.remove('hidden');
}

function hideError() {
  elements.error.classList.add('hidden');
}

function updateResultsCount() {
  elements.resultsCount.textContent = `Showing ${filteredCoffees.length} of ${coffees.length} coffees`;
}

function resetFilters() {
  state.selectedRoaster = '';
  state.selectedRoastLevel = '';
  state.searchQuery = '';
  
  elements.roasterFilter.value = '';
  elements.roastLevelFilter.value = '';
  elements.searchInput.value = '';
  
  applyFilters();
}

function initializeEventListeners() {
  elements.roasterFilter.addEventListener('change', (e) => {
    state.selectedRoaster = e.target.value;
    applyFilters();
  });
  
  elements.roastLevelFilter.addEventListener('change', (e) => {
    state.selectedRoastLevel = e.target.value;
    applyFilters();
  });
  
  let searchTimeout;
  elements.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchQuery = e.target.value;
      applyFilters();
    }, 300);
  });
  
  elements.resetBtn.addEventListener('click', resetFilters);
}

function initializeElements() {
  elements.coffeeGrid = document.getElementById('coffeeGrid');
  elements.roasterFilter = document.getElementById('roasterFilter');
  elements.roastLevelFilter = document.getElementById('roastLevelFilter');
  elements.searchInput = document.getElementById('searchInput');
  elements.resetBtn = document.getElementById('resetBtn');
  elements.loading = document.getElementById('loading');
  elements.error = document.getElementById('error');
  elements.resultsCount = document.getElementById('resultsCount');
}

document.addEventListener('DOMContentLoaded', () => {
  initializeElements();
  initializeEventListeners();
  fetchCoffees();
});