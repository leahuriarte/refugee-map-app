import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { scaleQuantize } from 'd3-scale';
import _ from 'lodash';
import 'leaflet/dist/leaflet.css';
import './App.css';

const App = () => {
  const [refugeeData, setRefugeeData] = useState([]);
  const [year, setYear] = useState(2024);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [worldGeoJSON, setWorldGeoJSON] = useState(null);
  const [maxRefugees, setMaxRefugees] = useState(1000000);
  const [dataSource, setDataSource] = useState('api');
  const [selectedCountry, setSelectedCountry] = useState(null);

  // UNHCR blue color palette
  const blueColors = [
    "#e6f2fa", "#cce5f5", "#b3d9f0", "#99cceb", 
    "#80bfe6", "#0072bc", "#005b96", "#004570", 
    "#002f4d", "#001a2a"
  ];

  // Color scale for the map
  const colorScale = scaleQuantize()
    .domain([0, maxRefugees])
    .range(blueColors);

  // Load the world GeoJSON data
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
      .then(response => response.json())
      .then(data => {
        setWorldGeoJSON(data);
      })
      .catch(error => {
        console.error('Error loading GeoJSON:', error);
        setError('Failed to load map data');
      });
  }, []);

  // Load refugee data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Construct the API URL with query parameters
        const apiUrl = `https://api.unhcr.org/population/v1/population/?year=${year}&coa_all=true`;
        
        const response = await fetch(apiUrl, { 
          signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Process the API response
        const formattedData = data.items.map(item => ({
          coa: item.coa_iso,
          refugees: item.refugees || 0,
          year: item.year,
          country: item.coa_name
        })).filter(item => item.refugees > 0);
        
        if (formattedData.length === 0) {
          throw new Error("No refugee data returned from API");
        }
        
        setRefugeeData(formattedData);
        setDataSource('api');
        
        // Find max for color scaling
        const max = Math.max(...formattedData.map(d => d.refugees));
        setMaxRefugees(max);
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching refugee data:", error);
        
        setRefugeeData([]);
        setDataSource('none');
        setMaxRefugees(0);
        
        setError("Couldn't load refugee data from UNHCR API");
        setLoading(false);
      }
    };

    fetchData();
  }, [year]);

