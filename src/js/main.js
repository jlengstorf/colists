// Styles are loaded by webpack (see `webpack.config.js` for details).
import '../css/main.css';

// Actual JavaScript starts here.
import App from './blocks/app';

// This is where things start happening.
setTimeout(() => { App.initialize(); }, 1500);
