
/**
 * Module dependencies.
 */

var virtual = require('virtualize');

/**
 * Export
 */

module.exports = function(scene){
  return render(scene.root);
};

/**
 * Render a component to a string
 *
 * @param {Entity}
 *
 * @return {String}
 */

function render(entity) {
  entity.commit();
  entity.beforeMount();
  var node = entity.render();
  return nodeToString(node, '0');
}

/**
 * Render a node to a string
 *
 * @param {Node} node
 * @param {Tree} tree
 *
 * @return {String}
 */

function nodeToString(node, path) {

  // text
  if (node.type === 'text') {
    return node.data;
  }

  // element
  if (node.type === 'element') {
    var children = node.children;
    var attributes = node.attributes;
    var tagName = node.tagName;
    var innerHTML = attributes.innerHTML;
    var str = '<' + tagName + attrs(attributes) + '>';

    if (innerHTML) {
      str += innerHTML;
    } else {
      for (var i = 0, n = children.length; i < n; i++) {
        str += nodeToString(children[i], path + '.' + i);
      }
    }

    str += '</' + tagName + '>';
    return str;
  }

  // component
  if (node.type === 'component') {
    return render(new Entity(node.component, node.props));
  }

  throw new Error('Invalid type');
}

/**
 * HTML attributes to string.
 *
 * @param {Object} attributes
 * @return {String}
 * @api private
 */

function attrs(attributes) {
  var str = '';
  for (var key in attributes) {
    if (key === 'innerHTML') continue;
    str += attr(key, attributes[key]);
  }
  return str;
}

/**
 * HTML attribute to string.
 *
 * @param {String} key
 * @param {String} val
 * @return {String}
 * @api private
 */

function attr(key, val) {
  return ' ' + key + '="' + val + '"';
}
