# CoLists — A Real-Time Collaborative Todo App

CoLists is a simple app to demonstrate the concept of real-time collaboration while using the [Flux](https://facebook.github.io/flux/)-style data flow.

By implementing [Socket.IO](https://socket.io), we can maintain a unidirectional data flow in the app, even with multiple users making changes to the app data at the same time.

## Quick Start

    # clone the repo
    git clone git@github.com:jlengstorf/colists.git

    # navigate into the new folder
    cd colists/

    # install dependencies
    npm install

    # start the server
    npm start

The app should now be available at `http://localhost:3001`.

## Client-Side App

In order to avoid a huge number of dependencies, this app rolls its own framework. (See the [notes](#notes) for more information.)

For production, the only dependencies are [`debug`](https://www.npmjs.com/package/debug) (which is only needed for the demo), [Immutable.js](http://facebook.github.io/immutable-js/), [`events`](https://www.npmjs.com/package/events), and [Socket.IO](http://socket.io/).

The app is built with [webpack](https://webpack.github.io) using [PostCSS](https://github.com/postcss/postcss) and [Babel](https://babeljs.io/). This allows us to use [ES2015 syntax](https://babeljs.io/docs/learn-es2015/) in JavaScript and [next-generation CSS](http://cssnext.io/) (plus Sass-like functionality: [nested rules](https://github.com/postcss/postcss-nested), [enhanced `@import`](https://github.com/postcss/postcss-import), and [simpler variable syntax](https://github.com/postcss/postcss-simple-vars)).

## Server

The server in this app only exists for three reasons:

1. Relay peer messages using Socket.IO
2. Maintain a persistent data store for sharing lists using MongoDB
3. Route all requests to `index.html`*

* The only exceptions are the webpack bundles for app JS and CSS.

To accomplish this, the server uses [`mongodb`](https://www.mongodb.org/) and [`socket.io`](https://socket.io).

The data store performs basic logic to merge existing data with new data sent from a connected user. It attempts to be smart about updates by only making changes when a list has been modified.

This implementation leaves a lot to be desired in terms of managing race conditions. Given the simple nature of the app, I _think_ there won't be any issues, but we'll cross that bridge when we come to it.


## Important Notes {#notes}

### This demo uses a simplified, roll-your-own framework.

This could have been built on top of [React](https://facebook.github.io/react/) and [Flux](https://facebook.github.io/flux/) easily enough. And if it were an app that was intended for production, it would have been.

However, this app was built to demonstrate the core concepts behind the Flux data flow, how real-time interactions can fit into the Flux paradigm, and to show that unidirectional data flow is not limited only to React apps.

That being said, the code was _heavily_ influenced by Flux, and the app's views are more or less extremely limited React Components, minus virtual DOM and all the advanced features.

### This is not a production-ready app.

Security has only been lightly addressed, and will require far more attention before this app could ever be called production-ready.

In addition, user management has been completely ignored to make the demo more approachable. As of right now, anyone with the link to a list can edit that list.

There are likely some edge cases that haven't been covered here. The goal of this app is not to build a rock-solid list app, but rather to create a proof-of-concept for concurrent users on a synchronized app state.
