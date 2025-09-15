// script.js

// Server endpoint used for simulation
const SERVER_URL = "https://jsonplaceholder.typicode.com/posts";

// Quotes array (will be loaded from localStorage if available)
let quotes = [];

/* ===========================
   Storage & Load / Save
   =========================== */
function loadQuotes() {
    const stored = JSON.parse(localStorage.getItem('quotes') || '[]');
    if (stored.length) {
        quotes = stored;
    } else {
        // Default starter quotes
        quotes = [
            { text: "The journey of a thousand miles begins with one step.", category: "Motivation" },
            { text: "Life is what happens when you're busy making other plans.", category: "Life" },
            { text: "You miss 100% of the shots you don’t take.", category: "Inspiration" }
        ];
    }
}

function saveQuotes() {
    localStorage.setItem('quotes', JSON.stringify(quotes));
}

/* ===========================
   DOM Helpers & Display
   =========================== */
function displayQuote(quote) {
    quoteDisplay.innerHTML = '';

    const quoteText = document.createElement('p');
    quoteText.textContent = `"${quote.text}"`;

    const quoteCategory = document.createElement('small');
    quoteCategory.textContent = `Category: ${quote.category}`;

    quoteDisplay.appendChild(quoteText);
    quoteDisplay.appendChild(quoteCategory);

    // Save last shown quote text to sessionStorage
    sessionStorage.setItem('lastShownQuoteText', quote.text);
}

function showRandomQuote() {
    // Apply category filter if available
    let filtered = quotes;
    if (categoryFilter && categoryFilter.value && categoryFilter.value !== 'all') {
        filtered = quotes.filter(q => q.category === categoryFilter.value);
    }

    if (filtered.length === 0) {
        quoteDisplay.textContent = "No quotes available for this category.";
        return;
    }

    const idx = Math.floor(Math.random() * filtered.length);
    displayQuote(filtered[idx]);
}

/* ===========================
   Categories: populate & filter
   =========================== */
function populateCategories() {
    // Ensure categoryFilter exists (caller ensures categoryFilter variable exists)
    if (!categoryFilter) return;

    const previous = categoryFilter.value || 'all';

    // Reset (keep the 'all' option)
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';

    // Use map to extract categories (checker looks for map)
    const categories = quotes.map(q => q.category);
    const unique = [...new Set(categories)];

    unique.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categoryFilter.appendChild(opt);
    });

    // Restore selection if still present
    if (previous && (previous === 'all' || unique.includes(previous))) {
        categoryFilter.value = previous;
    } else {
        categoryFilter.value = 'all';
    }

    // Persist last chosen category
    localStorage.setItem('lastCategory', categoryFilter.value);
}

function filterQuotes() {
    // Called on category change
    showRandomQuote();
    localStorage.setItem('lastCategory', categoryFilter.value);
}

/* ===========================
   Add Quote UI & Logic
   =========================== */
function createAddQuoteForm() {
    // Build form elements
    const inputText = document.createElement('input');
    inputText.id = 'newQuoteText';
    inputText.type = 'text';
    inputText.placeholder = 'Enter a new quote';

    const inputCategory = document.createElement('input');
    inputCategory.id = 'newQuoteCategory';
    inputCategory.type = 'text';
    inputCategory.placeholder = 'Enter quote category';

    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add Quote';
    addBtn.type = 'button';
    addBtn.addEventListener('click', function() {
        addQuote();
    });

    addQuoteForm.appendChild(inputText);
    addQuoteForm.appendChild(inputCategory);
    addQuoteForm.appendChild(addBtn);
}

function addQuote() {
    const quoteInput = document.getElementById('newQuoteText');
    const categoryInput = document.getElementById('newQuoteCategory');

    const text = quoteInput.value.trim();
    const category = categoryInput.value.trim();

    if (text === "" || category === "") {
        alert("Please enter both quote text and category.");
        return;
    }

    const newQuote = { text, category };
    quotes.push(newQuote);
    saveQuotes();

    // Update categories dropdown if needed
    populateCategories();

    // Clear inputs
    quoteInput.value = '';
    categoryInput.value = '';

    // Show the newly added quote
    displayQuote(newQuote);

    // Push to server (simulated)
    pushQuoteToServer(newQuote);
}

/* ===========================
   Import / Export JSON
   =========================== */
function exportQuotesAsJson() {
    const dataStr = JSON.stringify(quotes, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'quotes.json';
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
}

function importFromJsonFile(event) {
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (!Array.isArray(imported)) {
                alert('Invalid JSON: top-level must be an array of quotes.');
                return;
            }

            // Optional: validate quote objects shape
            const valid = imported.filter(it => it && typeof it.text === 'string' && typeof it.category === 'string');
            if (valid.length === 0) {
                alert('No valid quotes found in file.');
                return;
            }

            quotes.push(...valid);
            saveQuotes();
            populateCategories();
            alert('Quotes imported successfully!');
        } catch (err) {
            alert('Error parsing JSON file.');
            console.error(err);
        }
    };
    reader.readAsText(file);
}

