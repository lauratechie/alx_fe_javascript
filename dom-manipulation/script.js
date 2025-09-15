// --- Sync Variables ---
const SERVER_URL = "https://jsonplaceholder.typicode.com/posts";
const syncStatus = document.getElementById("syncStatus");

// --- Fetch from Server ---
async function fetchFromServer() {
    try {
        const response = await fetch(SERVER_URL);
        if (!response.ok) throw new Error("Server error");
        const serverData = await response.json();

        // Convert server posts into quote format
        const serverQuotes = serverData.slice(0, 5).map(post => ({
            text: post.title,
            category: "Server"
        }));

        handleSync(serverQuotes);
    } catch (err) {
        console.error("Failed to fetch server data:", err);
        updateSyncStatus("⚠️ Could not sync with server", "error");
    }
}

// --- Push to Server (simulation) ---
async function pushToServer(newQuote) {
    try {
        const response = await fetch(SERVER_URL, {
            method: "POST",
            body: JSON.stringify(newQuote),
            headers: { "Content-Type": "application/json" }
        });
        if (!response.ok) throw new Error("Push failed");
        console.log("Pushed to server:", await response.json());
    } catch (err) {
        console.error("Error pushing to server:", err);
    }
}

// --- Sync Handler (conflict resolution) ---
function handleSync(serverQuotes) {
    let conflictDetected = false;

    // Compare local with server
    serverQuotes.forEach(serverQuote => {
        const match = quotes.find(q => q.text === serverQuote.text);
        if (!match) {
            quotes.push(serverQuote); // new server quote
        } else if (match.category !== serverQuote.category) {
            // Conflict → server wins
            match.category = serverQuote.category;
            conflictDetected = true;
        }
    });

    saveQuotes();
    populateCategories();

    if (conflictDetected) {
        updateSyncStatus("⚠️ Conflict detected, server data applied", "warning");
    } else {
        updateSyncStatus("✅ Data synced with server", "success");
    }
}

// --- Sync Status Display ---
function updateSyncStatus(message, type) {
    syncStatus.textContent = message;
    syncStatus.className = type; // CSS classes: success, warning, error
}

// --- Periodic Sync ---
setInterval(fetchFromServer, 60000); // every 60s
