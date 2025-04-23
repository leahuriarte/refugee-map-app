# Refugee Map Application

## Overview

This project is a web application that visualizes global refugee population data using an interactive map interface. It was developed for the US branch of the United Nations High Commissioner for Refugees (UNHCR) through Harvey Mudd's Code for Change program.

## Features

- Interactive world map showing refugee populations by country
- Color-coded visualization using UNHCR's blue color palette
- Year selection functionality (2000-2024)
- Top 10 refugee hosting countries table
- Country detail view with specific refugee statistics
- Responsive design for various screen sizes

## Technology Stack

- React 19 for the user interface
- Vite as the build tool and development server
- Leaflet/React-Leaflet for interactive mapping
- D3 for data visualization and scaling
- UNHCR Population API for refugee statistics data

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-username/refugee-map-app.git
cd refugee-map-app
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm run dev
```

4. Open your browser and navigate to http://localhost:5173

## Usage

- Use the year selector to view refugee data for different years
- Hover over countries to see tooltip information
- Click on countries to view detailed refugee statistics
- Refer to the table below the map for the top refugee hosting countries

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- UNHCR for providing the refugee population data API
- Harvey Mudd College Code for Change for organizing this project
- OpenStreetMap for providing map tiles
