// Define an empty array to hold the books data
let books = [];

// Load books from JSON file on window load
window.onload = function() {
    fetch('books.json') // Make sure the path to your JSON file is correct
    .then(response => response.json())
    .then(data => {
        books = data; // Populate the books array with the fetched data
    })
    .catch(error => console.error('Error loading books:', error));
};

// Function to search books based on the search term
function searchBooks() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    const filteredBooks = books.filter(book => 
        book.Title?.toLowerCase().includes(searchTerm) ||
        book.Author?.toLowerCase().includes(searchTerm) ||
        book.Country?.toLowerCase().includes(searchTerm) ||
        book.Language?.toLowerCase().includes(searchTerm) ||
        book['Year of Publication']?.toString().includes(searchTerm) ||
        book.Themes?.some(theme => theme?.toLowerCase().includes(searchTerm))
    );

    displayResults(filteredBooks);
}

// Function to display search results
function displayResults(filteredBooks) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = ''; // Clear previous results

    filteredBooks.forEach(book => {
        const element = document.createElement('div');
        element.innerHTML = `<h2>${book.Title}</h2>
                             <p>Author: ${book.Author}</p>
                             <p>Country: ${book.Country}</p>
                             <p>Language: ${book.Language}</p>
                             <p>Year of Publication: ${book['Year of Publication']}</p>
                             <p>Themes: ${book.Themes.join(', ')}</p>`;
        resultsContainer.appendChild(element);
    });
}
