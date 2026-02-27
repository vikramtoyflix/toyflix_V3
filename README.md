# Toyflix Admin Panel

A separate admin web application for managing the Toyflix toy rental platform.

## Features

- **Authentication**: Secure admin-only access with OTP verification
- **Toy Management**: Add, edit, and manage toys in the catalog
- **User Management**: View and manage user accounts
- **Order Management**: Track and manage rental orders
- **Analytics**: View platform analytics and insights
- **Settings**: Configure platform settings
- **Data Import**: Import data from CSV files

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Access to the Toyflix Supabase database

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd toyflix-admin
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

## Usage

### Authentication

1. Navigate to the login page
2. Enter your admin phone number
3. Receive OTP via SMS
4. Enter the OTP to access the admin panel

### Admin Features

- **Overview**: Dashboard with key metrics
- **Toys**: Manage toy catalog (add, edit, delete)
- **Categories**: Manage toy categories
- **Users**: View and manage user accounts
- **Orders**: Track rental orders
- **Analytics**: View platform analytics
- **Settings**: Configure platform settings

## Architecture

This admin app is built as a separate application from the main Toyflix platform to:

- **Reduce Complexity**: Separate admin logic from customer-facing code
- **Independent Deployment**: Deploy admin updates without affecting the main site
- **Better Security**: Isolate admin functionality
- **Focused Development**: Dedicated admin interface

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS + Radix UI
- **Backend**: Supabase (Database + Auth + Functions)
- **Routing**: React Router DOM
- **State Management**: React Context + Hooks

## Development

### Project Structure

```
src/
├── components/
│   ├── admin/          # Admin-specific components
│   └── ui/             # Reusable UI components
├── contexts/           # React contexts
├── hooks/              # Custom hooks
├── integrations/       # External service integrations
├── pages/              # Page components
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Deployment

The admin app can be deployed independently using:

- Vercel
- Netlify
- AWS Amplify
- Any static hosting service

## Security

- Admin-only access with role-based authentication
- OTP verification for secure login
- Protected routes for all admin functionality
- Secure API calls to Supabase

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the Toyflix platform and follows the same licensing terms.
