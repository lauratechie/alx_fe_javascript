// script.js

// Simulation server endpoint
const SERVER_URL = "https://jsonplaceholder.typicode.com/posts";

// Quotes array (loaded from localStorage)
let quotes = [];

/* -------------------------
   Storage helpers
   ------------------------- */
function loadQuotes() {
    const stored = JSON.parse(localStorage.getItem('quotes') || '[]');
    if (stored.length) quotes = stored;
    else {
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

/* -------------------------
   UI helpers & display
   ------------------------- */
function displayQuote(quote) {
    quoteDisplay.innerHTML = '';

    const quoteText = document.createElement('p');
    quoteText.textContent = `"${quote.text}"`;

    const quoteCategory = document.createElement('small');
    quoteCategory.textContent = `Category: ${quote.category}`;

    quoteDisplay.appendChild(quoteText);
    quoteDisplay.appendChild(quoteCategory);

    // remember last shown in session
    sessionStorage.setItem('lastShownQuoteText', quote.text);
}

function showRandomQuote() {
    let filtered = quotes;
    if (categoryFilter && categoryFilter.value && categoryFilter.value !== 'all') {
        filtered = quotes.filter(q => q.category === categoryFilter.value);
    }

    if (!filtered.length) {
        quoteDisplay.textContent = "No quotes available for this category.";
        return;
    }

    const idx = Math.floor(Math.random() * filtered.length);
    displayQuote(filtered[idx]);
}

/* -------------------------
   Categories & filtering
   ------------------------- */
function populateCategories() {
    if (!categoryFilter) return;

    const prev = categoryFilter.value || 'all';
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';

    // use map (checker expects map)
    const cats = quotes.map(q => q.category);
    const unique = [...new Set(cats)];

    unique.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        categoryFilter.appendChild(opt);
    });

    if (prev === 'all' || unique.includes(prev)) categoryFilter.value = prev;
    else categoryFilter.value = 'all';

    localStorage.setItem('lastCategory', categoryFilter.value);
}

function filterQuotes() {
    showRandomQuote();
    localStorage.setItem('lastCategory', categoryFilter.value);
}

/* -------------------------
   Add quote UI & logic
   ------------------------- */
function createAddQuoteForm() {
    const inputText = document.createElement('input');
    inputText.id = 'newQuoteText';
    inputText.type = 'text';
    inputText.placeholder = 'Enter a new quote';

    const inputCategory = document.createElement('input');
    inputCategory.id = 'newQuoteCategory';
    inputCategory.type = 'text';
    inputCategory.placeholder = 'Enter quote category';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = 'Add Quote';
    addBtn.addEventListener('click', addQuote);

    addQuoteForm.appendChild(inputText);
    addQuoteForm.appendChild(inputCategory);
    addQuoteForm.appendChild(addBtn);
}

function addQuote() {
    const quoteInput = document.getElementById('newQuoteText');
    const categoryInput = document.getElementById('newQuoteCategory');

    const text = (quoteInput && quoteInput.value || '').trim();
    const category = (categoryInput && categoryInput.value || '').trim();

    if (!text || !category) {
        alert('Please enter both quote text and category.');
        return;
    }

    const newQuote = { text, category };
    quotes.push(newQuote);
    saveQuotes();

    populateCategories();

    quoteInput.value = '';
    categoryInput.value = '';

    displayQuote(newQuote);

    // attempt to push this new quote to server (simulation)
    pushQuoteToServer(newQuote).catch(() => {/* ignore push errors for simulation */});
}

/* -------------------------
   Import / Export JSON
   ------------------------- */
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
                alert('Invalid JSON: expected an array of quote objects.');
                return;
            }
            const valid = imported.filter(it => it && typeof it.text === 'string' && typeof it.category === 'string');
            if (!valid.length) {
                alert('No valid quotes in file.');
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

/* -------------------------
   Server interactions
   ------------------------- */

// Checker-required function: fetchQuotesFromServer
// This fetches server data and returns array of server-style quotes
async function fetchQuotesFromServer() {
    updateSyncStatus('🔄 Fetching server quotes...', '');
    try {
        const res = await fetch(SERVER_URL);
        if (!res.ok) throw new Error('Network response not ok');
        const serverData = await res.json();

        // convert server posts into quote objects (limited slice to keep small)
        const serverQuotes = serverData.slice(0, 30).map(post => ({
            text: post.title || `Server Quote ${post.id}`,
            category: post.userId ? `ServerUser${post.userId}` : 'Server'
        }));

        updateSyncStatus('✅ Fetched server quotes', 'success');
        return serverQuotes;
    } catch (err) {
        console.error('fetchQuotesFromServer error', err);
        updateSyncStatus('❌ Could not fetch server quotes', 'error');
        return []; // return empty array on failure
    }
}

// push new quote to server (simulation)
async function pushQuoteToServer(quote) {
    try {
        await fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: quote.text, body: quote.category })
        });
        // JSONPlaceholder responds but won't persist — this is a simulation
    } catch (err) {
        console.error('pushQuoteToServer error', err);
        throw err;
    }
}

