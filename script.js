// script.js

// Array to store quotes
let quotes = [
    { text: "The journey of a thousand miles begins with one step.", category: "Motivation" },
    { text: "Life is what happens when you're busy making other plans.", category: "Life" },
    { text: "You miss 100% of the shots you don’t take.", category: "Inspiration" }
];

// Select DOM elements
const quoteDisplay = document.getElementById('quoteDisplay');
const newQuoteButton = document.getElementById('newQuote');

// Function to display a random quote
function showRandomQuote() {
    if (quotes.length === 0) {
        quoteDisplay.textContent = "No quotes available.";
        return;
    }
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const quote = quotes[randomIndex];

    // Clear previous content
    quoteDisplay.innerHTML = '';

    // Create DOM elements for quote text and category
    const quoteText = document.createElement('p');
    quoteText.textContent = `"${quote.text}"`;

    const quoteCategory = document.createElement('small');
    quoteCategory.textContent = `Category: ${quote.category}`;

    // Append to quote display
    quoteDisplay.appendChild(quoteText);
    quoteDisplay.appendChild(quoteCategory);
}

// Function to create form dynamically for adding a new quote
function createAddQuoteForm() {
    const formContainer = document.createElement('div');

    // Input for quote text
    const quoteInput = document.createElement('input');
    quoteInput.id = 'newQuoteText';
    quoteInput.type = 'text';
    quoteInput.placeholder = 'Enter a new quote';

    // Input for category
    const categoryInput = document.createElement('input');
    categoryInput.id = 'newQuoteCategory';
    categoryInput.type = 'text';
    categoryInput.placeholder = 'Enter quote category';

    // Button to add quote
    const addButton = document.createElement('button');
    addButton.textContent = 'Add Quote';
    addButton.onclick = addQuote;

    // Append inputs and button to form container
    formContainer.appendChild(quoteInput);
    formContainer.appendChild(categoryInput);
    formContainer.appendChild(addButton);

    // Append form container to body
    document.body.appendChild(formContainer);
}

// Function to add a new quote to the array and display
function addQuote() {
    const quoteInput = document.getElementById('newQuoteText');
    const categoryInput = document.getElementById('newQuoteCategory');

    const newQuoteText = quoteInput.value.trim();
    const newCategory = categoryInput.value.trim();

    if (newQuoteText === "" || newCategory === "") {
        alert("Please enter both quote text and category.");
        return;
    }

    // Add new quote to array
    quotes.push({ text: newQuoteText, category: newCategory });

    // Clear inputs
    quoteInput.value = '';
    categoryInput.value = '';

    // Show the newly added quote
    showRandomQuote();
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    createAddQuoteForm();
    showRandomQuote();
    newQuoteButton.addEventListener('click', showRandomQuote);
});
