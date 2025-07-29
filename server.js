const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(cors());
app.use(express.json());

// Game state
const gameState = {
  waitingPlayers: new Map(),
  activeSessions: new Map(),
  playerConnections: new Map(),
  bots: new Map()
};

// Teams data
const teams = {
  barcelona: {
    id: 'barcelona',
    name: 'FC Barcelona',
    players: [
      'Robert Lewandowski', 'Pedri', 'Gavi', 'Frenkie de Jong',
      'Ronald Araújo', 'Jules Koundé', 'Raphinha', 'Ferran Torres',
      'Ansu Fati', 'Marc-André ter Stegen', 'Sergi Roberto',
      'Marcos Alonso', 'Jordi Alba', 'Eric García', 'Andreas Christensen',
      'Franck Kessié', 'Pablo Torre', 'Alejandro Balde', 'Ousmane Dembélé'
    ]
  },
  real_madrid: {
    id: 'real_madrid',
    name: 'Real Madrid',
    players: [
      'Karim Benzema', 'Vinícius Júnior', 'Luka Modrić', 'Toni Kroos',
      'Casemiro', 'Federico Valverde', 'Eduardo Camavinga', 'Thibaut Courtois',
      'David Alaba', 'Éder Militão', 'Dani Carvajal', 'Ferland Mendy',
      'Marco Asensio', 'Rodrygo', 'Lucas Vázquez', 'Nacho Fernández',
      'Antonio Rüdiger', 'Aurélien Tchouaméni', 'Eden Hazard'
    ]
  },
  bayern_munich: {
    id: 'bayern_munich',
    name: 'Bayern München',
    players: [
      'Robert Lewandowski', 'Thomas Müller', 'Joshua Kimmich', 'Leon Goretzka',
      'Serge Gnabry', 'Leroy Sané', 'Alphonso Davies', 'Manuel Neuer',
      'Dayot Upamecano', 'Lucas Hernández', 'Benjamin Pavard', 'Kingsley Coman',
      'Jamal Musiala', 'Marcel Sabitzer', 'Sadio Mané', 'Matthijs de Ligt',
      'Ryan Gravenberch', 'Noussair Mazraoui'
    ]
  },
  manchester_city: {
    id: 'manchester_city',
    name: 'Manchester City',
    players: [
      'Erling Haaland', 'Kevin De Bruyne', 'Phil Foden', 'Riyad Mahrez',
      'Bernardo Silva', 'Ilkay Gündogan', 'Rodri', 'Ederson',
      'Rúben Dias', 'John Stones', 'Kyle Walker', 'João Cancelo',
      'Jack Grealish', 'Gabriel Jesus', 'Raheem Sterling', 'Aymeric Laporte',
      'Nathan Aké', 'Kalvin Phillips', 'Julian Álvarez'
    ]
  },
  psg: {
    id: 'psg',
    name: 'Paris Saint-Germain',
    players: [
      'Kylian Mbappé', 'Neymar Jr', 'Lionel Messi', 'Marco Verratti',
      'Marquinhos', 'Presnel Kimpembe', 'Achraf Hakimi', 'Gianluigi Donnarumma',
      'Sergio Ramos', 'Vitinha', 'Fabián Ruiz', 'Carlos Soler',
      'Danilo Pereira', 'Renato Sanches', 'Pablo Sarabia', 'Juan Bernat',
      'Nordi Mukiele', 'Warren Zaïre-Emery'
    ]
  },
  liverpool: {
    id: 'liverpool',
    name: 'Liverpool FC',
    players: [
      'Mohamed Salah', 'Sadio Mané', 'Virgil van Dijk', 'Jordan Henderson',
      'Fabinho', 'Thiago Alcântara', 'Alisson Becker', 'Andrew Robertson',
      'Trent Alexander-Arnold', 'Roberto Firmino', 'Diogo Jota', 'Luis Díaz',
      'Darwin Núñez', 'Harvey Elliott', 'Joël Matip', 'Ibrahima Konaté',
      'James Milner', 'Alex Oxlade-Chamberlain', 'Naby Keïta'
    ]
  },
  chelsea: {
    id: 'chelsea',
    name: 'Chelsea FC',
    players: [
      'Mason Mount', 'Reece James', 'Thiago Silva', 'N\'Golo Kanté',
      'Mateo Kovačić', 'Kepa Arrizabalaga', 'Kai Havertz', 'Timo Werner',
      'Christian Pulisic', 'Raheem Sterling', 'Pierre-Emerick Aubameyang',
      'Wesley Fofana', 'Kalidou Koulibaly', 'Marc Cucurella', 'Ben Chilwell',
      'Conor Gallagher', 'Ruben Loftus-Cheek', 'Armando Broja'
    ]
  },
  juventus: {
    id: 'juventus',
    name: 'Juventus FC',
    players: [
      'Dušan Vlahović', 'Federico Chiesa', 'Paulo Dybala', 'Manuel Locatelli',
      'Weston McKennie', 'Adrien Rabiot', 'Wojciech Szczęsny', 'Leonardo Bonucci',
      'Matthijs de Ligt', 'Alex Sandro', 'Juan Cuadrado', 'Ángel Di María',
      'Moise Kean', 'Denis Zakaria', 'Fabio Miretti', 'Mattia De Sciglio',
      'Danilo', 'Arthur', 'Nicolò Fagioli'
    ]
  }
};

