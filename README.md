# Railway Football Match Game Server

Bu proje, Football Match Game uygulaması için Railway platformunda çalışan WebSocket sunucusudur.

##  Railway Deployment

### Özellikler
-  WebSocket gerçek zamanlı iletişim
-  Bot yapay zekası (%50 zorluk)
-  Otomatik eşleştirme sistemi (6 saniye)
-  Health check endpoint
-  Statistics API
-  Production-ready environment

### API Endpoints
- GET /health - Server durumu
- GET /stats - Oyun istatistikleri
- WebSocket / - Gerçek zamanlı oyun

### Environment Variables
`
PORT=8080
NODE_ENV=production
`

### Deployment
1. Railway'de yeni proje oluştur
2. GitHub repository'sini bağla
3. Otomatik deployment başlayacak
4. Domain URL'ini Flutter uygulamasında kullan

### Test
`ash
curl https://your-railway-domain.com/health
`

##  Game Features
- Real-time matchmaking
- Bot opponents with configurable difficulty
- Team selection (8 teams)
- Player guessing game (30 seconds)
- Score tracking and leaderboards

##  Technical Details
- **Platform**: Railway
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **WebSocket**: ws library
- **Database**: In-memory (session-based)
- **Scaling**: Horizontal scaling ready

Developed for Football Match Game Flutter Application
