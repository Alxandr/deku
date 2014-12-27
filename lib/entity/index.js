
/**
 * Module dependencies.
 */

var assign = require('sindresorhus/object-assign');
var Emitter = require('component/emitter');
var equals = require('jkroso/equals');
var each = require('component/each');
var virtual = require('../virtual');

/**
 * ID counter.
 */

var i = 0;

/**
 * Expose `Entity`.
 */

module.exports = Entity;

/**
 * A rendered component instance.
 *
 * This manages the lifecycle, props and state of the component.
 *
 * @param {Function} Component
 * @param {Object} props
 */

function Entity(Component, props) {
  this.id = (i++).toString(32);
  this.component = new Component();
  this.props = props || {};
  this.state = this.component.initialState();
  this.children = {};
  this.current = this.render();
  this.previous = null;
  this.dirty = false;
  this.lifecycle = null;
  this._pendingProps = null;
  this._pendingState = null;

  // when component state changes.
  this.component.on('change', this.setState.bind(this));

  // TODO: This should know the current lifecycle state of the
  // component so that we can do things like preventing updates
  // while unmounting
  // this._canRender = true;
}

/**
 * Entity is an emitter.
 */

Emitter(Entity.prototype);

/**
 * Get an updated version of the virtual tree.
 *
 * @return {VirtualTree}
 */

Entity.prototype.render = function(){
  var node = this.component.render(virtual.node, this.state, this.props);
  if (!node) {
    throw new Error('Component#render must return a Node using the dom object');
  }
  return virtual.tree(node);
};

/**
 * Set the props.
 *
 * @param {Object} nextProps
 * @param {Function} done
 */

Entity.prototype.setProps = function(nextProps, done){
  if (done) this.once('update', done);
  this._pendingProps = nextProps;
  this.propsChanged(nextProps);
  this.invalidate();
};

/**
 * Set the state. This can be called multiple times
 * and the state will be MERGED.
 *
 * @param {Object} nextState
 * @param {Function} done
 */

Entity.prototype.setState = function(nextState, done){
  if (this.lifecycle === 'beforeUpdate') {
    throw new Error('You can\'t call setState in the beforeUpdate hook. Use the propsChanged hook instead.');
  }
  if (done) this.once('update', done);
  this._pendingState = assign(this._pendingState || {}, nextState);
  this.invalidate();
};

/**
 * Schedule this component to be updated on the next frame.
 */

Entity.prototype.invalidate = function(){
  this.dirty = true;
  if (this.scene) this.scene.dirty = true;
};

/**
 * Add an entity as a child of this entity
 *
 * @param {String} path
 * @param {Entity} entity
 */

Entity.prototype.addChild = function(path, Component, props){
  var child = new Entity(Component, props);
  this.children[path] = child;
  child.addToScene(this.scene);
  return child;
};

/**
 * Get the child entity at a path
 *
 * @param {String} path
 *
 * @return {Entity}
 */

Entity.prototype.getChild = function(path) {
  return this.children[path];
};

/**
 * Get the path of a node in it's current tree
 *
 * @param {Node} node
 *
 * @return {String}
 */

Entity.prototype.getPath = function(node) {
  return this.current.getPath(node);
};

/**
 * Add this entity to a Scene. Whenever this entity
 * is changed, it will mark the scene as dirty.
 *
 * @param {Scene} scene
 */

Entity.prototype.addToScene = function(scene){
  this.scene = scene;
};

/**
 * Remove an entity from this component and return it.
 *
 * @param {String} path
 *
 * @return {Entity}
 */

Entity.prototype.removeChild = function(path){
  var entity = this.children[path];
  entity.scene = null;
  delete this.children[path];
  return entity;
};

/**
 * Should this entity be updated and rendered?
 *
 * @param {Object} nextState
 * @param {Object} nextProps
 *
 * @return {Boolean}
 */

Entity.prototype.shouldUpdate = function(nextState, nextProps){
  if (nextProps && !equals(nextProps, this.props)) {
    return true;
  }
  if (nextState && !equals(nextState, this.state)) {
    return true;
  }
  return false;
};

/**
 * Update the props on the component.
 *
 * @return {Node}
 */

Entity.prototype.update = function(){
  var nextProps = this._pendingProps;
  var nextState = assign({}, this.state, this._pendingState);

  // pre-update. This callback could mutate the
  // state or props just before the render occurs
  this.beforeUpdate(nextState, nextProps);

  // Compare the state and props to see if we really need to render
  if (!this.shouldUpdate(nextState, nextProps)) return false;

  // commit the changes.
  var previousState = this.state;
  var previousProps = this.props;
  this.state = nextState;
  this.props = nextProps;

  // reset.
  this._pendingState = null;
  this._pendingProps = null;

  // remove the force flag.
  delete this.state.__force__;

  // Signal that something changed
  return true;
};

/**
 * Set the current version of the tree and mark this
 * entity as not dirty. This is called once the entity
 * has been rendered/updated on the scene.
 *
 * @param {Tree} tree
 */

Entity.prototype.setCurrent = function(tree){
  this.previous = this.current;
  this.current = tree;
  this.dirty = false;
};

/**
 * Remove the component from the DOM.
 */

Entity.prototype.remove = function(){
  this.off();
  each(this.children, function(path, child){
    child.remove();
  });
  this.children = {};
};

/**
 * Trigger `beforeUpdate` lifecycle hook.
 *
 * @param {Object} nextState
 * @param {Object} nextProps
 */

Entity.prototype.beforeUpdate = function(nextState, nextProps){
  this.lifecycle = 'beforeUpdate';
  this.component.beforeUpdate(this.state, this.props, nextState, nextProps);
  this.lifecycle = null;
};

/**
 * Trigger `afterUpdate` lifecycle hook.
 *
 * @param {Object} previousState
 * @param {Object} previousProps
 */

Entity.prototype.afterUpdate = function(previousState, previousProps){
  this.emit('update');
  this.component.afterUpdate(this.state, this.props, previousState, previousProps);
};

/**
 * Trigger `beforeUnmount` lifecycle hook.
 *
 * @param {HTMLElement} el
 */

Entity.prototype.beforeUnmount = function(el){
  this.component.beforeUnmount(el, this.state, this.props);
};

/**
 * Trigger `afterUnmount` lifecycle hook.
 */

Entity.prototype.afterUnmount = function(){
  this.component.afterUnmount(this.state, this.props);
};

/**
 * Trigger `beforeMount` lifecycle hook.
 */

Entity.prototype.beforeMount = function(){
  this.component.beforeMount(this.state, this.props);
};

/**
 * Trigger `afterMount` lifecycle hook.
 *
 * @param {HTMLElement} el
 */

Entity.prototype.afterMount = function(el){
  this.component.afterMount(el, this.state, this.props);
};

/**
 * Trigger `propsChanged` lifecycle hook.
 *
 * @param {Object} nextProps
 */

Entity.prototype.propsChanged = function(nextProps){
  this.component.propsChanged(nextProps);
};