// Player transfers/common players between teams
const commonPlayers = {
  'robert lewandowski': ['barcelona', 'bayern_munich'],
  'matthijs de ligt': ['juventus', 'bayern_munich'],
  'sadio mané': ['liverpool', 'bayern_munich'],
  'raheem sterling': ['manchester_city', 'chelsea'],
  'gabriel jesus': ['manchester_city'],
  'thiago silva': ['chelsea'],
  'sergio ramos': ['psg'],
  'lionel messi': ['psg', 'barcelona'],
  'neymar jr': ['psg', 'barcelona'],
  'paulo dybala': ['juventus'],
  'cristiano ronaldo': ['juventus', 'manchester_city', 'real_madrid'],
  'karim benzema': ['real_madrid'],
  'luka modric': ['real_madrid'],
  'virgil van dijk': ['liverpool'],
  'mohamed salah': ['liverpool', 'chelsea'],
  'kevin de bruyne': ['manchester_city', 'chelsea'],
  'kylian mbappe': ['psg']
};

// Bot AI class
class BotAI {
  constructor(difficulty = 0.5) {
    this.difficulty = difficulty; // 0.0 to 1.0
    this.reactionTime = Math.random() * 5000 + 2000; // 2-7 seconds
  }

  selectTeam(availableTeams) {
    // Bot selects random team
    const teamIds = Object.keys(teams);
    return teamIds[Math.floor(Math.random() * teamIds.length)];
  }

  makeGuess(team1, team2) {
    // Find common players between teams
    const validPlayers = this.findCommonPlayers(team1, team2);
    
    if (validPlayers.length === 0) {
      return null; // No valid answer
    }

    // Bot difficulty affects success rate
    if (Math.random() < this.difficulty) {
      // Bot finds correct answer
      return validPlayers[Math.floor(Math.random() * validPlayers.length)];
    }
    
    return null; // Bot fails to find answer
  }

  findCommonPlayers(team1Id, team2Id) {
    const players = [];
    
    // Check in commonPlayers database
    for (const [player, teamsList] of Object.entries(commonPlayers)) {
      if (teamsList.includes(team1Id) && teamsList.includes(team2Id)) {
        players.push(player);
      }
    }

    // Also check for exact name matches in team rosters
    const team1Players = teams[team1Id]?.players || [];
    const team2Players = teams[team2Id]?.players || [];
    
    team1Players.forEach(player1 => {
      team2Players.forEach(player2 => {
        if (player1.toLowerCase() === player2.toLowerCase()) {
          players.push(player1.toLowerCase());
        }
      });
    });

    return [...new Set(players)]; // Remove duplicates
  }
}

