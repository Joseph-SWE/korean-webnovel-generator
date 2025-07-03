# Korean Web Novel Generator

A comprehensive AI-powered platform for creating authentic Korean web novels using Google Gemini API. This application combines advanced AI capabilities with deep understanding of Korean web novel conventions to help authors create compelling, culturally authentic stories.

## 🌟 Features

### Core Capabilities
- **AI-Powered Generation**: Utilizes Google Gemini Pro for intelligent content creation
- **Genre Expertise**: Specialized in popular Korean web novel genres (Romance, Fantasy, Martial Arts, Regression, Isekai, Villainess, System)
- **Cultural Authenticity**: Deep understanding of Korean social dynamics, honorifics, and cultural nuances
- **Consistency Management**: Advanced tracking system for character personalities, plot lines, and world-building
- **Mobile-First**: Generated content follows Korean web novel conventions with short paragraphs and mobile-friendly formatting

### Supported Genres
- **Romance**: Love stories with Korean dynamics and emotional depth
- **Fantasy**: Magic systems, fantasy worlds, and adventure elements
- **Martial Arts**: Cultivation stages, sect politics, and honor codes
- **Regression**: Second chance narratives with future knowledge utilization
- **Isekai**: Modern knowledge in fantasy worlds and adaptation themes
- **Villainess**: Redemption arcs and expectation subversion
- **System**: Game-like mechanics, stats, and progression systems
- **Modern Urban**: Contemporary Korean settings and social dynamics
- **Historical**: Historical Korean periods with cultural accuracy

### Settings
- Modern Korea
- Historical Korea (Joseon Dynasty and earlier)
- Fantasy Worlds
- Murim (Martial Arts) Worlds
- Isekai Dimensions
- Royal Courts
- School/Office Environments
- Post-Apocalyptic Scenarios

## 🏗️ Tech Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Hook Form** for form management
- **Lucide React** for icons
- **Zustand** for state management

### Backend
- **Next.js API Routes**
- **Prisma ORM** with SQLite database
- **Google Gemini API** for AI generation
- **Zod** for validation
- **TypeScript** throughout

### AI & Generation
- **Google Gemini Pro** for content generation
- **Advanced prompt engineering** for Korean web novel conventions
- **Context-aware generation** with consistency tracking
- **Genre-specific templates** and trope management

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd korean-webnovel-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file
   cp .env.example .env
   
   # Add your Gemini API key to .env
   GEMINI_API_KEY="your_gemini_api_key_here"
   DATABASE_URL="file:./dev.db"
   ```

4. **Initialize the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Create a demo user**
   ```bash
   # You can create a user via the API or add this to your .env
   # The app currently uses 'demo-user-id' as the default user
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📖 Usage Guide

### Creating a Novel

1. **Navigate to Dashboard**
   - Click "Get Started" or go to `/dashboard`

2. **Create New Novel**
   - Click "Create New Novel"
   - Choose your genre and setting
   - Provide a basic premise
   - Let AI generate a comprehensive plan
   - Review and create your novel

3. **Generate Chapters**
   - Access your novel from the dashboard
   - Use the chapter generation system
   - Customize chapter focus and characters
   - Review consistency suggestions

### Novel Planning Process

1. **Basic Information**
   - Select genre (Romance, Fantasy, etc.)
   - Choose setting (Modern Korea, Fantasy World, etc.)
   - Provide basic premise and character concepts

2. **AI Planning**
   - System generates comprehensive novel plan
   - Includes character profiles and plot outline
   - Provides world-building suggestions
   - Creates genre-specific elements

3. **Review & Customize**
   - Edit generated plan as needed
   - Adjust character details
   - Modify plot points
   - Finalize novel creation

## 🎯 Korean Web Novel Conventions

### Writing Style
- Short, mobile-friendly paragraphs (2-3 sentences)
- Dialogue-heavy content with emotional depth
- Fast-paced plot development
- Compelling cliffhanger endings
- Rich internal monologue

### Cultural Elements
- Korean honorifics and speech levels
- Social hierarchy awareness
- Family dynamics and obligations
- Educational and workplace culture
- Modern Korean lifestyle integration

### Popular Tropes
- Weak-to-strong character progression
- Regression/reincarnation themes
- Villainess redemption arcs
- System/game mechanics
- Revenge and justice narratives
- Romance with misunderstandings
- Power fantasy elements

## 🔧 Development

### Project Structure
```
src/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   └── page.tsx          # Home page
├── components/            # React components
├── lib/                   # Utility libraries
│   ├── db.ts             # Database connection
│   ├── gemini.ts         # AI integration
│   └── prompts.ts        # Prompt templates
├── types/                 # TypeScript types
├── hooks/                 # Custom React hooks
└── stores/               # State management
```

### API Endpoints
- `POST /api/novels` - Create new novel
- `GET /api/novels` - List user's novels
- `POST /api/generate/novel-plan` - Generate novel plan
- `POST /api/generate/chapter` - Generate chapter
- `POST /api/users` - User management

### Database Schema
- **User**: User management and authentication
- **Novel**: Core novel information and metadata
- **Chapter**: Individual chapters with content
- **Character**: Character profiles and consistency
- **Plotline**: Plot management and tracking
- **WorldBuilding**: World rules and consistency
- **ChapterEvent**: Event tracking for consistency

## 🧪 Testing & Quality

### Consistency Management
- Character personality tracking
- Plot continuity validation
- World-building rule enforcement
- Timeline consistency checks
- Dialogue style monitoring

### Generation Quality
- Genre-appropriate content
- Cultural authenticity verification
- Mobile-friendly formatting
- Cliffhanger effectiveness
- Character development tracking

## 🚀 Deployment

### Production Setup
1. Set up production database (PlanetScale, Railway, etc.)
2. Configure environment variables
3. Deploy to Vercel or similar platform
4. Set up domain and SSL
5. Configure monitoring and analytics

### Environment Variables
```bash
# Required
GEMINI_API_KEY="your_gemini_api_key"
DATABASE_URL="your_production_database_url"

# Optional
NEXTAUTH_SECRET="your_auth_secret"
NEXTAUTH_URL="your_production_url"
```

## 📚 Advanced Features

### Consistency Tracking
- Real-time character analysis
- Plot hole detection
- World-building validation
- Relationship tracking
- Cultural accuracy checking

### Generation Customization
- Writing style preferences
- Trope intensity controls
- Chapter length settings
- Character focus options
- Plot advancement speed

### Export Options
- EPUB format with Korean formatting
- PDF with mobile-friendly layout
- Platform-specific formatting (Naver Series, KakaoPage)
- Plain text export
- Chapter-by-chapter downloads

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add appropriate tests
5. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Maintain Korean web novel authenticity
- Ensure mobile-responsive design
- Add proper error handling
- Document new features

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Google Gemini team for the powerful AI API
- Korean web novel community for inspiration
- Next.js team for the excellent framework
- Prisma team for the robust ORM

## 📞 Support

For support, feature requests, or bug reports:
- Create an issue on GitHub
- Check the documentation
- Review existing discussions

---

**Ready to create your Korean web novel?** Start your journey at [http://localhost:3000](http://localhost:3000)!
