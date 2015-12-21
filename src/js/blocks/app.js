import actions from '../actions';
import {dispatch} from '../dispatcher';

// Import the required stores for the app to run.
import AppStore from '../stores/list';
import ListStore from '../stores/list';

// Import the required blocks for the app to run.
import Form from './form';
import List from './list';

// Set up debugging
import Debugger from '../utils/debug';
const debug = new Debugger('blocks/app');

class App {

  constructor() {

    // Peer event handlers
    AppStore.peerOn(actions.SERVER_ITEM_PEER_IS_EDITING, ({ itemID }) => {
      dispatch({
        type: actions.SERVER_ITEM_PEER_IS_EDITING,
        itemID: itemID,
      });
    });

  }

  initialize() {
    this.getListID()
      .then(listID => {

        // With the list ID loaded, store it for reference.
        this.listID = listID;

        // This is where the app "starts", now that we have the required info.
        dispatch({
          type: actions.APP_INITIALIZE,
          listID: this.listID,
        });
      })
      .catch(debug.error.bind(debug));
  }

  getListID() {
    return new Promise((resolve, reject) => {

      // To start, check the URL path for an ID.
      if (window.location.pathname.length > 1) {

        /*
         * Retrieve the existing list ID from the path, excluding the leading
         * forward slash (`/`) using `slice()`.
         */
        const listID = window.location.pathname.slice(1);

        if (!listID) {
          reject(Error('The list ID is empty.'));
        } else {
          resolve(listID);
        }

      } else {

        // If we get here, the user came in on the home page.
        const newListName = window.prompt('Choose a name for your list:');

        // Use the list name entered by the client to create a new list.
        ListStore.createList(newListName)
          .then(list => {
            _updateURI(list.get('id'), list.get('name'));
            resolve(list.get('id'));
          })
          .catch(debug.error.bind(debug));
      }
    });
  }

}

const instance = new App();
export default instance;

function _updateURI(uri, title) {

  /*
   * Set the URL to the new list ID (for sharing the link and coming
   * back to the page later.
   */
  window.history.pushState({ title: title }, title, uri);
}
