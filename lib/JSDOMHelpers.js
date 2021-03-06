'use strict'; // eslint-disable-line strict
require('proto-lib').get('_');
const JSDOMConstants = require('./JSDOMConstants');
const JSDOMStat = require('./JSDOMStat');

/**
* @param {JSDOMIndex} set Filters the element set by the "nth" property.
* @param {Array<Object>} elems The array of elements to filter.
* @param {Object} nth The "nth" object from the parsed selector.
* @return {Array<Object>} The element set filtered by the selctor's nth value.
*/
function filterByNth(elems, nth) {
  if (JSDOMConstants.POLL_SELECTOR_STATS) JSDOMStat.current.cycles.nth++;

  if (!nth || typeof nth !== 'object') return elems;
  let n = nth.value;

  if (typeof n === 'string') {
    n = n.toLowerCase();
    if (n === 'last') {
      n = elems.length - 1;
    } else if (n === 'first') {
      n = 0;
    } else if (n === 'middle') {
      n = Math.ceil(elems.length / 2) - 1;
    }
  }

  switch (nth.operator) {
    case '>':
      return elems.slice(n + 1, elems.length);
    case '<':
      return elems.slice(0, n);
    case '>=':
      return elems.slice(n, elems.length);
    case '<=':
      return elems.slice(0, n + 1);

    case '!=':
    case '!~':
      return elems._.whereKeys(k => k != n); // eslint-disable-line eqeqeq

    default: return elems[n] ? [elems[n]] : [];
  }
}

/**
* Filters the given element set by the given parent. If an element in the set doesn't have *parent* as its parent, it
* will be removed.
* @param {Array<Object>} elements The set of elements to filter.
* @param {Object} parent The parent element.
* @param {Array<Object>} filtered The filtered elements (for recursion only).
* @return {Array<Object>} A new array of elements, filtered by the parent object.
*/
function filterByDescendants(elements, parent, filtered) {
  if (JSDOMConstants.POLL_SELECTOR_STATS) JSDOMStat.current.cycles.descendants++;

  if (typeof parent !== 'object') return elements;
  filtered = filtered || [];

  elements._.each(e => {
    if (JSDOMConstants.POLL_SELECTOR_STATS) JSDOMStat.current.cycles.descendants++;
    if (e.parent().uid === parent.uid) filtered.push(e);
  });

  if (typeof parent === 'object') {
    parent.childElements()._.every(child => filterByDescendants(elements, child, filtered));
  }

  return filtered;
}

/**
* Filters the given set of elements by the given set of attributes.
* @param {Array<Object>} elements The set of elements to filter.
* @param {Object<Object>} attributes The set of properties to filter.
* @return {Array<Object>} A new array of elements, filtered by attributes.
*/
function filterByAttributes(elements, attributes) {
  if (JSDOMConstants.POLL_SELECTOR_STATS) JSDOMStat.current.cycles.attributes++;
  if (!attributes || attributes._.size() < 1) return elements;
  const filtered = [];

  elements._.each(e => {
    let valid = true;

    valid = attributes._.every((filters, property) => {
      if (JSDOMConstants.POLL_SELECTOR_STATS) JSDOMStat.current.cycles.attributes++;

      return filters._.every(filter => {
        if (JSDOMConstants.POLL_SELECTOR_STATS) JSDOMStat.current.cycles.attributes++;

        const dotIdx = property.indexOf('.');
        let value = e.prop(property);
        let regex;

        if (value !== undefined || dotIdx !== -1) {
          if (filter.value !== undefined && dotIdx !== -1) value = e.val()._.findChildAtPath(property);

          switch (filter.operator) {
            case '=' : if (value != filter.value) valid = false; break; // eslint-disable-line eqeqeq
            case '!=': if (value == filter.value) valid = false; break; // eslint-disable-line eqeqeq

            case '<' : if (parseFloat(value) >= parseFloat(filter.value)) valid = false; break;
            case '>' : if (parseFloat(value) <= parseFloat(filter.value)) valid = false; break;
            case '<=': if (parseFloat(value)  > parseFloat(filter.value)) valid = false; break; // eslint-disable-line
            case '>=': if (parseFloat(value)  < parseFloat(filter.value)) valid = false; break; // eslint-disable-line

            case '?=':
              if (value instanceof Array) {
                if (value.indexOf(filter.value) === -1) valid = false;
              } else if (value && typeof value === 'object') {
                if (!value[filter.value]) valid = false;
              } else {
                valid = false;
              }
              break;

            case '?!':
              if (value instanceof Array) {
                if (value.indexOf(filter.value) !== -1) valid = false;
              } else if (value && typeof value === 'object') {
                if (value[filter.value]) valid = false;
              } else {
                valid = false;
              }
              break;

            case '~':
              try {
                if (value === null || value === undefined) {
                  valid = false;
                } else {
                  regex = new RegExp(filter.value);
                  if (regex.test(value.toString().trim()) === false) valid = false;
                }
              } catch (err) {
                valid = false;
              }
              break;

            case '!~':
              try {
                if (value === null || value === undefined) {
                  valid = false;
                } else {
                  regex = new RegExp(filter.value);
                  if (regex.test(value.toString().trim()) === true) valid = false;
                }
              } catch (err) {
                valid = false;
              }
              break;

            default:
              /* No Op */
          }
        } else {
          valid = false;
        }
        // Break every loop if we failed a filter...
        if (!valid) return false;
        return true;
      });
    });

    // Element has passed all filters...
    if (valid === true) filtered.push(e);
  });
  return filtered;
}

