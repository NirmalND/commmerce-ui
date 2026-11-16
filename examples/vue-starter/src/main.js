import { createApp } from 'vue';
// Poppins and the --cm-* design tokens. Load them once, before any component renders.
import '@commmerce/tokens/fonts.css';
import '@commmerce/tokens/tokens.css';
// Registers every cm-* element. Import it before mounting, so Vue sees their properties.
import '@commmerce/ui';
import './app.css';
import App from './App.vue';

createApp(App).mount('#app');
