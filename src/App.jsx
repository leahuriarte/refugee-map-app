import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Popup } from 'react-leaflet';
import { scaleQuantize } from 'd3-scale';
import _ from 'lodash';

const DemographicChart = ({ data }) => {
  if (!data || !data.length) return <p>No demographic data available</p>;
  
  // Process demographic data
  const femaleData = data.find(d => d.sex === "F") || {};
  const maleData = data.find(d => d.sex === "M") || {};
  
  const ageGroups = [
    '0-4', '5-11', '12-17', '18-59', '60+'
  ];
  
  const maxValue = Math.max(
    ...Object.values(femaleData).filter(v => typeof v === 'number'),
    ...Object.values(maleData).filter(v => typeof v === 'number')
  );

  return (
    <div className="demographic-chart">
      <div className="chart-container">
        {ageGroups.map(group => (
          <div key={group} className="age-group">
            {/* Female bar */}
            <div className="bar-container female">
              <div 
                className="bar" 
                style={{ 
                  width: `${((femaleData[group] || 0) / maxValue) * 100}%`,
                  backgroundColor: '#ff9ecd'
                }}
              />
              <span className="value">{femaleData[group]?.toLocaleString() || 0}</span>
            </div>
            
            {/* Age label */}
            <div className="age-label">{group}</div>
            
            {/* Male bar */}
            <div className="bar-container male">
              <div 
                className="bar" 
                style={{ 
                  width: `${((maleData[group] || 0) / maxValue) * 100}%`,
                  backgroundColor: '#89cff0'
                }}
              />
              <span className="value">{maleData[group]?.toLocaleString() || 0}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="legend">
        <div className="legend-item">
          <div className="color-box" style={{ backgroundColor: '#ff9ecd' }}></div>
          <span>Female</span>
        </div>
        <div className="legend-item">
          <div className="color-box" style={{ backgroundColor: '#89cff0' }}></div>
          <span>Male</span>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [hostData, setHostData] = useState([]);
  const [originData, setOriginData] = useState([]);
  const [year, setYear] = useState(2024);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [worldGeoJSON, setWorldGeoJSON] = useState(null);
  const [maxRefugees, setMaxRefugees] = useState(1000000);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [demographicData, setDemographicData] = useState(null);
  const [loadingDemographics, setLoadingDemographics] = useState(false);

  const colorScale = scaleQuantize()
    .domain([0, maxRefugees])
    .range([
      "#e6f7ff", "#bae7ff", "#91d5ff", "#69c0ff", 
      "#40a9ff", "#1890ff", "#096dd9", "#0050b3", 
      "#003a8c", "#002766"
    ]);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const hostResponse = await fetch(
          `https://api.unhcr.org/population/v1/population/?year=${year}&coa_all=true`,
          { signal: AbortSignal.timeout(5000) }
        );
        
        const originResponse = await fetch(
          `https://api.unhcr.org/population/v1/population/?year=${year}&coo_all=true`,
          { signal: AbortSignal.timeout(5000) }
        );
        
        if (!hostResponse.ok || !originResponse.ok) {
          throw new Error(`API request failed`);
        }
        
        const hostData = await hostResponse.json();
        const originData = await originResponse.json();
        
        const formattedHostData = hostData.items.map(item => ({
          code: item.coa_iso,
          refugees: item.refugees || 0,
          year: item.year,
          country: item.coa_name
        })).filter(item => item.refugees > 0);
        
        const formattedOriginData = originData.items.map(item => ({
          code: item.coo_iso,
          refugees: item.refugees || 0,
          year: item.year,
          country: item.coo_name
        })).filter(item => item.refugees > 0);
        
        setHostData(formattedHostData);
        setOriginData(formattedOriginData);
        
        const maxHost = Math.max(...formattedHostData.map(d => d.refugees));
        const maxOrigin = Math.max(...formattedOriginData.map(d => d.refugees));
        setMaxRefugees(Math.max(maxHost, maxOrigin));
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching refugee data:", error);
        setHostData([]);
        setOriginData([]);
        setMaxRefugees(0);
        setError("couldn't load refugee data from UNHCR API");
        setLoading(false);
      }
    };

    fetchData();
  }, [year]);
 
  const fetchDemographics = async (countryCode, countryName) => {
    try {
      setLoadingDemographics(true);
      const response = await fetch(
        `https://api.unhcr.org/population/v1/demographics/?year=${year}&coo=${countryCode}`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch demographic data');
      }

      const data = await response.json();
      
      // Process the demographic data
      const processedData = data.items.map(item => ([
        // Female data
        {
          sex: "F",
          '0-4': item.f_0_4,
          '5-11': item.f_5_11,
          '12-17': item.f_12_17,
          '18-59': item.f_18_59,
          '60+': item.f_60
        },
        // Male data
        {
          sex: "M",
          '0-4': item.m_0_4,
          '5-11': item.m_5_11,
          '12-17': item.m_12_17,
          '18-59': item.m_18_59,
          '60+': item.m_60
        }
      ])).flat();

      setDemographicData({
        data: processedData,
        country: countryName,
        total: data.totalRows
      });
    } catch (error) {
      console.error('Error fetching demographic data:', error);
      setDemographicData({
        data: [],
        country: countryName,
        error: 'Failed to load demographic data'
      });
    } finally {
      setLoadingDemographics(false);
    }
  };

  const getCountryStyle = (dataset) => (feature) => {
    const countryCode = feature.properties.iso_a3;
    const countryName = feature.properties.name;
    
    const countryData = dataset.find(d => 
      d.code === countryCode || 
      d.country === countryName || 
      d.country.includes(countryName) || 
      countryName.includes(d.country) ||
      (countryName === "Turkey" && (d.country === "Türkiye" || d.country === "Turkiye")) ||
      (countryName === "Türkiye" && (d.country === "Turkey" || d.country === "Turkiye")) ||
      (countryName === "Turkiye" && (d.country === "Turkey" || d.country === "Türkiye"))
    );
    
    return {
      fillColor: countryData ? colorScale(countryData.refugees) : '#F5F4F6',
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.7
    };
  };

  const getOnEachFeature = (dataset, type) => (feature, layer) => {
    const countryCode = feature.properties.iso_a3;
    const countryName = feature.properties.name;
    
    const countryData = dataset.find(d => 
      d.code === countryCode || 
      d.country === countryName || 
      d.country.includes(countryName) || 
      countryName.includes(d.country) ||
      (countryName === "Turkey" && (d.country === "Türkiye" || d.country === "Turkiye")) ||
      (countryName === "Türkiye" && (d.country === "Turkey" || d.country === "Turkiye")) ||
      (countryName === "Turkiye" && (d.country === "Turkey" || d.country === "Türkiye"))
    );
    
    if (type === "refugees originating") {
      layer.on('click', (e) => {
        if (countryData) {
          setSelectedCountry({ 
            ...countryData, 
            name: countryName,
            position: [e.latlng.lat, e.latlng.lng] // Store click position
          });
          fetchDemographics(countryData.code, countryName);
        }
      });
    }
    
    const tooltipContent = countryData
      ? `<strong>${countryName}</strong><br>${countryData.refugees.toLocaleString()} ${type}`
      : `<strong>${countryName}</strong><br>No data available`;
    
    layer.bindTooltip(tooltipContent, { permanent: false, sticky: true });
  };

  return (
    <div className="app-container">
      <header className="header">
        <img src="/UNHCR-Logo.png" alt="UNHCR Logo" className="logo" />
        <h1>Global Refugee Population Maps</h1>
        <p>Visualization of refugee populations by host and origin countries</p>
      </header>

      <div className="year-selector">
        <label htmlFor="year">Year: </label>
        <select 
          id="year" 
          value={year} 
          onChange={(e) => setYear(parseInt(e.target.value))}
        >
          <option value="2024">2024</option>
          <option value="2023">2023</option>
          <option value="2022">2022</option>
          <option value="2021">2021</option>
          <option value="2020">2020</option>
        </select>

        <div className="legend">
          <span>Fewer</span>
          <div className="color-scale">
            {colorScale.range().map((color, i) => (
              <div
                key={i}
                className="color-box"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span>More refugees</span>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {loading || !worldGeoJSON ? (
        <div className="loading">
          <p>Loading map data...</p>
        </div>
      ) : (
        <div className="maps-grid">
        <div className="map-container">
          <h2>Refugee Host Countries</h2>
          <div className="map">
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
                style={getCountryStyle(hostData)}
                onEachFeature={getOnEachFeature(hostData, "refugees hosted")}
              />
            </MapContainer>
          </div>
        </div>
        
        <div className="map-container">
          <h2>Refugee Origin Countries</h2>
          <div className="map">
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
                style={getCountryStyle(originData)}
                onEachFeature={getOnEachFeature(originData, "refugees originating")}
              />
              {selectedCountry && demographicData && (
                <Popup
                position={selectedCountry.position}
                  onClose={() => {
                    setSelectedCountry(null);
                    setDemographicData(null);
                  }}
                  className="demographic-popup"
                >
                  <div>
                    <h3>{demographicData.country} Refugee Demographics</h3>
                    {loadingDemographics ? (
                      <p>Loading demographic data...</p>
                    ) : demographicData.error ? (
                      <p>{demographicData.error}</p>
                    ) : (
                      <DemographicChart data={demographicData.data} />
                    )}
                  </div>
                </Popup>
              )}
            </MapContainer>
          </div>
        </div>
      </div>
      )}

      <div className="tables-grid">
        <div className="table-container">
          <h2>Top Refugee Hosting Countries ({year})</h2>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Country</th>
                <th>Refugee Population</th>
              </tr>
            </thead>
            <tbody>
              {_.orderBy(hostData, ['refugees'], ['desc'])
                .slice(0, 10)
                .map((country, index) => (
                  <tr key={country.code}>
                    <td>{index + 1}</td>
                    <td>{country.country}</td>
                    <td>{country.refugees.toLocaleString()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="table-container">
          <h2>Top Refugee Origin Countries ({year})</h2>
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Country</th>
                <th>Refugees Originating</th>
              </tr>
            </thead>
            <tbody>
              {_.orderBy(originData, ['refugees'], ['desc'])
                .slice(0, 10)
                .map((country, index) => (
                  <tr key={country.code}>
                    <td>{index + 1}</td>
                    <td>{country.country}</td>
                    <td>{country.refugees.toLocaleString()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="footer">
        <p>Data source: UN refugee statistics API (UNHCR)</p>
        {error && (
          <p className="error-note">Note: Failed to load data from UNHCR API.</p>
        )}
      </footer>
    </div>
  );
};

export default App;