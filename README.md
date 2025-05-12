# MyFinApp

A web app that highlights S&P 500 investment opportunities based on recent earnings reports. Features a mobile-friendly UI, date selector, and summary statistics.

## Features
- Lists top 5 S&P 500 gainers and losers after earnings
- Mobile responsive design
- Date selector to view historical earnings
- Summary of how many S&P 500 stocks had earnings in the selected period
- Refresh button and loading indication

## Setup
1. Clone the repository:
   ```sh
   git clone https://github.com/avigu/myfinapp.git
   cd myfinapp
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file with your Finnhub API key (optional, a default is provided):
   ```env
   FINNHUB_API_KEY=your_finnhub_api_key
   ```
4. Start the server:
   ```sh
   npm start
   ```
5. Open your browser to [http://localhost:3000](http://localhost:3000)

## Project Structure
- `server.js` - Main Express server and logic
- `package.json` - Project metadata and dependencies
- `.gitignore` - Files and folders to ignore in git

## License
ISC 