/**
* Gets the set of children elements of the given element.
* @param {Object} e The element to get the children from.
* @param {JSDOMIndex} set The JSDOM object the element belongs to.
* @return {Array<Object>} The children of the element e.
*/
function getChildrenOf(e) {
  if (e && typeof e === 'object') return e.childElements() || [];
  return [];
}

/**
* Walks the parsed selector object by "paths", or the tokenized selector split by spaces.
* @param {JSDOMIndex} index The JSDOMIndex instance to find elements from.
* @param {Object} parsed The parsed selector.
* @param {Object=} parent The parent object of the current element set (for recursion only)
* @return {Array<Object>} The set of elements matching the given parsed selector.
*/
function filterByParsedSelector(index, parsed, parent) {
  if (JSDOMConstants.POLL_SELECTOR_STATS) JSDOMStat.current.cycles.selector++;

  if (!(index instanceof require('./JSDOMIndex'))) { // eslint-disable-line global-require
    throw new Error('JSDOMIndex~filterByParsedSelector expected argument #0 (set) to be an instance of JSDOM.');
  }

  // The level of the current element.
  const level = typeof parent === 'object' ? parent.lvl() + 1 : 0;
  // The final set of elements found using the given selector
  let result = [];
  // The current "path" (or selector in a selector string).
  const current = parsed.shift();
  // The nth property from the current path
  const nth = current.nth;
  // The current term (e.g. selector type and identifier).
  const term = current.terms[0];
  // An intermediate set of elements.
  let elems = [];
  // An intermediate set of filtered elements.
  let filtered;

  if ((term.type !== 'wildcard' && term.type !== 'ascendant' && term.type !== 'descendant') || parsed._.size() !== 0) {
    if (term.type === 'wildcard') {
      elems = index.with.delta(level);
      if (!elems || elems.length === 0) return [];
      filtered = filterByNth(filterByDescendants(filterByAttributes(elems, current.filters), parent), nth);
    } else if (term.type === 'descendant') {
      filtered = filterByNth(
        filterByAttributes(level === 0 ? index.with.level(0) : getChildrenOf(parent), current.filters),
        nth
      );
    } else if (term.type === 'ascendant') {
      filtered = filterByNth(filterByAttributes(parent ? [parent] : [], current.filters), nth);
    } else {
      elems = index.with[term.type](term.value);
      if (elems.length === 0) return [];

      if (current.terms.length > 1) {
        const newSet = [];
        let nextSet;

        current.terms._.each(1, nextTerm => {
          nextSet = index.with[nextTerm.type](nextTerm.value);
          elems._.every(e => {
            if (nextSet.indexOf(e) !== -1) newSet.push(e);
            return true;
          });
        });
        elems = newSet;
      }
    }

    filtered = filterByNth(filterByDescendants(filterByAttributes(elems, current.filters), parent), nth);
    if (parsed.length === 0) {
      result = filtered;
    } else {
      filtered._.every(e => {
        if (JSDOMConstants.POLL_SELECTOR_STATS) JSDOMStat.current.cycles.selector++;
        result = typeof parsed[0] === 'object' && parsed[0].terms[0].type === 'ascendant'
          ? result.concat(filterByParsedSelector(
              index,
              parsed._.clone(),
              index.with.uid(e.parent() ? e.parent().uid : null)[0])
            )
          : result.concat(filterByParsedSelector(index, parsed._.clone(), e));

        return true;
      });
    }
  } else if (term.type === 'wildcard') {
    return index.with.delta(level) ?
    filterByNth(filterByDescendants(filterByAttributes(index.with.delta(level), current.filters), parent), nth) : [];
  } else if (term.type === 'descendant') {
    return filterByNth(
      filterByAttributes(level === 0 ? index.with.level(0) : getChildrenOf(parent), current.filters),
      nth
    );
  } else if (term.type === 'ascendant') {
    return filterByNth(filterByAttributes(parent ? [parent] : [], current.filters), nth);
  }
  return result._.makeUnique();
}

