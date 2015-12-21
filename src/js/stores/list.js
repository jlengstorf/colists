/*
 * Load in configuration info.
 */
import config from 'config';
import actions from '../actions';

/*
 * In order to be a Flux-ey store, we need to register a change handler with
 * the `Dispatcher`, which allows us to handle events dispatched from views.
 */
import Dispatcher from '../dispatcher';

/*
 * This store will extend `BaseStore`, which allows it to inherit baseline
 * functionality.
 */
import BaseStore from './base';

/*
 * To ensure our data is easy to work with, we'll keep it immutable by
 * enforcing data models for lists and their contained items, which are both
 * `Map`s from Immutable.js.
 *
 * @see https://facebook.github.io/immutable-js/docs/#/Map
 */
import Immutable from 'immutable';
import List from '../models/list';
import Item from '../models/item';

/*
 * For debugging, load in our debugger and initialize it for this module.
 */
import Debugger from '../utils/debug';
const debug = new Debugger('stores/list');

/*
 * To keep data private, we declare it up here. This way, the module can access
 * it, but there's no way to get to it without using the API designated by the
 * module itself.
 *
 * First, create a constant for accessing the store's name in IndexedDB.
 */
const LIST_STORE = 'lists';

/*
 * We'll also store a reference to the database connection (created in
 * `_open()`) to avoid the overhead opening redundant connections.
 */
let __database;

/**
 * The ListStore holds methods for interacting with the user's list(s). It
 * manages state on its own, but also uses IndexedDB to store the state in the
 * user's browser, allowing for persistent storage.
 */
class ListStore extends BaseStore {

  constructor(dispatcher) {
    super(dispatcher);

    // The list store needs to stay in sync between peers and the server.
    this.__notifyServerOnChange = true;
    this.__serverEventName = actions.SERVER_LIST_USER_UPDATED;

    // Set up handlers for peer events.
    this.peerOn(
      actions.SERVER_LIST_PEER_UPDATED,
      this.updateList.bind(this)
    );
  }

  /**
   * When events are dispatched, `reduce()` is how we tell the store how to
   * react to them.
   *
   * @param  {Map}    state   the current state of the store
   * @param  {Object} action  the dispatched action
   * @return {Map}            the updated state of the store
   */
  reduce(state, action) {
    switch (action.type) {

      case actions.APP_INITIALIZE:
        this.getOrCreateList(action);
        break;

      case actions.ITEM_MARK_COMPLETE:
        this.toggleItemComplete(action.itemID);
        break;

      case actions.ITEM_DELETE:
        this.deleteItem(action.itemID);
        break;

      case actions.SERVER_LIST_PEER_UPDATED:
        this.updateList(action.list);
        break;

      // All events not specified above fall through to a no-op here.
      default:

    }

    return state;
  }

  getListID() {
    return this.getState().get('id');
  }

  getAllItems({ sort = 'complete' } = {}) {
    let items = this.getState().get('items');

    return !!sort && !!items ? items.sortBy(item => item[sort]) : items;
  }

  /**
   * Retrieves a list from IndexedDB or creates a new one.
   *
   * This method will look up a list by its ID in the IndexedDB database. If
   * the list doesn't already exist in the database, it will check for a name
   * to use for creating a new list.
   *
   * The list is created from IndexedDB or the new list name by creating a
   * new `List` model, which enforces an immutable data structure.
   *
   * Once the list is
   *
   * @param  {String}  options.listID   the list ID (optional)
   * @param  {String} options.listName  the list name (optional)
   * @return {Promise}                  resolves with the list
   */
  getOrCreateList({ listID = 'none', listName = false }) {
    return _openAndDo((resolve, reject, db) => {
      const store = db.transaction(LIST_STORE).objectStore(LIST_STORE);
      const request = store.get(listID);

      request.onerror = _handleError;

      request.onsuccess = () => {
        let newState;

        if (!request.result) {

          // No list found in the database.
          if (listID !== 'none') {

            // A list ID was provided, so try the server first.
            this.peerEmit(actions.SERVER_LIST_INITIAL_LOAD, {
              listID: listID,
            });

            // Since the list has to be loaded from the server, we stop here.
            debug.log('Loading the list from the server...');
            return;

          }
        }

        if (request.result) {
          newState = new List(request.result, false);
        } else if (!!listName) {
          newState = new List({ name: listName });
        } else {
          reject(Error('No list found, and no new list name provided!'));
          return;
        }

        this._maybeSaveList(resolve, reject, db, this.getState(), newState);
        this.peerJoin(newState.get('id'));
      };
    });
  }

