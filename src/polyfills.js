// Must be loaded before any scoped custom element registry is created.
// The polyfill always replaces a native implementation.
import '@webcomponents/scoped-custom-element-registry';

// The polyfill (0.0.10) only understands the older option names `registry` and
// `customElements`. Map the standardized `customElementRegistry` option onto them
// so components can use the standard API:
// https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow#customelementregistry
const attachShadow = Element.prototype.attachShadow;
Element.prototype.attachShadow = function (init, ...args) {
  const { customElementRegistry, ...rest } = init;
  const polyfillInit = customElementRegistry ? { ...rest, registry: customElementRegistry } : rest;
  return attachShadow.call(this, polyfillInit, ...args);
};
