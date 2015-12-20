# CoLists — A Real-Time Collaborative Todo App

CoLists is a simple app to demonstrate the concept of real-time collaboration while using the [Flux](https://facebook.github.io/flux/)-style data flow.

By implementing [Socket.IO](https://socket.io), we can maintain a unidirectional data flow in the app, even with multiple users making changes to the app data at the same time.

## Important Notes

### This demo uses a simplified, roll-your-own framework.

This could have been built on top of [React](https://facebook.github.io/react/) and [Flux](https://facebook.github.io/flux/) easily enough. And if it were an app that was intended for production, it would have been.

However, this app was built to demonstrate the core concepts behind the Flux data flow, how real-time interactions can fit into the Flux paradigm, and to show that unidirectional data flow is not limited only to React apps.

That being said, the code was _heavily_ influenced by Flux, and the app's views are more or less extremely limited React Components, minus virtual DOM and all the advanced features.

### This is not a production-ready app.

Security has only been lightly addressed, and will require far more attention before this app could ever be called production-ready.

In addition, user management has been completely ignored to make the demo more approachable. As of right now, anyone with the link to a list can edit that list.

There are likely some edge cases that haven't been covered here. The goal of this app is not to build a rock-solid list app, but rather to create a proof-of-concept for concurrent users on a synchronized app state.
