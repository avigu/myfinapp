# MyFinApp

A modern financial platform that highlights S&P 500 & NASDAQ investment opportunities based on recent earnings reports. Features a classic server-side rendered web UI, a modern React client, and a native mobile app.

## Platforms Available
- **🖥️ Web App**: Classic server-side rendered UI and modern React client
- **📱 Mobile App**: Native iOS and Android app built with React Native

## Features
- **Multiple Interface Options:**
  - 🖥️ Classic server-side rendered UI at `/` 
  - ⚛️ Modern React client at `/app`
  - 📱 Native mobile app in `/mobileapp` directory
- Lists top 5 S&P 500/NASDAQ gainers and losers after earnings
- Real-time earnings calendar with upcoming reports
- Mobile responsive design with modern UI components
- Date selector to view historical earnings
- Interactive tabs for different data views
- Summary statistics and market insights
- PWA support for mobile installation

## Quick Start

### Web Application
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

### Mobile App
1. Navigate to the mobile app directory:
   ```sh
   cd mobileapp
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the mobile app:
   ```sh
   npm start
   ```
4. Use Expo Go app on your device to scan the QR code, or run in simulator:
   ```sh
   npm run ios    # iOS simulator
   npm run android # Android emulator
   ```

For detailed mobile app setup instructions, see [mobileapp/README.md](./mobileapp/README.md).

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
├── client/               # React web application
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
├── mobileapp/            # React Native mobile application
│   ├── App.js           # Main mobile app component
│   ├── src/
│   │   ├── components/   # Mobile components
│   │   ├── screens/      # App screens
│   │   ├── services/     # API services
│   │   └── constants/    # Design system
│   └── README.md        # Mobile app documentation
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
- **Web Frontend**: React 18, Modern ES6+
- **Mobile Frontend**: React Native with Expo
- **Build**: Webpack, Babel
- **Styling**: Modern CSS with CSS Variables, React Native StyleSheet
- **Data Sources**: Yahoo Finance, Finnhub API
- **Caching**: Google Cloud Storage

## License
ISC 