import actions from '../actions';
import {dispatch} from '../dispatcher';
import AppStore from '../stores/app';
import ListStore from '../stores/list';

// Set up debugging
import Debugger from '../utils/debug';
const debug = new Debugger('blocks/form');

class Form {

  constructor() {

    // Create references to the inputs for easy reference.
    this.$inputs = {
      id: document.getElementById('itemId'),
      text: document.getElementById('itemText'),
      complete: document.getElementById('itemComplete'),
    };

    // Register event handlers.
    document.body.addEventListener(
      'submit',
      _handleSubmit.bind(null, this.$inputs)
    );

    AppStore.on(actions.STORE_UPDATED, () => {
      this.getItemToEdit();
    });
  }

  getItemToEdit() {
    const itemID = AppStore.getUserEditing();

    if (!itemID) {
      return;
    }

    const item = ListStore.getItem(itemID);

    this.$inputs.text.value = item.text;
    this.$inputs.id.value = item.id;
    this.$inputs.complete.value = item.complete;

    this.$inputs.text.focus();
  }

}

function _handleSubmit($inputs, event) {
  event.preventDefault();

  // TODO handle empty text submissions with an error of some sort.
  if ($inputs.text.value.length < 1) {
    return false;
  }

  // Clear the editing status
  dispatch({
    type: actions.ITEM_USER_IS_EDITING,
    listID: ListStore.getListID(),
    itemID: false,
  });

  const item = {
    id: !!$inputs.id.value ? $inputs.id.value : null,
    text: $inputs.text.value,
    complete: $inputs.complete.value === 'true' ? true : false,
  };

  // Store the item in the database (created if it's new, updated otherwise).
  ListStore.saveItem(item)
    .then(() => {

      // Reset the form.
      $inputs.text.value = '';
      $inputs.id.value = '';
      $inputs.complete.value = '';
    });
}

const instance = new Form();
export default instance;
