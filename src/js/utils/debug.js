import config from 'config';
import debug from 'debug';

export default class Debugger {

  constructor(name) {
    this.__debug = config.debug ? debug(name) : () => {};
  }

  log(...message) {
    this.__debug(...message);
  }

  maybeLog(condition, ...message) {
    if (condition) {
      this.__debug(...message);
    }
  }

  error(...error) {
    this.__debug(...error);
  }

}