// Game session class
class GameSession {
  constructor(player1Id, player2Id = null, isBot = false) {
    this.id = uuidv4();
    this.player1Id = player1Id;
    this.player2Id = player2Id || (isBot ? 'bot' : null);
    this.isBot = isBot;
    this.state = 'team_selection';
    this.selectedTeams = {};
    this.createdAt = new Date();
    this.startedAt = null;
    this.endedAt = null;
    this.winner = null;
    this.timers = {};
    
    if (isBot) {
      this.bot = new BotAI(0.5); // 50% difficulty
    }
  }

  selectTeam(playerId, teamId) {
    this.selectedTeams[playerId] = teamId;
    
    // If bot game, auto-select bot team
    if (this.isBot && playerId === this.player1Id) {
      setTimeout(() => {
        const botTeam = this.bot.selectTeam(teams);
        this.selectedTeams['bot'] = botTeam;
        this.checkTeamSelection();
      }, Math.random() * 3000 + 1000); // 1-4 seconds
    } else {
      this.checkTeamSelection();
    }
  }

  checkTeamSelection() {
    const expectedPlayers = this.isBot ? [this.player1Id, 'bot'] : [this.player1Id, this.player2Id];
    const selectedPlayers = Object.keys(this.selectedTeams);
    
    if (expectedPlayers.every(player => selectedPlayers.includes(player))) {
      this.state = 'showing_teams';
      this.broadcastGameUpdate();
      
      // Start showing teams for 3 seconds
      setTimeout(() => {
        this.startGuessingPhase();
      }, 3000);
    }
  }

  startGuessingPhase() {
    this.state = 'guessing';
    this.startedAt = new Date();
    this.broadcastGameUpdate();
    
    // Start 30-second timer
    this.timers.guessing = setTimeout(() => {
      this.endGame('timeout');
    }, 30000);

    // If bot game, schedule bot guess
    if (this.isBot) {
      this.scheduleBotGuess();
    }
  }

  scheduleBotGuess() {
    const team1 = this.selectedTeams[this.player1Id];
    const team2 = this.selectedTeams['bot'];
    
    // Bot makes guess after some delay
    setTimeout(() => {
      if (this.state === 'guessing') {
        const botGuess = this.bot.makeGuess(team1, team2);
        if (botGuess) {
          this.processGuess('bot', botGuess);
        }
      }
    }, this.bot.reactionTime);
  }

  processGuess(playerId, guess) {
    if (this.state !== 'guessing') return false;

    const team1 = this.selectedTeams[this.player1Id];
    const team2 = this.selectedTeams[this.isBot ? 'bot' : this.player2Id];
    
    const isCorrect = this.validateGuess(guess, team1, team2);
    
    if (isCorrect) {
      clearTimeout(this.timers.guessing);
      this.endGame('correct', playerId);
      return true;
    }
    
    // Send incorrect guess message
    this.sendToPlayer(playerId, {
      type: 'guess_result',
      data: {
        isCorrect: false,
        guess: guess
      }
    });
    
    return false;
  }

  validateGuess(guess, team1Id, team2Id) {
    const guessLower = guess.toLowerCase().trim();
    
    // Check in commonPlayers database
    for (const [player, teamsList] of Object.entries(commonPlayers)) {
      if (player.includes(guessLower) || guessLower.includes(player)) {
        if (teamsList.includes(team1Id) && teamsList.includes(team2Id)) {
          return true;
        }
      }
    }

    // Check team rosters for exact matches
    const team1Players = teams[team1Id]?.players || [];
    const team2Players = teams[team2Id]?.players || [];
    
    const allPlayers = [...team1Players, ...team2Players];
    
    return allPlayers.some(player => {
      const playerLower = player.toLowerCase();
      return playerLower.includes(guessLower) || guessLower.includes(playerLower);
    });
  }

  endGame(reason, winnerId = null) {
    this.state = 'game_over';
    this.endedAt = new Date();
    this.winner = winnerId;
    
    // Clear all timers
    Object.values(this.timers).forEach(timer => clearTimeout(timer));
    
    let result;
    if (reason === 'timeout') {
      result = 'timeout';
    } else if (winnerId === this.player1Id) {
      result = 'won';
    } else {
      result = 'lost';
    }

    this.broadcastGameUpdate(result);
    
    // Clean up session after 30 seconds
    setTimeout(() => {
      gameState.activeSessions.delete(this.id);
    }, 30000);
  }

