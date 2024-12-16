//  fetch JSON data  
async function fetchJSON(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    return response.json();
  }
  
  // Calculate distance using the weird formula kinda human made but tricky no need to learn it just understand it
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2); // Distance in km
  }
  
  // Fetch city coordinates with help of open source Nominatim API
  async function fetchCoordinates(city) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      city
    )}&format=json&limit=1`;
    const data = await fetchJSON(url);
    if (data.length === 0) {
      throw new Error("City not found");
    }
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  }
  
  // Fetch nearby places using open source Overpass API
  async function fetchNearbyPlaces(lat, lon, amenity) {
    const query = `
      [out:json];
      node["amenity"="${amenity}"](around:5000,${lat},${lon});
      out body;
    `;
    const url = "https://overpass-api.de/api/interpreter";
    const options = {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: query,
    };
    const data = await fetchJSON(url, options);
    return data.elements.map((element) => ({
      name: element.tags.name || "Unknown Name",
      address:
        element.tags["addr:full"] ||
        element.tags["addr:street"] ||
        "Address not available",
      distance: calculateDistance(lat, lon, element.lat, element.lon),
    }));
  }
  
  // Show results in a section
  function renderSection(title, items) {
    if (items.length === 0) {
      return `<h2>${title}</h2><p>No results found.</p>`;
    }
  
    const itemsHTML = items
      .map(
        (item) => `
          <div class="card">
            <h3>${item.name}</h3>
            <p>${item.address}</p>
            <p>Distance: ${item.distance} km</p>
          </div>
        `
      )
      .join("");
  
    return `
      <h2>${title}</h2>
      <div class="card-grid">${itemsHTML}</div>
    `;
  }
  
  // Search for locations
  async function searchLocations() {
    const city = document.getElementById("cityInput").value.trim();
    const loader = document.getElementById("loader");
    const resultsDiv = document.getElementById("results");
  
    if (!city) {
      alert("Please enter a city name.");
      return;
    }
  
    loader.classList.remove("hidden");
    resultsDiv.innerHTML = "";
  
    try {
      const { lat, lon } = await fetchCoordinates(city);
  
      const [restaurants, atms, theaters] = await Promise.all([
        fetchNearbyPlaces(lat, lon, "restaurant"),
        fetchNearbyPlaces(lat, lon, "atm"),
        fetchNearbyPlaces(lat, lon, "cinema"),
      ]);
  
      resultsDiv.innerHTML = `
        ${renderSection("Restaurants", restaurants)}
        ${renderSection("ATMs", atms)}
        ${renderSection("Movie Theaters", theaters)}
      `;
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to fetch data. Please try again.");
    } finally {
      loader.classList.add("hidden");
    }
  }
  
  // Button to search and kick to api with city query and replace it in api url so will work 
  document
    .getElementById("searchButton")
    .addEventListener("click", searchLocations);