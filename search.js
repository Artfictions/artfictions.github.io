let books = [];

window.onload = function() {
    fetch('artfictions-novels.json') // Updated to match your file name
    .then(response => response.json())
    .then(data => {
        books = data;
    })
    .catch(error => {
        console.error('Error fetching the books:', error);
    });
};

function searchBooks() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    const filteredBooks = books.filter(book => {
        return book.Title.toLowerCase().includes(searchTerm) ||
               book.Author.toLowerCase().includes(searchTerm) ||
               book.Themes.some(theme => theme.toLowerCase().includes(searchTerm));
    });
    displayResults(filteredBooks);
}

function displayResults(books) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = ''; // Clear previous results

    books.forEach(book => {
        const element = document.createElement('div');
        element.classList.add('book');
        element.innerHTML = `<h2>${book.Title}</h2>
                             <p>Author: ${book.Author}</p>
                             <p>Country: ${book.Country}</p>
                             <p>Language: ${book.Language}</p>
                             <p>Year of Publication: ${book['Year of Publication']}</p>
                             <p>Themes: ${book.Themes.join(', ')}</p>`;
        resultsContainer.appendChild(element);
    });
}
