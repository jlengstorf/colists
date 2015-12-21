/*
 * # models/list.js
 * This is a simple class to enforce a data structure when creating new items.
 */
import Immutable from 'immutable';

import {safeName, safeSlug} from '../utils/sanitize';
import Item from './item';

export default class List {

  /**
   * ## List.constructor()
   * Accepts the item data and cleans it up for storage.
   *
   * @param  {mixed}   options.id       (optional) existing item ID
   * @param  {String}  options.text     the item text
   * @param  {Boolean} options.complete whether or not the item is complete
   *
   * @return {Object}                   the modeled data
   */
  constructor({
    id = false,
    name = false,
    items = {},
    updated = false,
  } = {}, hasUpdated = true) {
    if (!name) {
      throw Error('Lists require a name.');
    }

    /*
     * In order to enforce the right data structure for items, loop through and
     * create a new `Item` for each.
     */
    let itemRecords = {};
    if (items) {
      Object.keys(items).forEach(key => {
        itemRecords[String(items[key].id)] = new Item(items[key], false);
      });
    }

    return Immutable.fromJS({
      id: id || `${Date.now()}-${safeSlug(name)}`,
      updated: (!hasUpdated && !!updated) ? updated : Date.now(),
      name: safeName(name),
      items: itemRecords,
    });
  }

}
