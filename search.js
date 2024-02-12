let books = [];

window.onload = function() {
    fetch('books.json')
    .then(response => response.json())
    .then(data => {
        books = data;
    })
    .catch(error => console.error('Error loading books:', error));
};

function searchBooks() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    
    if (!searchTerm) {
        document.getElementById('results').innerHTML = '';
        return;
    }

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

function displayResults(filteredBooks) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = ''; // This line is key to clearing previous results

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
