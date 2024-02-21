let books = [];

// Load books from JSON file on window load
window.onload = function() {
    fetch('books.json') // Adjust the path to your actual JSON file if needed
    .then(response => response.json())
    .then(data => {
        books = data; // Populate the books array with the fetched data
    })
    .catch(error => console.error('Error loading books:', error));
};

// Function to search books based on the search term
function searchBooks() {
    const searchTitle = document.getElementById('searchTitle').value.toLowerCase();
    const searchAuthor = document.getElementById('searchAuthor').value.toLowerCase();
    const searchCountry = document.getElementById('searchCountry').value.toLowerCase();
    const searchLanguage = document.getElementById('searchLanguage').value.toLowerCase();
    const searchYear = document.getElementById('searchYear').value.toLowerCase();
    const searchThemes = document.getElementById('searchThemes').value.toLowerCase();

    const filteredBooks = books.filter(book => 
        (searchTitle ? book.Title?.toLowerCase().includes(searchTitle) : true) &&
        (searchAuthor ? book.Author?.toLowerCase().includes(searchAuthor) : true) &&
        (searchCountry ? book.Country?.toLowerCase().includes(searchCountry) : true) &&
        (searchLanguage ? book.Language?.toLowerCase().includes(searchLanguage) : true) &&
        (searchYear ? book['Year of Publication']?.toString().includes(searchYear) : true) &&
        (searchThemes ? book.Themes?.some(theme => theme?.toLowerCase().includes(searchThemes)) : true)
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
