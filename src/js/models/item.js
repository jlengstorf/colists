/*
 * # ItemModel.js
 * This is a simple class to enforce a data structure when creating new items.
 */
import {Record} from 'immutable';

const ItemRecord = Record({
  id: undefined,
  updated: undefined,
  text: undefined,
  complete: undefined,
});

export default class Item extends ItemRecord {

  /**
   * ## Item.constructor()
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
    updated = false,
    text = false,
    complete = false,
  } = {}, hasUpdated = true) {
    if (!text) {
      throw Error('Empty items are not allowed.');
    }

    /*
     * Either Immutable.js or IndexedDB converts numbers to strings sometimes.
     * Rather than chasing down the unpredictable nature of loose typing, use a
     * string for the ID to ensure we don't get weird duplicates.
     */
    super({
      id: id || 'item' + Date.now(),
      updated: (!hasUpdated && !!updated) ? updated : Date.now(),
      text: text,
      complete: complete,
    });
  }

}
