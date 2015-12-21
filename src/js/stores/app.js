import Immutable from 'immutable';

import actions from '../actions';
import Dispatcher, {dispatch} from '../dispatcher';
import BaseStore from './base';

// Set up debugging
import Debugger from '../utils/debug';
const debug = new Debugger('stores/app');

class AppStore extends BaseStore {

  getInitialState() {
    return Immutable.fromJS({
      isListLoaded: false,
      user: {
        isEditing: false,
      },
      peer: {
        isEditing: false,
      },
    });
  }

  reduce(state, action) {
    switch (action.type) {

      case actions.LIST_HIDE_LOADING_STATUS:
        state = state.set('isListLoaded', true);
        break;

      case actions.ITEM_USER_IS_EDITING:
        state = state.setIn(['user', 'isEditing'], action.itemID);
        this.peerEmit(actions.SERVER_ITEM_PEER_IS_EDITING, {
          listID: action.listID,
          itemID: action.itemID,
        });
        break;

      case actions.SERVER_ITEM_PEER_IS_EDITING:
        state = state.setIn(['peer', 'isEditing'], action.itemID);
        break;

      // All events not specified above fall through to a no-op here.
      default:

    }

    return state;
  }

  isUserEditing(itemID) {
    return this.getUserEditing() === itemID;
  }

  isPeerEditing(itemID) {
    return this.getPeerEditing() === itemID;
  }

  getUserEditing() {
    return this.getState().getIn(['user', 'isEditing']);
  }

  getPeerEditing() {
    return this.getState().getIn(['peer', 'isEditing']);
  }

}

const instance = new AppStore(Dispatcher);
export default instance;
