# SideHustle

A web application that provides personalized side hustle opportunities based on users' skills and preferences using AI-powered research.

## What Does This Application Do?

SideHustle is an intelligent tool designed to help users discover personalized ways to monetize their skillsets. Unlike traditional static lists of ideas, this application:

- **Provides personalized recommendations** based on your specific skills, time availability, risk tolerance, and income goals
- **Delivers actionable opportunities** that can be started within a week
- **Shows detailed information** about each opportunity, including income potential, risk level, startup costs, and step-by-step guidance
- **Connects you with like-minded individuals** through integrated social networking features
- **Offers real success stories** and resources to help you get started

## How Does the Code Work?

### Architecture Overview

The application uses a modern full-stack JavaScript architecture:

- **Frontend**: React with Tailwind CSS and Shadcn components
- **Backend**: Express.js server with RESTful API
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with secure session management
- **AI Integration**: Anthropic Claude API for generating personalized monetization opportunities

### Key Components

1. **User Authentication System**
   - Secure registration and login with password hashing
   - Protected routes requiring authentication
   - Session management with PostgreSQL session store

2. **User Profile Management**
   - Multi-step form capturing skills, preferences, and community settings
   - Persistent storage of user profiles in the database

3. **Monetization Opportunity Generation**
   - AI-powered analysis of user skills and preferences
   - Categorized recommendations (freelance, digital products, content creation, etc.)
   - Detailed guidance for each opportunity

4. **Community Features**
   - User discovery and matching based on similar skills
   - Configurable privacy settings
   - Messaging capability between users with shared interests

### Data Flow

1. Users register/login through the authentication system
2. Users fill out the multi-step discovery form with their skills and preferences
3. The form data is sent to the backend API
4. The backend processes the request and uses Anthropic Claude to generate personalized recommendations
5. Results are returned to the frontend and displayed in an organized, actionable format
6. Optional: Users can engage with the community features to connect with others

## How to Start and Test the Code

### Prerequisites

- Node.js (v18+)
- PostgreSQL database
- Anthropic API key

### Environment Variables

The application requires the following environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `ANTHROPIC_API_KEY`: Your Anthropic API key for generating recommendations
- `SESSION_SECRET`: A secret string for session encryption

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd sidehustle
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Push the database schema:
   ```bash
   npm run db:push
   ```

### Starting the Application

Run the development server:
```bash
npm run dev
```

This will start both the frontend and backend servers. The application will be available at http://localhost:5000.

### Testing the Application

1. Register a new user account on the `/auth` page
2. Log in with your credentials
3. Fill out the discovery form with your skills, time availability, and preferences
4. Submit the form to receive personalized monetization opportunities
5. Explore the detailed recommendations and resources

### API Endpoints

The application exposes the following main API endpoints:

- **Authentication**
  - `POST /api/register` - Create a new user account
  - `POST /api/login` - Log in with existing credentials
  - `POST /api/logout` - Log out the current user
  - `GET /api/user` - Get the current authenticated user

- **Monetization Opportunities**
  - `POST /api/opportunities` - Generate personalized monetization opportunities
  - `GET /api/opportunities` - Get previously generated opportunities for the current user
  - `GET /api/opportunities/shared` - Get publicly shared opportunities

- **User Profiles and Community**
  - `GET /api/profiles` - Get discoverable user profiles with similar skills
  - `POST /api/messages` - Send a message to another user
  - `GET /api/messages` - Get messages for the current user
  - `POST /api/connections` - Create a connection request with another user

## Project Structure

```
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions
│   │   ├── pages/        # Page components
│   │   └── types.ts      # TypeScript interfaces and types
│
├── server/               # Backend Express application
│   ├── api/              # API route handlers
│   ├── auth.ts           # Authentication setup
│   ├── db.ts             # Database connection
│   ├── routes.ts         # API routes configuration
│   ├── storage.ts        # Data storage implementation
│   └── index.ts          # Server entry point
│
├── shared/               # Shared code between client and server
│   └── schema.ts         # Database schema and types
│
└── drizzle.config.ts     # Drizzle ORM configuration
```

## Future Enhancements

- Enhanced social networking features
- Integration with marketplaces
- More detailed success stories and case studies
- Analytics for tracking progress on monetization goals