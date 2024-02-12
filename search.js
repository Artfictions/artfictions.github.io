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
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    
    console.log(`Search Term: ${searchTerm}`); // Debugging line to see the search term

    // Clear the results if the search term is empty or too short
    if (!searchTerm || searchTerm.length < 3) {
        document.getElementById('results').innerHTML = 'Please enter at least 3 characters to search.';
        return; // Exit the function early
    }

    const filteredBooks = books.filter(book => 
        book.Title?.toLowerCase().includes(searchTerm) ||
        book.Author?.toLowerCase().includes(searchTerm) ||
        book.Country?.toLowerCase().includes(searchTerm) ||
        book.Language?.toLowerCase().includes(searchTerm) ||
        book['Year of Publication']?.toString().includes(searchTerm) ||
        book.Themes?.some(theme => theme?.toLowerCase().includes(searchTerm))
    );

    console.log(filteredBooks); // Debugging line to see filtered results

    if (filteredBooks.length > 0) {
        displayResults(filteredBooks);
    } else {
        document.getElementById('results').innerHTML = 'No results found.';
    }
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