  createList(listName) {
    return this.getOrCreateList({ listName: listName });
  }

  updateList(listObj) {
    const newState = new List(listObj, false);
    return _openAndDo((...args) => {
      this._maybeSaveList(...args, this.getState(), newState);
    });
  }

  saveItem(itemObject) {
    return _openAndDo((...args) => {
      const item = new Item(itemObject);

      // Set the item in the list
      const newState = this.getState()
        .setIn(['items', item.id], item)
        .set('updated', item.updated);

      this._maybeSaveList(...args, this.getState(), newState);
    });
  }

  getItem(itemID) {
    return this.getState().getIn(['items', itemID]);
  }

  toggleItemComplete(itemID) {
    return _openAndDo((...args) => {

      // We need to do three things here:
      // 1. Change the item's status
      // 2. Change the updated time for the item
      // 3. Change the updated time for the list
      const now = Date.now();
      const newState = this.getState()
        .setIn(
          ['items', itemID, 'complete'],
          !this.getState().getIn(['items', itemID, 'complete'])
        )
        .setIn(
          ['items', itemID, 'updated'],
          now
        )
        .set('updated', now);

      this._maybeSaveList(...args, this.getState(), newState);
    });
  }

  deleteItem(itemID) {
    return _openAndDo((...args) => {
      const newState = this.getState()
        .deleteIn(['items', itemID])
        .set('updated', Date.now());

      this._maybeSaveList(...args, this.getState(), newState);
    });
  }

  _maybeSaveList(resolve, reject, database, oldState, newState) {
    if (this._didChange(oldState, newState)) {
      this.__hasStateChanged = true;
      this.replaceState(newState);

      const transaction = database.transaction(LIST_STORE, 'readwrite');
      const store = transaction.objectStore(LIST_STORE);
      const request = store.put(this.getState().toJSON(), this.getState().get('id'));

      transaction.oncomplete = () => {
        this._notifyOnChange();
        resolve(this.getState());
      };

      request.onerror = reject;
    } else {
      resolve(this.getState());
    }
  }

  handlePeerListChange(newState) {
    dispatch({
      type: actions.SERVER_LIST_PEER_UPDATED,
      list: newState,
    });
  }

}

const instance = new ListStore(Dispatcher);
export default instance;

/**
 * A helper method to open a conneciton to IndexedDB.
 * @return {[type]} [description]
 */
function _open(db = false, store = false) {
  return new Promise((resolve, reject) => {

    // If no store is provided, reject right away.
    if (!store) {
      reject(Error('A store name is required.'));
    }

    // If a connection is already open, we don't need to open a new connection.
    if (db) {
      resolve(db);
    }

    const request = indexedDB.open(
      config.database.name,
      config.database.version
    );

    request.onupgradeneeded = event => {
      event.target.transaction.onerror = _handleError;
      event.target.result.createObjectStore(store);
    };

    request.onsuccess = event => {

      // NOTE: `__database` was declared way up at the top of the module.
      __database = event.target.result;
      resolve(__database);
    };

    request.onerror = reject;
  });
}

/**
 * A helper function to simplify working with IndexedDB.
 *
 * To reduce repeated code, this function wraps a callback with a Promise. The
 * callback _MUST_ resolve the promise (or reject it), otherwise things will
 * break. The callback will be passed the `resolve` and `reject` handlers for
 * the promise, plus the `database` connection from `_open()` as arguments.
 *
 * @param  {Function} callback function that interacts with IndexedDB
 * @return {Promise}           callbacks must resolve or reject the promise
 */
function _openAndDo(callback) {
  return new Promise((resolve, reject) => {
    _open(__database, LIST_STORE)
      .then(callback.bind(null, resolve, reject));
  });
};

function _handleError(error) {
  debug.error(error);
}

