# SAP Error Decoder

A full-stack web application that helps users decode and understand SAP error messages using AI-powered analysis. The application provides detailed explanations of error meanings, causes, fixes, and risk assessments.

## Features

- **AI-Powered Error Analysis**: Uses Google Gemini AI to interpret SAP error messages
- **Error History Tracking**: Stores and retrieves past error analyses
- **User Profile Management**: User authentication and profile features
- **Dark/Light Theme**: Supports system theme preferences with manual toggle
- **System Sync**: Synchronization capabilities across systems
- **Help & Documentation**: Built-in help resources for users

## Project Structure

```
SAP/
├── Dashboard.html          # Standalone dashboard page
├── mainApp.html            # Main application entry
├── NavigationPage.html     # Navigation page
├── Profile.html            # User profile page
├── setting.html            # Settings page
├── settingPages.html       # Additional settings
├── client/                 # Frontend React application
│   ├── public/
│   │   ├── index.html
│   │   ├── Dashboard.html
│   │   ├── mainApp.html
│   │   └── NavigationPage.html
│   └── src/
│       ├── components/     # Reusable React components
│       │   ├── AdminPanelLayout.js
│       │   ├── ErrorOutputFormatter.js
│       │   └── HistoryPanel.js
│       ├── pages/         # Page-level components
│       │   ├── DashboardPage.js
│       │   ├── HelpPage.js
│       │   ├── MainAppPage.js
│       │   ├── NavigationPage.js
│       │   ├── ProfilePage.js
│       │   ├── SettingsPage.js
│       │   └── SystemSyncPage.js
│       ├── utils/         # Utility functions
│       │   ├── historyService.js
│       │   └── userService.js
│       ├── App.js         # Main React component
│       └── index.js       # React entry point
└── server/                # Backend Node.js server
    └── server.js          # Express server with Gemini AI integration
```

## Technology Stack

### Frontend
- **React** - UI framework
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling framework
- **Vite** - Build tool

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **Google Gemini AI** - AI-powered error analysis

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (comes with Node.js)
- Google Gemini API key

### Environment Variables

Create a `.env` file in the `server/` directory with the following:

```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

### Installation

1. **Clone the repository**
2. **Install server dependencies:**
   ```bash
   cd server
   npm install
   ```
3. **Install client dependencies:**
   ```bash
   cd client
   npm install
   ```

### Running the Application

1. **Start the backend server:**
   ```bash
   cd server
   npm start
   ```

2. **Start the frontend client:**
   ```bash
   cd client
   npm start
   ```

The client will run on `http://localhost:3000` and the server on `http://localhost:5000`.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/decode` | POST | Decode an SAP error message |
| `/api/history` | GET | Get error history |
| `/api/history/:id` | DELETE | Delete history item |
| `/api/user` | GET/POST | User management |

## Security Features

- **PII Detection**: Automatically detects sensitive information in error messages
- **Data Masking**: Masks numbers longer than 4 digits for privacy
- **Input Validation**: Validates API responses for required sections
- **Response Caching**: Caches decoded responses for performance
