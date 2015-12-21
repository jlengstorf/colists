/*
 * Currying is a way to convert a function that accepts multiple arguments into
 * a series of functions that take a single argument, which allows us to create
 * partially-applied functions.
 *
 * This example comes from Dave Atchley's example:
 * http://www.datchley.name/currying-vs-partial-application/
 */
export function curry(fn) {
  return function curried(...args) {
    return args.length >= fn.length ? fn.call(this, ...args) : (...rest) => {
      return curried.call(this, ...args, ...rest);
    };
  };
}

/*
 * Compose function to allow mashing up functions. This implementation is
 * modified from Edd Mann's example here: http://bit.ly/1Ocn8qY
 */
export function compose(...fns) {
  return fns.reduce((f, g) => (...args) => f(g(...args)));
}
