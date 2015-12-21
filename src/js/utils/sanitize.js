import {curry, compose} from './helper';

// To make them work with composition, let's wrap the necessary string methods.
const lowercase = curry(str => str.toLowerCase());
const trim = curry(str => str.trim());
const replace = curry((toMatch, replacement, str) => {
  return str.replace(toMatch, replacement);
});

/*
 * These functions keep the API a little more readable by naming their actions.
 *
 * In the first group, we replace unsafe (not A-Z, 0-9, or -) with '-' or ' '.
 */
const unsafe = replace(/[^A-z0-9\-+]/g);
const unsafeToHyphen = unsafe('-');
const unsafeToSpace = unsafe(' ');

// If multiple hyphens are next to each other, combine them to a single hyphen.
const hyphenDedupe = replace(/[-]{2,}/g, '-');

// Reduce whitespace to a single space between characters.
const spaceDedupe = replace(/[\s]{2,}/g, ' ');

// Remove leading or trailing hyphens from the string.
const hyphenTrim = replace(/^-|-$/g, '');

/*
 * Using our `compose()` helper, combine the functions into helper functions
 * that we can use to create a sanitized URL slug and list name, repsectively.
 */
export const safeSlug = compose(lowercase, hyphenTrim, hyphenDedupe, unsafeToHyphen);
export const safeName = compose(trim, spaceDedupe, unsafeToSpace);
