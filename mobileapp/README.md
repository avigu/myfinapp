# MyFinApp Mobile

A React Native mobile application for tracking S&P 500 and NASDAQ investment opportunities, featuring real-time market data and earnings calendars.

## Features

- 📈 **Real-time Stock Data**: Track top gainers and losers
- 📅 **Earnings Calendar**: View upcoming earnings reports
- 🔄 **Refresh Functionality**: Pull-to-refresh and manual refresh
- 📱 **Mobile-First Design**: Optimized for iOS and Android
- 🎨 **Modern UI**: Clean, intuitive interface with native feel
- 📊 **Multiple Views**: Switch between gainers, losers, and all opportunities

## Screenshots

### Home Screen
- Filter by S&P 500 or NASDAQ
- Switch between top gainers, losers, and all opportunities
- Pull-to-refresh functionality

### Earnings Calendar
- Grouped by date
- Company details and estimates
- Direct links to Yahoo Finance

### Settings
- App information
- Data source attribution
- Links to web version

## Tech Stack

- **React Native** with Expo
- **React Navigation** for tab-based navigation
- **Native Components** for optimal performance
- **REST API** integration with existing backend

## Prerequisites

- Node.js 16+ and npm
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (Mac) or Android Emulator
- Your backend server running on localhost:3000

## Installation

1. **Navigate to the mobile app directory:**
   ```bash
   cd mobileapp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure API endpoint:**
   
   Edit `src/services/api.js` and update the `BASE_URL`:
   ```javascript
   const BASE_URL = __DEV__ 
     ? 'http://YOUR_LOCAL_IP:3000'  // Replace with your machine's IP
     : 'https://your-production-url.com';
   ```

   **Important:** When testing on a physical device, replace `localhost` with your machine's IP address (e.g., `192.168.1.100:3000`).

## Running the App

### Development

```bash
# Start the development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run in web browser
npm run web
```

### Testing on Physical Device

1. Install the **Expo Go** app on your device
2. Scan the QR code shown in the terminal/browser
3. Make sure your device and development machine are on the same WiFi network

## Project Structure

```
mobileapp/
├── App.js                 # Main app component with navigation
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── StockCard.js   # Individual stock display
│   │   ├── TabBar.js      # Custom tab switcher
│   │   ├── FilterControls.js # Index and date filters
│   │   ├── LoadingSpinner.js # Loading state
│   │   └── ErrorView.js   # Error state
│   ├── screens/           # Main app screens
│   │   ├── HomeScreen.js  # Stock data display
│   │   ├── EarningsScreen.js # Earnings calendar
│   │   └── SettingsScreen.js # App settings
│   ├── services/          # API and data services
│   │   └── api.js         # Backend API integration
│   └── constants/         # App constants
│       └── styles.js      # Design system constants
├── package.json
└── README.md
```

## API Integration

The mobile app connects to the same backend API as the web version:

- **S&P 500 Data**: `GET /`
- **NASDAQ Data**: `GET /nasdaq`
- **Query Parameters**: `?start=YYYY-MM-DD`

### Sample API Response
```json
{
  "topGainers": [...],
  "topLosers": [...],
  "opportunities": [...],
  "upcomingEarnings": [...]
}
```

## Configuration

### API Endpoint

Update the base URL in `src/services/api.js`:

```javascript
const BASE_URL = 'http://your-server:3000';
```

### Styling

Customize the app appearance by modifying `src/constants/styles.js`:

```javascript
export const Colors = {
  primary: '#007AFF',     // Main brand color
  success: '#34C759',     # Gainer color
  danger: '#FF3B30',      # Loser color
  // ... more colors
};
```

## Features in Detail

### Stock Cards
- Company ticker and earnings date
- Price before/after earnings
- Percentage change with color coding
- Market cap display
- Direct link to Yahoo Finance

### Filtering
- Switch between S&P 500 and NASDAQ
- Date selection for historical data
- Manual refresh button

### Navigation
- Bottom tab navigation
- Native iOS/Android navigation patterns
- Smooth transitions

### Pull-to-Refresh
- Native refresh control
- Maintains state during refresh
- Error handling

## Troubleshooting

### Common Issues

1. **"Network request failed"**
   - Check that your backend server is running
   - Verify the API URL is correct
   - For device testing, use your machine's IP address, not localhost

2. **"Module not found"**
   - Run `npm install` to ensure all dependencies are installed
   - Clear Expo cache: `expo start -c`

3. **iOS Simulator not starting**
   - Ensure Xcode is installed and updated
   - Open iOS Simulator manually first

### Development Tips

- Use `console.log()` for debugging - logs appear in the Expo development tools
- Use React Developer Tools browser extension for component inspection
- Hot reloading is enabled by default

## Building for Production

### Expo Build Service

```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android
```

### Local Builds (EAS Build)

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Configure build
eas build:configure

# Build for all platforms
eas build --platform all
```

## Contributing

1. Follow the existing code style and structure
2. Test on both iOS and Android
3. Update documentation for new features
4. Ensure API compatibility with the web version

## License

Same as the main project - see the root LICENSE file.

## Support

For issues specific to the mobile app:
1. Check that the web version works correctly
2. Verify your network configuration
3. Test on both simulator and physical device
4. Check Expo documentation for platform-specific issues 