// Fixed countryStyle function
const countryStyle = (feature) => {
  const countryCode = feature.properties.iso_a3;
  const countryName = feature.properties.name;
  
  // Try to match by ISO code first, then by name with special cases
  const countryData = refugeeData.find(d => 
    d.coa === countryCode || 
    d.country === countryName || 
    d.country.includes(countryName) || 
    countryName.includes(d.country) ||
    // Special case for Turkey/Türkiye/Turkiye
    (countryName === "Turkey" && (d.country === "Türkiye" || d.country === "Turkiye")) ||
    (countryName === "Türkiye" && (d.country === "Turkey" || d.country === "Turkiye")) ||
    (countryName === "Turkiye" && (d.country === "Turkey" || d.country === "Türkiye"))
  );
  
  // Only consider a country selected if both countryData exists and its coa matches selectedCountry
  const isSelected = countryData && selectedCountry && countryData.coa === selectedCountry.coa;
  
  return {
    fillColor: countryData ? colorScale(countryData.refugees) : '#F5F4F6',
    weight: isSelected ? 2 : 1,
    opacity: 1,
    color: isSelected ? '#FFC904' : 'white',
    fillOpacity: isSelected ? 0.9 : 0.7
  };
};

  // Handle feature click events
  const onEachFeature = (feature, layer) => {
    const countryCode = feature.properties.iso_a3;
    const countryName = feature.properties.name;
    
    // Try to match by ISO code first, then by name with special cases
    const countryData = refugeeData.find(d => 
      d.coa === countryCode || 
      d.country === countryName || 
      d.country.includes(countryName) || 
      countryName.includes(d.country) ||
      // Special case for Turkey/Türkiye/Turkiye
      (countryName === "Turkey" && (d.country === "Türkiye" || d.country === "Turkiye")) ||
      (countryName === "Türkiye" && (d.country === "Turkey" || d.country === "Turkiye")) ||
      (countryName === "Turkiye" && (d.country === "Turkey" || d.country === "Türkiye"))
    );
    
    if (countryData) {
      layer.bindTooltip(
        `<strong>${countryName}</strong><br>${countryData.refugees.toLocaleString()} refugees`,
        { permanent: false, sticky: true }
      );
      
      layer.on({
        click: () => {
          setSelectedCountry(countryData);
        }
      });
    } else {
      layer.bindTooltip(
        `<strong>${countryName}</strong><br>No data available`,
        { permanent: false, sticky: true }
      );
    }
  };

  // Handle year change
  const handleYearChange = (e) => {
    setYear(parseInt(e.target.value));
  };

  // Generate year options (from 2000 to current year)
  const yearOptions = [];
  for (let y = 2024; y >= 2000; y--) {
    yearOptions.push(
      <option key={y} value={y}>{y}</option>
    );
  }

  return (
    <div className="refugee-app">
      <header className="app-header">
        <div className="header-container">
          <div className="logo-container">
            <img 
              src="https://www.unhcr.org/assets/img/logo/unhcr-logo-horizontal.svg" 
              alt="UNHCR Logo" 
              className="unhcr-logo" 
            />
          </div>
          <div className="title-container">
            <h1>Global Refugee Population Map</h1>
            <p className="subtitle">Visualization of refugee populations hosted by countries around the world</p>
          </div>
        </div>
      </header>

      <main className="app-content">
        <div className="map-container">
          <div className="control-panel">
            <div className="year-selector">
              <label htmlFor="year">Select Year:</label>
              <select 
                id="year" 
                value={year} 
                onChange={handleYearChange}
              >
                {yearOptions}
              </select>
            </div>
            
            <div className="legend">
              <span className="legend-label">Fewer</span>
              <div className="color-scale">
                {blueColors.map((color, i) => (
                  <div
                    key={i}
                    style={{
                      backgroundColor: color,
                      width: "100%",
                      height: "100%"
                    }}
                  />
                ))}
              </div>
              <span className="legend-label">More refugees</span>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}

          {loading || !worldGeoJSON ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading map data...</p>
            </div>
          ) : (
            <div className="map-wrapper">
              <MapContainer 
                center={[20, 0]} 
                zoom={2} 
                minZoom={2}
                maxBounds={[[-90, -180], [90, 180]]}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <GeoJSON 
                  data={worldGeoJSON}
                  style={countryStyle}
                  onEachFeature={onEachFeature}
                  key={selectedCountry?.coa || 'default'} // Force re-render when selection changes
                />
              </MapContainer>
            </div>
          )}
        </div>

        {selectedCountry && (
          <div className="country-detail">
            <h2>{selectedCountry.country}</h2>
            <p className="refugee-count">{selectedCountry.refugees.toLocaleString()} refugees</p>
            <button className="close-button" onClick={() => setSelectedCountry(null)}>×</button>
          </div>
        )}

        <div className="data-table">
          <h2>Top Refugee Hosting Countries ({year})</h2>
          
          <table>
            <thead>
              <tr>
                <th className="rank-column">Rank</th>
                <th className="country-column">Country</th>
                <th className="population-column">Refugee Population</th>
              </tr>
            </thead>
            <tbody>
              {_.orderBy(refugeeData, ['refugees'], ['desc']).slice(0, 10).map((country, index) => (
                <tr 
                  key={country.coa}
                  className={selectedCountry?.coa === country.coa ? 'selected-row' : ''}
                  onClick={() => setSelectedCountry(country)}
                >
                  <td className="rank-column">{index + 1}</td>
                  <td className="country-column">{country.country}</td>
                  <td className="population-column">{country.refugees.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p className="data-source">Data source: {dataSource === 'api' ? 'UN Refugee Statistics API (UNHCR)' : 'No data available'}</p>
          {dataSource === 'none' && (
            <p className="note">Note: Failed to load data from UNHCR API.</p>
          )}
          <div className="footer-links">
            <a href="https://www.unhcr.org/refugee-statistics/" target="_blank" rel="noopener noreferrer">UNHCR Refugee Statistics</a>
            <a href="https://www.unhcr.org/" target="_blank" rel="noopener noreferrer">UNHCR Official Website</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;