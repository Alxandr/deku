
/**
 * Dependecies
 */

var merge = require('yields/merge');
var Mount = require('../mount');

/**
 * Define propibute.
 */

exports.prop = function(name, val){
  this.props[name] = val;
  return this;
};

/**
 * Define states.
 */

exports.state = function(name, val){
  this.states[name] = val;
  return this;
};

/**
 * Use plugin.
 *
 * @param {Function|Object} plugin passing an object will extend the prototype
 * @return {Component}
 * @api public
 */

exports.use = function(plugin){
  if ('function' === typeof plugin) {
    plugin(this);
  }
  else {
    merge(this.prototype, plugin);
  }
  return this;
}

/**
 * Mount this component to a node
 */

exports.render = function(container, props) {
  var mount = new Mount(this, props);
  mount.renderTo(container);
  return mount;
}

/**
 * Render this component to a string
 */

exports.renderToString = function(props) {

}
