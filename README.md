# MyFinApp

A modern financial web app that highlights S&P 500 & NASDAQ investment opportunities based on recent earnings reports. Features both a classic server-side rendered UI and a modern React client with beautiful, responsive design.

## Features
- **Dual Interface Options:**
  - 🖥️ Classic server-side rendered UI at `/` 
  - ⚛️ Modern React client at `/app`
- Lists top 5 S&P 500/NASDAQ gainers and losers after earnings
- Real-time earnings calendar with upcoming reports
- Mobile responsive design with modern UI components
- Date selector to view historical earnings
- Interactive tabs for different data views
- Summary statistics and market insights
- PWA support for mobile installation

## Quick Start
1. Clone the repository:
   ```sh
   git clone https://github.com/avigu/myfinapp.git
   cd myfinapp
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Build the React client:
   ```sh
   npm run build
   ```
4. Create a `.env` file with your Finnhub API key (optional, a default is provided):
   ```env
   FINNHUB_API_KEY=your_finnhub_api_key
   ```
5. Start the server:
   ```sh
   npm start
   ```
6. Access the app:
   - **Classic UI**: [http://localhost:3000](http://localhost:3000)
   - **React Client**: [http://localhost:3000/app](http://localhost:3000/app)

## Development
For development with hot reload:
```sh
npm run dev
```
This will start the server with nodemon and build the React client in watch mode.

## Project Structure
```
myfinapp/
├── server.js              # Express server
├── routes/
│   └── index.js           # API routes (serves both HTML and JSON)
├── services/
│   └── opportunities.js   # Business logic for fetching financial data
├── utils/
│   ├── cache.js          # Caching utilities
│   └── render.js         # Server-side HTML rendering
├── client/               # React application
│   ├── src/
│   │   ├── App.js        # Main React component
│   │   ├── index.js      # React entry point
│   │   ├── components/   # React components
│   │   │   ├── StockCard.js
│   │   │   ├── IndexSelector.js
│   │   │   ├── DateSelector.js
│   │   │   ├── EarningsCalendar.js
│   │   │   └── LoadingSpinner.js
│   │   └── styles/
│   │       └── App.css   # Modern CSS styles
├── public/
│   ├── app.html          # React app entry point
│   ├── js/               # Built React bundle
│   └── manifest.json     # PWA manifest
└── webpack.config.js     # Build configuration
```

## API Endpoints
- `GET /` - S&P 500 data (HTML or JSON based on Accept header)
- `GET /nasdaq` - NASDAQ data (HTML or JSON based on Accept header)
- `GET /app` - React client application

## Technologies
- **Backend**: Node.js, Express
- **Frontend**: React 18, Modern ES6+
- **Build**: Webpack, Babel
- **Styling**: Modern CSS with CSS Variables
- **Data Sources**: Yahoo Finance, Finnhub API
- **Caching**: Google Cloud Storage

## License
ISC 