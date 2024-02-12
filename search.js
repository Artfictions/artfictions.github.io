let books = []; // This should be at the top of the file

window.onload = function() {
    fetch('books.json')
    .then(response => response.json())
    .then(data => {
        books = data; // This populates the 'books' array with data from the JSON file
    })
    .catch(error => console.error('Error loading books:', error));
};

function searchBooks() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    const filteredBooks = books.filter(book => book.Title.toLowerCase().includes(searchTerm));

    displayResults(filteredBooks);
}

function displayResults(filteredBooks) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = ''; // Clear previous results

    filteredBooks.forEach(book => {
        const element = document.createElement('div');
        element.innerHTML = `<h2>${book.Title}</h2>
                             <p>Author: ${book.Author}</p>
                             <p>Year: ${book.Year}</p>
                             <p>Themes: ${book.Themes.join(', ')}</p>`;
        resultsContainer.appendChild(element);
    });
}
