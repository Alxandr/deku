
var assert = require('component/assert@0.4.0');
var component = require('/lib/component');

describe('text', function(){
  it('should update text nodes', function(){
    var Page = component({
      render: function(dom, state, props) {
        return dom('span', null, [props.one + ' ' + props.two]);
      },
      afterUpdate: function(){
        assert.equal(el.innerHTML, '<span>Hello Pluto</span>');
      }
    });
    var mount = Page.render(el, {
      one: 'Hello',
      two: 'World'
    });
    mount.setProps({
      one: 'Hello',
      two: 'Pluto'
    });
  });

  it('should add text elements', function(){
    var Page = component({
      afterMount: function(el, state, props){
        if (props.i === 0) {
          assert(el.outerHTML === '<div></div>');
        } else {
          assert(el.outerHTML === '<div>bar</div>');
        }
      },
      render: function(dom, state, props) {
        if (props.i === 0) return dom('div');
        return dom('div', null, ['bar'])
      }
    });
    var mount = Page.render(el, { i: 0 });
    mount.setProps({ i: 1 }, function(){
      done();
    });
  });

  it('should remove text elements', function(done){
    var Page = component({
      afterMount: function(el, state, props){
        if (props.i !== 0) {
          assert(el.outerHTML === '<div></div>');
        } else {
          assert(el.outerHTML === '<div>bar</div>');
        }
      },
      render: function(dom, state, props) {
        if (props.i !== 0) return dom('div');
        return dom('div', null, ['bar'])
      }
    });
    var mount = Page.render(el, { i: 0 });
    mount.setProps({ i: 1 }, function(){
      done();
    });
  });

  it('should swap elements with text elements', function(done){
    var Page = component({
      afterMount: function(el, state, props){
        if (props.i === 0) {
          assert(el.innerHTML === '<span></span>');
        } else {
          assert(el.innerHTML === 'bar');
        }
      },
      render: function(dom, state, props) {
        if (props.i === 0) return dom('div', null, [dom('span')])
        return dom('div', null, ['bar'])
      }
    });
    var mount = Page.render(el, { i: 0 });
    mount.setProps({ i: 1 }, function(){
      done();
    });
  });

  it('should swap text elements with elements', function(done){
    var Page = component({
      afterMount: function(el, state, props){
        if (props.i !== 0) {
          assert(el.innerHTML === '<span></span>');
        } else {
          assert(el.innerHTML === 'bar');
        }
      },
      render: function(dom, state, props) {
        if (props.i !== 0) return dom('div', null, [dom('span')])
        return dom('div', null, ['bar'])
      }
    });
    var mount = Page.render(el, { i: 0 });
    mount.setProps({ i: 1 }, function(){
      done();
    });
  });
});
