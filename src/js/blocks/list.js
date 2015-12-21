import config from 'config';
import actions from '../actions';
import {dispatch} from '../dispatcher';
import Item from '../models/item';
import AppStore from '../stores/app';
import ListStore from '../stores/list';

// Set up debugging
import Debugger from '../utils/debug';
const debug = new Debugger('blocks/list');

class List {

  constructor() {
    this.$list = document.querySelector('.items__list');

    // Event handlers
    const eventHandler = this.handleListChange.bind(this);
    AppStore.on(actions.STORE_UPDATED, eventHandler);
    ListStore.on(actions.STORE_UPDATED, eventHandler);

    /*
     * When other connected users make changes to the list, this handler will
     * be triggered. The reason we catch it here and dispatch is twofold:
     *
     * 1. We need to preserve the unidirectional data flow, which means our
     *    stores should only make changes after receiving a dispatch.
     * 2. Since multiple users can be making changes at once, we need to put
     *    peer actions into the same queue as user actions. Otherwise, we'd see
     *    the potential for collisions, race conditions, and other nonsense.
     */
    ListStore.peerOn(actions.SERVER_LIST_PEER_UPDATED, newState => {
      dispatch({
        type: actions.SERVER_LIST_PEER_UPDATED,
        list: newState,
      });
    });

    ListStore.peerOn(actions.SERVER_LIST_LOADED, newState => {
      dispatch({
        type: actions.SERVER_LIST_PEER_UPDATED,
        list: newState,
      });
    });

    ListStore.peerOn(actions.SERVER_LIST_NOT_FOUND, list => {
      debug.log(`${actions.SERVER_LIST_NOT_FOUND}:`, list);
      debug.log('Redirecting to the home page...');
      document.location.href = './';
    });

    // We're taking advantage of event delegation here to manage item actions.
    this.$list.addEventListener(
      'dblclick',
      _handleDoubleClick.bind(null, this.$list)
    );

    this.$list.addEventListener('click', _handleClick);
  }

  handleListChange() {
    const items = ListStore.getAllItems();
    const $oldItems = this.$list.querySelectorAll('li');
    let itemsToRemove = {};

    Object.keys($oldItems).forEach(key => {
      itemsToRemove[$oldItems[key].id] = $oldItems[key];
    });

    debug.log(items);

    if ('size' in items) {

      if (!AppStore.getState().get('isListLoaded')) {

        // Notify the AppStore that the list is loaded
        dispatch({
          type: actions.LIST_HIDE_LOADING_STATUS,
        });
      } else {
        this.$list.classList.remove('items__list--loading');
      }

      items.forEach(item => {
        delete itemsToRemove[item.id];
        _addItemToList(this.$list, item);
      });

      debug.maybeLog(itemsToRemove.length > 0, 'itemsToRemove after rendering', itemsToRemove);
      Object.keys(itemsToRemove).forEach(key => {
        _removeItem(itemsToRemove[key]);
      });
    } else {

      // TODO add a "no items present" message.
      debug.log('No items in this list.');
    }
  }

}

// Helper functions.

function _addItemToList($targetElement, item) {

  /*
   * To avoid duplicate items, make an effort to load the existing item from
   * the DOM. If no existing item is found, create a new one.
   */
  let $item = document.getElementById(item.id) || _createItem(item);

  // Set a flag to indicate whether we're dealing with an existing item or not.
  let isItemInDOM = document.contains($item);

  if (isItemInDOM) {

    // If the item already exists, update its text with the current item text.
    $item.querySelector(`.${config.classes.text}`).textContent = item.text;

    // Check for a change in completion status so we can handle the change.
    const isMarkedComplete = $item.classList.contains(config.classes.complete);
    if (item.complete !== isMarkedComplete) {

      /*
       * We want to animate completion state changes, so we remove the item
       * here. It'll be added to the DOM in the right order by the callback.
       */
      _removeItem($item, _animateItem.bind(null, $targetElement));
    }

  }

  // If the item is being edited, add the appropriate class.
  const isUserEditing = AppStore.isUserEditing($item.id);
  const isEditing = isUserEditing || AppStore.isPeerEditing($item.id);
  _maybeAddClass(isEditing, $item, config.classes.editing);

  debug.maybeLog(isEditing, `Item#${$item.id} is being edited.`);

  // If the item is complete, add the completed modifier class
  _maybeAddClass(item.complete, $item, config.classes.complete);

  if (!isItemInDOM) {

    // If the item is new, add it to the DOM.
    _animateItem($targetElement, $item);
  }
}

