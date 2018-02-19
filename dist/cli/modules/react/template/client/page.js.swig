import React from 'react';
import { render } from 'react-dom';
import {{ pageComponent }} from './pages/{{ page }}.js';

const state = window.__appState;

render(<{{ pageComponent }} data={state} />, document.getElementById('app'));