/* Environnement de test : pas de WebSocket ni de fetch réels. */
global.fetch = global.fetch || jest.fn();
global.WebSocket =
  global.WebSocket ||
  class {
    constructor() {
      this.readyState = 0;
    }
    send() {}
    close() {}
  };
