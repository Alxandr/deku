
/**
 * Dependencies.
 */

var Interactions = require('./interactions');
var each = require('component/each');
var patch = require('./diff');

/**
 * Export.
 */

module.exports = HTMLRenderer;

/**
 * Handles the rendering of a scene graph by running
 * diffs on the current virtual tree of the entities with
 * the previous version. It then applies this diff to the
 * acutal DOM tree.
 *
 * Instead of using SceneNodes or some other object type, we're
 * just using the entities themselves, since each SceneNode can only
 * have a single entity anyway. In the future we could split these up, but
 * it seems simpler to do it this way for now.
 */

function HTMLRenderer(container) {
  this.container = container;
  this.events = new Interactions(container);
  this.elements = {};
  this.rendered = null;
}

/**
 * Render an entity tree. This should be called on the top
 * level entity that is mounted to the container.
 *
 * @param {Entity} entity
 *
 * @api public
 */

HTMLRenderer.prototype.render = function(entity) {

  // We're rendering a new entity to the scene.
  if (this.rendered !== entity) {
    this.clear();
    this.mountEntity(entity, this.container);
    this.rendered = entity;
    return;
  }

  this.update(entity);
};

/**
 * Update an entity already on the scene.
 *
 * @param {Entity} entity
 *
 * @api private
 * @return {void}
 */

HTMLRenderer.prototype.update = function(entity) {

  // Does this entity even need updating?
  if (!entity.dirty) {
    return this.updateChildren(entity);
  }

  var previousState = entity.state;
  var previousProps = entity.props;
  var updated = entity.update();

  // The props/state were the same
  if (!updated) {
    return this.updateChildren(entity);
  }

  var nextTree = entity.render();

  // Run the diff and patch the element.
  patch(entity, nextTree, this.getElement(entity.id), this);

  // Commit the changes.
  entity.setCurrent(nextTree);
  entity.afterUpdate(previousState, previousProps);
  this.updateEvents(entity);
  this.updateChildren(entity);
};

/**
 * Update all the children of an entity
 *
 * @param {Entity} entity
 */

HTMLRenderer.prototype.updateChildren = function(entity) {
  for (var key in entity.children) {
    this.update(entity.children[key]);
  }
};

/**
 * Clear the scene
 *
 * @return {void}
 */

HTMLRenderer.prototype.clear = function(){
  if (!this.rendered) return;
  this.unmountEntity(this.rendered);
  this.rendered = null;
};

/**
 * Append an entity to an element
 *
 * @param {Entity} entity
 * @param {HTMLElement} container
 *
 * @return {HTMLElement}
 */

HTMLRenderer.prototype.mountEntity = function(entity, container) {
  var el = this.addEntity(entity, container);
  entity.beforeMount();
  container.appendChild(el);
  this.updateEvents(entity);
  entity.afterMount(el);
  return el;
};

/**
 * Remove the entity from the DOM.
 *
 * @param {Entity} entity
 */

HTMLRenderer.prototype.unmountEntity = function(entity){
  var el = this.getElement(entity.id);
  entity.beforeUnmount(el);
  el.parentNode.removeChild(el);
  this.unmountChildren(entity);
  this.removeEvents(entity);
  entity.afterUnmount();
  entity.remove();
  delete this.elements[entity.id];
};

/**
 * Remove all of the child entities of an entity
 *
 * @param {Entity} entity
 */

HTMLRenderer.prototype.unmountChildren = function(entity) {
  var self = this;
  each(entity.children, function(path, child){
    entity.removeChild(path);
    self.unmountEntity(child);
  });
};

/**
 * Get the element for an entity using the entity ID
 *
 * @param {String} id
 *
 * @return {HTMLElement}
 */

HTMLRenderer.prototype.getElement = function(id) {
  return this.elements[id];
};

/**
 * Updates all the DOM event bindings for an entity.
 * It removes all event bindings on the scene for this entity
 * first and just reapplies them using the current tree.
 *
 * @return {void}
 */

HTMLRenderer.prototype.updateEvents = function(entity) {
  var self = this;
  this.events.unbind(entity.id);

  // TODO: Optimize this by storing the events in the Tree
  // object on the initial pass instead of looping again.
  // eg. entity.current.events -> '0.0.1:click': fn
  each(entity.current.nodes, function(path, node){
    if (node.type !== 'element') return;
    each(node.events, function(eventType, fn){
      self.events.bind(entity.id, path, eventType, function(e){
        fn.call(entity.component, e, entity.state, entity.props);
      });
    });
  });
};

/**
 * Unbind all events from an entity
 *
 * @param {Entity} entity
 */

HTMLRenderer.prototype.removeEvents = function(entity) {
  this.events.unbind(entity.id);
};

/**
 * Render an entity as a HTML element
 *
 * @param {Entity} entity
 *
 * @return {HTMLElement}
 */

HTMLRenderer.prototype.addEntity = function(entity, parentEl) {
  var el = this.createElement(entity.current.root, entity.current, entity, parentEl);
  this.elements[entity.id] = el;
  // entity.on('remove', this.unmountEntity);
  return el;
};

/**
 * Convert this node and all it's children into
 * real DOM elements and return it.
 *
 * Passing in a node allows us to render just a small
 * part of the tree instead of the whole thing, like when
 * a new branch is added during a diff.
 *
 * @param {Node} node
 * @param {Tree} tree
 * @param {Entity} entity
 * @param {HTMLElement} parentEl
 *
 * @return {HTMLElement}
 */

HTMLRenderer.prototype.createElement = function(node, tree, entity, optParentEl){
  var path = entity.current.getPath(node);
  var parentEl = optParentEl || document.createDocumentFragment();

  // we can only render nodes that exist within the tree.
  if (!path) throw new Error('Node does not exist in the entity');

  if (node.type === 'text') {
    parentEl.appendChild(document.createTextNode(node.data));
    return parentEl;
  }

  if (node.type === 'element') {
    var el = document.createElement(node.tagName);
    var children = node.children;

    for (var name in node.attributes) {
      el.setAttribute(name, node.attributes[name]);
    }

    // store the path for event delegation.
    el.__path__ = path;
    el.__entity__ = entity.id;

    // add children.
    for (var i = 0, n = children.length; i < n; i++) {
      this.createElement(children[i], tree, entity, el);
    }

    // TODO: Store nodes in a hash so we can easily find
    // elements later. This would allow us to separate out the
    // patching from the diffing will still being efficient. We could
    // also use the same object in the Interactions object to make
    // lookups cleaner instead of checking __ values.
    // this.nodesByPath[entity.id][path] = el;

    parentEl.appendChild(el);
    return el;
  }

  if (node.type === 'component') {
    var child = entity.addChild(path, node.component, node.props);
    return this.mountEntity(child, parentEl);
  }
};