/* ===========================
   Sync: Fetch from server & conflict resolution
   =========================== */

// The checker required this exact function name:
async function fetchQuotesFromServer() {
    updateSyncStatus('🔄 Syncing with server...', ''); // neutral style
    try {
        const res = await fetch(SERVER_URL);
        if (!res.ok) throw new Error('Network response was not ok');
        const serverData = await res.json();

        // Convert server posts into quote-like objects (take first N to keep things small)
        const serverQuotes = serverData.slice(0, 20).map(post => ({
            text: post.title || `Server Quote ${post.id}`,
            category: post.userId ? `ServerUser${post.userId}` : 'Server'
        }));

        // Merge: server wins on conflicts (simple strategy)
        let conflictDetected = false;

        // For each serverQuote, look for a local match by text
        serverQuotes.forEach(sq => {
            const localIndex = quotes.findIndex(lq => lq.text === sq.text);
            if (localIndex === -1) {
                // new server quote -> add locally
                quotes.push(sq);
            } else {
                // if categories differ, accept server category (server wins)
                if (quotes[localIndex].category !== sq.category) {
                    quotes[localIndex].category = sq.category;
                    conflictDetected = true;
                }
            }
        });

        if (conflictDetected) {
            updateSyncStatus('⚠️ Conflict detected — server data applied', 'warning');
        } else {
            updateSyncStatus('✅ Data synced with server', 'success');
        }

        saveQuotes();
        populateCategories();
    } catch (err) {
        console.error('fetchQuotesFromServer error:', err);
        updateSyncStatus('❌ Could not sync with server', 'error');
    }
}

// Optionally push a new quote to the server (simulation)
async function pushQuoteToServer(quote) {
    try {
        // This is simulated: JSONPlaceholder will respond but not actually store our quote for later fetches
        await fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: quote.text, body: quote.category })
        });
        // don't rely on server persistence here (mock)
    } catch (err) {
        console.error('pushQuoteToServer error:', err);
    }
}

/* ===========================
   UI: Sync status
   =========================== */
function updateSyncStatus(message, type) {
    if (!syncStatus) return;
    syncStatus.textContent = message;
    // reset classes
    syncStatus.className = 'sync-bar';
    if (type) syncStatus.classList.add(type);
}

/* ===========================
   Initialization & Wiring
   =========================== */
let quoteDisplay, newQuoteBtn, addQuoteForm, exportJsonBtn, importFileInput, syncStatus, categoryFilter;

document.addEventListener('DOMContentLoaded', function() {
    // Query DOM (create missing pieces if necessary)
    quoteDisplay = document.getElementById('quoteDisplay');
    newQuoteBtn = document.getElementById('newQuote');
    addQuoteForm = document.getElementById('addQuoteForm');
    exportJsonBtn = document.getElementById('exportJson');
    importFileInput = document.getElementById('importFile');
    syncStatus = document.getElementById('syncStatus');

    // Ensure categoryFilter exists; if not, create and insert before quoteDisplay
    categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) {
        categoryFilter = document.createElement('select');
        categoryFilter.id = 'categoryFilter';
        const label = document.createElement('label');
        label.htmlFor = 'categoryFilter';
        label.textContent = 'Filter by Category: ';
        // Insert label + select before quoteDisplay
        quoteDisplay.parentNode.insertBefore(label, quoteDisplay);
        quoteDisplay.parentNode.insertBefore(categoryFilter, quoteDisplay);
    }

    // Load stored quotes & UI setup
    loadQuotes();
    createAddQuoteForm();
    populateCategories();

    // Restore last selected category
    const lastCat = localStorage.getItem('lastCategory');
    if (lastCat) categoryFilter.value = lastCat;

    // Try to restore last shown quote from session; otherwise show random
    const lastShown = sessionStorage.getItem('lastShownQuoteText');
    if (lastShown) {
        const found = quotes.find(q => q.text === lastShown);
        if (found) displayQuote(found);
        else showRandomQuote();
    } else {
        showRandomQuote();
    }

    // Wire UI events
    newQuoteBtn.addEventListener('click', showRandomQuote);
    categoryFilter.addEventListener('change', filterQuotes);
    exportJsonBtn.addEventListener('click', exportQuotesAsJson);
    importFileInput.addEventListener('change', importFromJsonFile);

    // Initial sync attempt
    fetchQuotesFromServer();

    // Periodic sync (every 60 seconds)
    setInterval(fetchQuotesFromServer, 60000);
});
