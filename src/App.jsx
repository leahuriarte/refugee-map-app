import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Tooltip } from 'react-leaflet';
import { scaleQuantize } from 'd3-scale';
import _ from 'lodash';
import 'leaflet/dist/leaflet.css';

const App = () => {
  const [refugeeData, setRefugeeData] = useState([]);
  const [year, setYear] = useState(2022);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [worldGeoJSON, setWorldGeoJSON] = useState(null);
  const [maxRefugees, setMaxRefugees] = useState(1000000);

  // Color scale for the map
  const colorScale = scaleQuantize()
    .domain([0, maxRefugees])
    .range([
      "#e6f7ff", "#bae7ff", "#91d5ff", "#69c0ff", 
      "#40a9ff", "#1890ff", "#096dd9", "#0050b3", 
      "#003a8c", "#002766"
    ]);

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
    
    // construct the api url with query parameters
    const apiUrl = `https://api.unhcr.org/population/v1/population/?year=${year}&coa_all=true`;
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`api request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // process the api response
    const formattedData = data.items.map(item => ({
      coa: item.coa_iso,
      refugees: item.refugees || 0,
      year: item.year,
      country: item.coa_name
    })).filter(item => item.refugees > 0);
    
    setRefugeeData(formattedData);
    
    // find max for color scaling
    const max = Math.max(...formattedData.map(d => d.refugees));
    setMaxRefugees(max);
    
    setLoading(false);
  } catch (error) {
    console.error("Error fetching refugee data:", error);
    setError("Failed to load refugee data. Check console for details.");
    setLoading(false);
  }
};

    fetchData();
  }, [year]);

  // Style function for GeoJSON features
  const countryStyle = (feature) => {
    const countryName = feature.properties.name;
    const countryData = refugeeData.find(d => 
          d.country === countryName || 
          d.country.includes(countryName) || 
          countryName.includes(d.country)
        );
    
    return {
      fillColor: countryData ? colorScale(countryData.refugees) : '#F5F4F6',
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  };

  // Handle feature click events
  const onEachFeature = (feature, layer) => {
    const countryName = feature.properties.name;
    const countryData = refugeeData.find(d => d.country === countryName);
    
    if (countryData) {
      layer.bindTooltip(
        `<strong>${countryName}</strong><br>${countryData.refugees.toLocaleString()} refugees`,
        { permanent: false, sticky: true }
      );
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

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-100 p-4">
      <header className="w-full max-w-6xl">
        <h1 className="text-3xl font-bold text-center my-4 text-blue-800">Global Refugee Population Map</h1>
        <p className="text-center text-gray-600 mb-6">
          visualization of refugee populations hosted by countries around the world
        </p>
      </header>

      <div className="w-full max-w-6xl bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <label htmlFor="year" className="mr-2 font-medium">year:</label>
            <select 
              id="year" 
              value={year} 
              onChange={handleYearChange}
              className="p-2 border rounded"
            >
              <option value="2022">2022</option>
              <option value="2021">2021</option>
              <option value="2020">2020</option>
              <option value="2019">2019</option>
              <option value="2018">2018</option>
            </select>
          </div>
          <div className="flex items-center">
            <span className="text-xs font-medium mr-2">fewer</span>
            <div className="flex h-4 w-40">
              {colorScale.range().map((color, i) => (
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
            <span className="text-xs font-medium ml-2">more refugees</span>
          </div>
        </div>

        {loading || !worldGeoJSON ? (
          <div className="flex justify-center items-center h-96">
            <p>loading map data...</p>
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-96">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <div style={{ height: "500px", width: "100%" }}>
            <MapContainer 
              center={[20, 0]} 
              zoom={2} 
              style={{ height: "100%", width: "100%" }}
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
              />
            </MapContainer>
          </div>
        )}
      </div>

      <div className="w-full max-w-6xl bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">top refugee hosting countries</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-blue-100">
                <th className="px-4 py-2 text-left">country</th>
                <th className="px-4 py-2 text-right">refugee population</th>
              </tr>
            </thead>
            <tbody>
              {_.orderBy(refugeeData, ['refugees'], ['desc']).slice(0, 10).map((country) => (
                <tr key={country.coa} className="border-b border-gray-200">
                  <td className="px-4 py-2">{country.country}</td>
                  <td className="px-4 py-2 text-right">{country.refugees.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="w-full max-w-6xl text-center text-gray-500 text-sm py-4">
        <p>data source: UN refugee statistics api (UNHCR)</p>
        <p className="mt-1">note: this visualization uses mock data for demonstration. in production, connect to the actual UNHCR api.</p>
      </footer>
    </div>
  );
};

export default App;