/**
* Finds the elements that match the given selector.
* @param {JSDOMIndex} index The JSDOM instance to find elements from.
* @param {String} selector The selector used to find matching elements.
* @return {Array<Object>} The set of matching elements, or an empty array if no matches were found.
*/
function findElementsWithSelector(index, selector, tokens) {
  if (!(index instanceof require('./JSDOMIndex'))) { // eslint-disable-line global-require
    throw new Error('JSDOM~findElementsBySelector expected argument #0 (index) to be an instance of JSDOM.');
  }

  if (!selector || typeof selector !== 'string') {
    throw new Error('JSDOM~findElementsBySelector expected argument #1 (selector) to be a non-empty string.');
  }

  if (!(tokens instanceof Array)) {
    throw new Error('JSDOM~findElementsBySelector expected argument #2 (tokens) to be an array.');
  }

  let m;
  const paths = [];

  if (JSDOMConstants.POLL_SELECTOR_STATS) JSDOMStat.new(selector);

  // Loop through all the tokens, and break the selector tokens into
  // its various parts.
  tokens._.each(token => {
    token = token.trim();
    const noAttributes = token.replace(/(\[.*\])$/g, '');
    const filters = {};
    let nth = null;

    // Dissect all the bracket attributes from the selector token
    while (m = JSDOMConstants.BRACKET_DISSECTOR.exec(token)) { // eslint-disable-line no-cond-assign
      if (m.length > 3) {
        const value = m[3]
          .replace(/^'(.*)'$/, '$1')
          .replace(/^"(.*)"$/, '$1')
          ._.toJSValue();

        const operator = m[2];
        const variable = m[1];

        if (variable === 'nth') {
          nth = { operator, value };
        } else {
          if (!filters[variable]) filters[variable] = [];
          filters[variable].push({ operator, value });
        }
      }
    }

    const terms = noAttributes.match(index.regexps.properties);

    // Loop through all the "terms" of a token
    terms._.each((term, key) => {
      if (JSDOMConstants.POLL_SELECTOR_STATS) JSDOMStat.current.cycles.parsing++;
      term = term.replace(/\{ *([\s\S]+?) *}/g, '$1').trim();

      terms[key] = {
        value: term.length === 1 ? term : term.substr(1, term.length),
        type: index.map._.invert()[term[0]],
      };
    });

    paths.push({ terms, nth, filters });
  });

  // Actually evaluate the selector...
  const res = filterByParsedSelector(index, paths);

  if (JSDOMConstants.POLL_SELECTOR_STATS) JSDOMStat.current.end(res.length);
  return res;
}

module.exports = findElementsWithSelector;