  broadcastGameUpdate(result = null) {
    const update = {
      type: 'game_update',
      data: {
        sessionId: this.id,
        state: this.state,
        selectedTeams: this.selectedTeams,
        winner: this.winner,
        result: result,
        isBot: this.isBot
      }
    };

    this.sendToPlayer(this.player1Id, update);
    if (!this.isBot && this.player2Id) {
      this.sendToPlayer(this.player2Id, update);
    }
  }

  sendToPlayer(playerId, message) {
    const connection = gameState.playerConnections.get(playerId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify(message));
    }
  }
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(ws, data);
    } catch (error) {
      console.error('Error parsing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    // Remove player from waiting list and connections
    for (const [playerId, connection] of gameState.playerConnections) {
      if (connection === ws) {
        gameState.playerConnections.delete(playerId);
        gameState.waitingPlayers.delete(playerId);
        break;
      }
    }
  });
});

function handleMessage(ws, data) {
  const { type, userId, sessionId, teamId, guess } = data;

  switch (type) {
    case 'find_match':
      handleFindMatch(ws, userId);
      break;
      
    case 'select_team':
      handleTeamSelection(userId, sessionId, teamId);
      break;
      
    case 'submit_guess':
      handleGuessSubmission(userId, sessionId, guess);
      break;
      
    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Unknown message type'
      }));
  }
}

function handleFindMatch(ws, userId) {
  // Store player connection
  gameState.playerConnections.set(userId, ws);
  
  // Look for waiting player
  const waitingPlayer = Array.from(gameState.waitingPlayers.keys())[0];
  
  if (waitingPlayer && waitingPlayer !== userId) {
    // Match found
    gameState.waitingPlayers.delete(waitingPlayer);
    
    const session = new GameSession(waitingPlayer, userId);
    gameState.activeSessions.set(session.id, session);
    
    // Notify both players
    session.sendToPlayer(waitingPlayer, {
      type: 'match_found',
      data: {
        sessionId: session.id,
        opponent: userId,
        isBot: false
      }
    });
    
    session.sendToPlayer(userId, {
      type: 'match_found',
      data: {
        sessionId: session.id,
        opponent: waitingPlayer,
        isBot: false
      }
    });
    
  } else {
    // Add to waiting list
    gameState.waitingPlayers.set(userId, Date.now());
    
    ws.send(JSON.stringify({
      type: 'searching',
      message: 'Searching for opponent...'
    }));
    
    // Start 6-second timer for bot fallback
    setTimeout(() => {
      if (gameState.waitingPlayers.has(userId)) {
        gameState.waitingPlayers.delete(userId);
        
        // Create bot match
        const botSession = new GameSession(userId, null, true);
        gameState.activeSessions.set(botSession.id, botSession);
        
        botSession.sendToPlayer(userId, {
          type: 'match_found',
          data: {
            sessionId: botSession.id,
            opponent: 'bot',
            isBot: true
          }
        });
      }
    }, 6000);
  }
}

function handleTeamSelection(userId, sessionId, teamId) {
  const session = gameState.activeSessions.get(sessionId);
  if (!session) {
    return;
  }
  
  session.selectTeam(userId, teamId);
}

function handleGuessSubmission(userId, sessionId, guess) {
  const session = gameState.activeSessions.get(sessionId);
  if (!session) {
    return;
  }
  
  session.processGuess(userId, guess);
}

// REST API endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    connections: gameState.playerConnections.size,
    activeSessions: gameState.activeSessions.size,
    waitingPlayers: gameState.waitingPlayers.size
  });
});

app.get('/stats', (req, res) => {
  res.json({
    totalConnections: gameState.playerConnections.size,
    activeSessions: gameState.activeSessions.size,
    waitingPlayers: gameState.waitingPlayers.size,
    totalTeams: Object.keys(teams).length
  });
});

app.get('/teams', (req, res) => {
  res.json(teams);
});

// Start server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Football Match Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🎮 WebSocket endpoint: ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { server, gameState };