function _animateItem($targetElement, $item) {
  $item.classList.add(config.classes.hidden);

  if ($item.classList.contains(config.classes.complete)) {
    $targetElement.appendChild($item);
  } else {
    $targetElement.insertBefore(
      $item,
      $targetElement.querySelector(`.${config.classes.complete}`)
    );
  }

  setTimeout(
    () => $item.classList.remove(config.classes.hidden),
    config.animation.timeout
  );
}

function _createItem({ id, text, complete }) {

  /*
   * For legibility, we define all the required element props in one place.
   * These will be passed to the `_createElement()` function.
   */
  const elements = {
    listItem: {
      type: 'li',
      text: null,
      className: config.classes.item,
      id: id,
    },
    itemText: {
      type: 'span',
      text: text,
      className: config.classes.text,
    },
    completeBtn: {
      type: 'button',
      text: 'mark this item complete',
      className: config.classes.button.complete,
    },
    deleteBtn: {
      type: 'button',
      text: 'delete this item',
      className: config.classes.button.delete,
    },
  };

  // Create elements using a helper function
  const $item = _createElement(elements.listItem);
  const $itemText = _createElement(elements.itemText);
  const $complete = _createElement(elements.completeBtn);
  const $delete = _createElement(elements.deleteBtn);

  // Append the text and button elements to the item.
  $item.appendChild($itemText);
  $item.appendChild($complete);
  $item.appendChild($delete);

  return $item;
}

function _createElement({type, text, className = '', id = false}) {
  const $element = document.createElement(type);
  $element.textContent = text;
  $element.className = className;
  $element.id = !!id ? id : null;

  return $element;
}

function _removeItem($item, callback) {
  $item.classList.add(config.classes.hidden);

  setTimeout(() => {
    $item.remove();

    callback($item);
  }, config.animation.timeout);
}

/**
 * Adds the given class to the given item, if the given condition is true, or
 * removes it if the condition is false.
 *
 * @param  {Boolean} condition determines whether to add or remove the class
 * @param  {Element} $item     the DOM element to modify
 * @param  {String}  className the class name to add or remove
 *
 * @return {void}
 */
function _maybeAddClass(condition, $item, className) {
  const fn = condition ? 'add' : 'remove';
  $item.classList[fn](className);
}

function _handleDoubleClick($list, event) {
  const listID = ListStore.getListID();
  let $target = event.target;
  while ($target !== $list) {
    if ($target.nodeName === 'LI') {
      event.preventDefault();
      dispatch({
        type: actions.ITEM_USER_IS_EDITING,
        listID: listID,
        itemID: $target.id,
      });

      // No need to continue looping, so let's return after dispatching.
      return;
    }

    $target = $target.parentNode;
  }
}

function _handleClick(event) {
  let target = event.target;

  if (target.nodeName === 'BUTTON' && !!target.parentNode.id) {
    event.stopPropagation();

    const id = target.parentNode.id;
    let action = false;

    if (target.className === config.classes.button.delete) {
      action = actions.ITEM_DELETE;
    }

    if (target.className === config.classes.button.complete) {
      action = actions.ITEM_MARK_COMPLETE;
    }

    if (!!action) {
      dispatch({
        type: action,
        itemID: id,
      });
    }
  }
}

const instance = new List();
export default instance;
