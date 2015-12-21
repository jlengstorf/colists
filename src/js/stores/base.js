import config from 'config';
import actions from '../actions';
import EventEmitter from 'events';
import io from 'socket.io-client';
import Immutable from 'immutable';

// Set up debugging
import Debugger from '../utils/debug';
const debug = new Debugger('stores/base');

// Set up a socket
debug.log(`Connecting to socket.io at ${config.socket.url}.`);
const __socket = io(config.socket.url);

/**
 * A simplified Flux store that's heavily inspired by Flux utils ReduceStore.
 * This is severely stripped down for clarity and to remove unused features.
 * For a more complete solution, check out the original Flux utils.
 *
 * @see https://facebook.github.io/flux/docs/flux-utils.html
 * @see https://github.com/facebook/flux/tree/master/src/stores
 */
export default class BaseStore extends EventEmitter {

  constructor(dispatcher) {

    // Initializes the EventEmitter so we can emit local events.
    super();

    // Initializes the state in a way that's easy to override in child classes.
    this.__state = this.getInitialState();

    this.__hasStateChanged = false;

    // A flag that allows a store to send events to the server if `true`.
    this.__notifyServerOnChange = false;
    this.__serverEventName = false;

    // Register a handler with the app dispatcher so events can be handled.
    dispatcher.register(action => {
      this._handleDispatch(action);
    });
  }

  getInitialState() {
    return Immutable.Map();
  }

  getState() {
    return this.__state;
  }

  replaceState(newState) {
    this.__state = newState;
  }

  /**
   * This method is called whenever an action is dispatched. It must be defined
   * in every store. All actions are passed to all stores, so only define a
   * handler where it makes sense.
   *
   * This method is basically lifted in its entirety from flux/utils.
   *
   * Example:
   *
   *     reduce(state, action) {
   *       switch (action.type) {
   *         case 'my-action':
   *           state = this.updateState(state);
   *           break;
   *
   *         default:
   *       }
   *
   *       return state;
   *     }
   *
   * @param  {Object} state  the current state for the store
   * @param  {Object} action the action object
   * @return {Object}        the new state for the store
   */
  reduce(state, action) {
    debug.error('The store must override the reduce method.');
  }

  _handleDispatch(action) {
    const oldState = this.__state;
    const newState = this.reduce(oldState, action);

    if (this._didChange(oldState, newState)) {
      this.__hasStateChanged = true;
      this.replaceState(newState);
    }

    this._notifyOnChange();
  }

  _notifyOnChange() {

    // Only send notifications if the state changed.
    if (this.__hasStateChanged === true) {

      // Notify any blocks listening to this store about the changes.
      this.emit(actions.STORE_UPDATED, null, false);

      // If the store needs to sync with the server, emit the update.
      if (this.__notifyServerOnChange && !!this.__serverEventName) {
        this.peerEmit(this.__serverEventName, this.getState().toJSON());
      }
    }

    // Reset the state flag to avoid unnecessary notifications.
    this.__hasStateChanged = false;
  }

  /**
   * An overrideable method to determine if the state has changed.
   *
   * @param  {Map} oldState the original state
   * @param  {Map} newState the (maybe) updated state
   * @return {Boolean}      `true` if the state is changed, otherwise `false`
   *
   * @see https://facebook.github.io/immutable-js/docs/#/is
   */
  _didChange(oldState, newState) {

    // Negate the result so a mismatch is `true` (for "changed").
    return !Immutable.is(oldState, newState);
  }

  peerJoin(channel) {
    console.log('SERVER_JOIN_ROOM', channel);
    this.peerEmit(actions.SERVER_JOIN_ROOM, channel);
  }

  /**
   * For events that need to notify the server and/or connected peers, use this
   * method to send off events.
   *
   * This is a simple wrapper around socket.io-client's `emit` method.
   *
   * @param  {String} event the event to emit
   * @param  {Object} data  the payload for the event
   * @return {void}
   *
   * @see http://socket.io/docs/client-api/
   */
  peerEmit(event, data) {
    debug.log(`event fired: ${event}`);
    __socket.emit(event, data);
  }

  /**
   * Register handlers for server-emitted events through this method.
   *
   * This is a simple wrapper for socket.io-client's `on` method.
   *
   * @param  {String}   event   the event the handler is fired on
   * @param  {Function} handler the event handler
   * @return {void}
   *
   * @see http://socket.io/docs/client-api/
   */
  peerOn(event, handler) {
    debug.log(`event handler for ${event}`);
    __socket.on(event, handler);
  }

}
