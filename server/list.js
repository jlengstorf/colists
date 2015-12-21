'use strict';

/*
 * This loads config data from a file in the `config` folder. It starts by
 * looking for a file that matches the current `NODE_ENV` before trying
 * `default.js`.
 */
const config = require('getconfig');

const MongoDB = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;

const debug = require('debug')('server/list');

module.exports = socket => {

  /*
   * Since we only want peers who are looking at the same list to synchronize
   * their data, we want each peer to connect to a room named with the list's
   * ID. That makes it quick and easy to broadcast events in a targeted way,
   * since all of our events will pass the list's ID as part of the payload.
   */
  socket.on('SERVER_JOIN_ROOM', room => {
    debug(`user#${socket.id} joined room "${room}".`);
    socket.join(room);

    // Currently this does nothing, but could be used to keep a user count.
    socket.broadcast.to(room).emit('SERVER_PEER_JOINED_ROOM', { id: socket.id });
  });

  /*
   * For a user loading someone else's list for the first time — or if they try
   * to load a list that doesn't exist — they won't have the list data in
   * IndexedDB. When that happens, they end up here. The server will look for a
   * list matching the ID. If one exists, it's returned. Otherwise, we let the
   * user know that no list by that name exists.
   */
  socket.on('SERVER_LIST_INITIAL_LOAD', data => {
    debug(`Attempting to load list#${data.listID}.`);

    if (data.listID) {
      getListById(data.listID, (db, error, list) => {
        if (!!list && 'id' in list) {
          debug('Found the list. Dispatching!', list);
          socket.emit('SERVER_LIST_LOADED', list);
        } else {
          debug('No list with that ID exists.');
          socket.emit('SERVER_LIST_NOT_FOUND');
        }
      });
    } else {
      debug('No list ID supplied!', data);
    }
  });

  /*
   * When a list item is being edited, we want to lock it for all other users.
   * Otherwise, we could end up with data collisions and overwrites, which
   * would make the app suck to use. To avoid that, we listen for an event
   * telling us that an item is being edited, then pass that along to all other
   * connected peers.
   *
   * This same event is used to reenable the item. See the client-side code for
   * more information about how that's handled.
   */
  socket.on('SERVER_ITEM_PEER_IS_EDITING', data => {
    debug('SERVER_ITEM_PEER_IS_EDITING', data);
    socket.broadcast.to(data.listID).emit('SERVER_ITEM_PEER_IS_EDITING', data);
  });

  /*
   * When a user mutates the list data, we need to save it, then notify all
   * connected peers about the change.
   */
  socket.on('SERVER_LIST_USER_UPDATED', newState => {
    debug('SERVER_LIST_USER_UPDATED', newState);

    if (newState.id) {
      getListById(newState.id, (db, error, oldState) => {
        if (error) {
          debug(error);
        }

        if (!!oldState && 'id' in oldState) {

          debug(`list#${oldState.id} last updated at ${oldState.updated}.`);
          debug(`the most recent change was made at ${newState.updated}.`);

          /*
           * We can be fairly certain the list exists if we get to this
           * point. Next, we need to check if the list has been updated.
           */
          if (oldState.updated < newState.updated) {

            debug(`Merging the changes to the list.`);

            // The list is out of date. Let's sync it up!
            let mergedState = {
              id: newState.id,
              name: newState.name,
              items: {},
              updated: newState.updated,
            };

            /*
             * Just to be sure we don't overwrite data, we loop over each item
             * and only insert new or updated items.
             *
             * By looping over the new list's keys, we also make sure to remove
             * deleted items.
             */
            Object.keys(newState.items).forEach(itemKey => {
              const oldItem = oldState.items[itemKey];
              const newItem = newState.items[itemKey];

              // By default, use the old item.
              let item = oldItem;

              if (!oldItem || newItem.updated > oldItem.updated) {
                item = newItem;
              }

              mergedState.items[itemKey] = item;
            });

            // With the merged list, update the list in the database.
            db.collection('lists').updateOne(
              { id: { $eq: mergedState.id } },
              mergedState
            )
              .then(result => {
                debug(`List#${mergedState.id} updated.`, mergedState);

                // Only notify peers looking at this list.
                socket.broadcast.to(mergedState.id).emit(
                  'SERVER_LIST_PEER_UPDATED',
                  mergedState
                );
              });

          } else {
            debug(`No changes to list#${oldState.id}.`);
          }

        } else {

          /*
           * The list doesn't exist in the database, so we need to store it and
           * broadcast the new state to any connected peers.
           */
          db.collection('lists').insertOne(newState)
            .then(result => {
              debug(`New list saved with ID ${newState.id}.`);

              // Only notify peers looking at this list.
              socket.broadcast.to(newState.id).emit(
                'SERVER_LIST_PEER_UPDATED',
                newState
              );
            });

        }

        db.close();
      });
    } else {

      // It shouldn't be possible to get here, but just in case...
      console.error(
        'SERVER_LIST_USER_UPDATED called with an invalid payload.',
        newState
      );
    }
  });

};

/**
 * A helper function to connect to MongoDB, load a list, and do stuff with it.
 *
 * @param  {String}   listID   the list ID to load
 * @param  {Function} callback what to do with the list once it's loaded
 * @return {void}
 */
function getListById(listID, callback) {
  MongoDB.connect(config.mongodb.uri, (error, db) => {
    if (error) {
      console.error(error);
    }

    /*
     * Loads the first list (should be the only one) matching the list ID.
     * Once it's loaded, it fires the callback. Using `bind()`, we partially
     * apply the `db` argument so it's available inside the callback.
     */
    db.collection('lists').find({ id: { $eq: listID } }).limit(1)
      .next(callback.bind(null, db));
  });
}
