// Set up debugging
import Debugger from '../utils/debug';
const debug = new Debugger('dispatcher');

// Private "properties" for the class.
const __callbacks = [];
const __dispatches = [];

let __isDispatching = false;

class Dispatcher {

  dispatch(action) {
    debug.log(action);
    this._addDispatchToQueue(action);

    this._sendDispatch();
  }

  _addDispatchToQueue(action) {
    __dispatches.push(action);
  }

  _sendDispatch() {

    // If we're in the middle of a dispatch, bail to prevent race conditions.
    if (this.isDispatching()) {
      return;
    }

    // To start, check if there are dispatches in the queue.
    if (__dispatches.length > 0) {

      // Prevent multiple dispatches at the same time.
      __isDispatching = true;

      // Shift the first (oldest) dispatch out of the queue.
      const action = __dispatches.shift();

      // Fire the handler for all registered stores.
      __callbacks.forEach(callback => {
        callback(action);
      });

      // Unlock the dispatch now that we're done sending data.
      __isDispatching = false;

      // This method calls itself recursively until the queue is empty.
      this._sendDispatch();
    } else {

      // If we get here, it's becaue the queue is empty.
      debug.log('All dispatches sent.');
    }
  }

  isDispatching() {
    return __isDispatching;
  }

  register(callback) {
    __callbacks.push(callback);
  }

}

const instance = new Dispatcher();
export default instance;
export const dispatch = instance.dispatch.bind(instance);
