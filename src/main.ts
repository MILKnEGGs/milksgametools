import { mount } from 'svelte';
import App from './App.svelte';
import './style.css';

declare global {
  const __APP_VERSION__: string;
}

// iOS Safari ignores user-scalable=no; its own gesture events are the only way to stop
// a multi-finger tap on a tracker from pinch-zooming the page.
for (const type of ['gesturestart', 'gesturechange']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}

mount(App, { target: document.getElementById('app')! });
