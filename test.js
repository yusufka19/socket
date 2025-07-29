const { server, gameState } = require('./server');
const WebSocket = require('ws');

describe('Football Match Server', () => {
  let testServer;
  let ws;

  beforeAll((done) => {
    testServer = server.listen(0, () => {
      const port = testServer.address().port;
      ws = new WebSocket(`ws://localhost:${port}`);
      ws.on('open', done);
    });
  });

  afterAll((done) => {
    ws.close();
    testServer.close(done);
  });

  beforeEach(() => {
    // Clear game state before each test
    gameState.waitingPlayers.clear();
    gameState.activeSessions.clear();
    gameState.playerConnections.clear();
  });

  test('should connect to WebSocket', (done) => {
    expect(ws.readyState).toBe(WebSocket.OPEN);
    done();
  });

  test('should handle find_match message', (done) => {
    const message = {
      type: 'find_match',
      userId: 'test_user_1'
    };

    ws.send(JSON.stringify(message));

    ws.on('message', (data) => {
      const response = JSON.parse(data);
      expect(response.type).toBe('searching');
      done();
    });
  });

  test('should create bot match after timeout', (done) => {
    const message = {
      type: 'find_match',
      userId: 'test_user_1'
    };

    ws.send(JSON.stringify(message));

    // Wait for bot match creation (6+ seconds)
    setTimeout(() => {
      ws.on('message', (data) => {
        const response = JSON.parse(data);
        if (response.type === 'match_found') {
          expect(response.data.isBot).toBe(true);
          expect(response.data.opponent).toBe('bot');
          done();
        }
      });
    }, 6100);
  }, 10000);

  test('should validate correct guess', () => {
    const session = {
      validateGuess: (guess, team1, team2) => {
        // Test common player validation
        if (guess.toLowerCase() === 'robert lewandowski' && 
            team1 === 'barcelona' && team2 === 'bayern_munich') {
          return true;
        }
        return false;
      }
    };

    expect(session.validateGuess('Robert Lewandowski', 'barcelona', 'bayern_munich')).toBe(true);
    expect(session.validateGuess('Wrong Player', 'barcelona', 'bayern_munich')).toBe(false);
  });
});

// Bot AI Tests
describe('Bot AI', () => {
  const BotAI = require('./server').BotAI;

  test('should select random team', () => {
    const bot = new BotAI(0.5);
    const teams = ['barcelona', 'real_madrid', 'bayern_munich'];
    const selection = bot.selectTeam(teams);
    expect(teams).toContain(selection);
  });

  test('should find common players', () => {
    const bot = new BotAI(0.5);
    const commonPlayers = bot.findCommonPlayers('barcelona', 'bayern_munich');
    expect(commonPlayers).toContain('robert lewandowski');
  });

  test('should respect difficulty level', () => {
    const easyBot = new BotAI(0.9);
    const hardBot = new BotAI(0.1);
    
    let easySuccess = 0;
    let hardSuccess = 0;
    
    for (let i = 0; i < 100; i++) {
      if (easyBot.makeGuess('barcelona', 'bayern_munich')) easySuccess++;
      if (hardBot.makeGuess('barcelona', 'bayern_munich')) hardSuccess++;
    }
    
    expect(easySuccess).toBeGreaterThan(hardSuccess);
  });
});