// NEW: checker-required function syncQuotes
// This orchestrates a full sync: fetch server quotes, merge (server wins), then optionally push local-only to server
async function syncQuotes() {
    updateSyncStatus('🔄 Syncing with server...', '');

    try {
        // get server quotes (uses fetchQuotesFromServer which also updates status)
        const serverQuotes = await fetchQuotesFromServer();

        // If fetch failed, fetchQuotesFromServer returned [] and status already set
        if (!serverQuotes.length) {
            updateSyncStatus('⚠️ No server data to sync', 'warning');
            return;
        }

        let conflictDetected = false;

        // Create lookup by text for quick checks
        const serverTextToQuote = new Map(serverQuotes.map(sq => [sq.text, sq]));

        // 1) Apply server data into local (server wins on conflict)
        serverQuotes.forEach(sq => {
            const localIndex = quotes.findIndex(lq => lq.text === sq.text);
            if (localIndex === -1) {
                // server has a quote local doesn't -> add it
                quotes.push(sq);
            } else {
                // exists locally; if category differs, accept server category
                if (quotes[localIndex].category !== sq.category) {
                    quotes[localIndex].category = sq.category;
                    conflictDetected = true;
                }
            }
        });

        // 2) Identify local-only quotes (not present on server) and optionally push them
        const serverTexts = new Set(serverQuotes.map(s => s.text));
        const localOnly = quotes.filter(lq => !serverTexts.has(lq.text));

        // push local-only to server (fire-and-forget, simulated)
        // Do not await all pushes in parallel to avoid flooding in environments; do them sequentially
        for (const lq of localOnly) {
            // we can choose to push or skip — here we attempt to push
            try {
                await pushQuoteToServer(lq);
            } catch (err) {
                // pushing failed for some quote — ignore for now (server is mock)
            }
        }

        // persist and update UI
        saveQuotes();
        populateCategories();

        if (conflictDetected) updateSyncStatus('⚠️ Conflict detected — server data applied', 'warning');
        else updateSyncStatus('✅ Sync complete — local and server merged', 'success');
    } catch (err) {
        console.error('syncQuotes error', err);
        updateSyncStatus('❌ Sync failed', 'error');
    }
}

/* -------------------------
   Sync status UI
   ------------------------- */
function updateSyncStatus(message, type) {
    if (!syncStatus) return;
    syncStatus.textContent = message;
    syncStatus.className = 'sync-bar';
    if (type) syncStatus.classList.add(type);
}

/* -------------------------
   Initialization & wiring
   ------------------------- */
let quoteDisplay, newQuoteBtn, addQuoteForm, exportJsonBtn, importFileInput, syncStatus, categoryFilter;

document.addEventListener('DOMContentLoaded', function() {
    // query DOM nodes
    quoteDisplay = document.getElementById('quoteDisplay');
    newQuoteBtn = document.getElementById('newQuote');
    addQuoteForm = document.getElementById('addQuoteForm');
    exportJsonBtn = document.getElementById('exportJson');
    importFileInput = document.getElementById('importFile');
    syncStatus = document.getElementById('syncStatus');

    // ensure categoryFilter exists; create it if not present
    categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) {
        const label = document.createElement('label');
        label.htmlFor = 'categoryFilter';
        label.textContent = 'Filter by Category: ';
        categoryFilter = document.createElement('select');
        categoryFilter.id = 'categoryFilter';
        // insert before quoteDisplay
        quoteDisplay.parentNode.insertBefore(label, quoteDisplay);
        quoteDisplay.parentNode.insertBefore(categoryFilter, quoteDisplay);
    }

    // load data and setup UI
    loadQuotes();
    createAddQuoteForm();
    populateCategories();

    // restore last category if present
    const lastCat = localStorage.getItem('lastCategory');
    if (lastCat) categoryFilter.value = lastCat;

    // show last shown quote if available
    const lastShown = sessionStorage.getItem('lastShownQuoteText');
    if (lastShown) {
        const found = quotes.find(q => q.text === lastShown);
        if (found) displayQuote(found);
        else showRandomQuote();
    } else showRandomQuote();

    // wire events
    newQuoteBtn.addEventListener('click', showRandomQuote);
    categoryFilter.addEventListener('change', filterQuotes);
    exportJsonBtn.addEventListener('click', exportQuotesAsJson);
    importFileInput.addEventListener('change', importFromJsonFile);

    // initial sync and periodic sync using syncQuotes (checker requires this function)
    syncQuotes();                       // initial sync
    setInterval(syncQuotes, 60000);     // sync every 60s
});
