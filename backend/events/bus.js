// Event bus, Singleton design pattern, used for listening for events to happen
const { EventEmitter } = require ('events');
const bus = new EventEmitter();

// limit maximum listeners to avoid leaking memory
bus.setMaxListeners(50);

module.exports = bus;