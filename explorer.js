// Debug version of explorer.js
console.log('Explorer.js loaded');

// Check if D3 is available
if (typeof d3 === 'undefined') {
  console.error('D3.js is not loaded!');
} else {
  console.log('D3.js version:', d3.version);
}

// Simple test visualization
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, starting visualization...');
  
  // Test 1: Create a simple circle
  const testContainer = document.getElementById('country-chart');
  if (testContainer) {
    console.log('Found country-chart container');
    
    const svg = d3.select(testContainer)
      .append('svg')
      .attr('width', 200)
      .attr('height', 200)
      .style('background', '#f0f0f0');
    
    svg.append('circle')
      .attr('cx', 100)
      .attr('cy', 100)
      .attr('r', 50)
      .style('fill', 'blue');
    
    svg.append('text')
      .attr('x', 100)
      .attr('y', 100)
      .attr('text-anchor', 'middle')
      .style('fill', 'white')
      .text('D3 Works!');
    
    console.log('Test circle created');
  } else {
    console.error('Could not find country-chart container');
  }
  
  // Test 2: Try to load the data
  fetch('artfictions_novels.json')
    .then(response => {
      console.log('Data fetch response:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('Data loaded successfully');
      console.log('Data type:', typeof data);
      console.log('Data keys:', Object.keys(data));
      
      const novels = Array.isArray(data) ? data : data.Novels || [];
      console.log('Number of novels:', novels.length);
      
      if (novels.length > 0) {
        console.log('First novel:', novels[0]);
      }
    })
    .catch(error => {
      console.error('Error loading data:', error);
    });
});