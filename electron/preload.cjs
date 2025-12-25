// Preload script (currently empty). Use this to expose safe APIs to the renderer.
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  // add APIs if needed
});
