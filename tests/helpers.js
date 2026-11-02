// Minimal canvas / control surfaces for testing the real UI components in Node.
export function createFakeDOM() {
  const elements = new Map(),
    gradients = [],
    fills = [],
    downloads = [];
  const context = () => ({
    globalCompositeOperation: "source-over",
    fillStyle: null,
    createRadialGradient(...coordinates) {
      const gradient = {
        coordinates,
        stops: [],
        addColorStop(offset, color) {
          this.stops.push({ offset, color });
        },
      };
      gradients.push(gradient);
      return gradient;
    },
    fillRect(...rectangle) {
      fills.push({ rectangle, gradient: this.fillStyle });
    },
    clearRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fillText() {},
    drawImage() {},
    setTransform() {},
    getImageData() {
      return { data: new Uint8ClampedArray(4) };
    },
    putImageData() {},
  });
  const element = (id) => {
    if (!elements.has(id)) {
      const ctx = context();
      elements.set(id, {
        id,
        width: 1,
        height: 1,
        value: "",
        textContent: "",
        innerHTML: "",
        checked: false,
        disabled: false,
        handlers: {},
        classList: { toggle() {} },
        setAttribute() {},
        addEventListener(type, callback) {
          this.handlers[type] = callback;
        },
        closest() {
          return { firstChild: { textContent: id } };
        },
        getContext() {
          return ctx;
        },
        click() {
          downloads.push(this);
        },
        toDataURL() {
          return "data:image/png;base64,test";
        },
      });
    }
    return elements.get(id);
  };
  const document = {
    getElementById: element,
    querySelectorAll: () => [],
    createElement: (tag) => element(`${tag}-${elements.size}`),
  };
  globalThis.document = document;
  return { document, element, gradients, fills, downloads };
}
