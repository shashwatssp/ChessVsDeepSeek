import { jsx as _jsx } from "react/jsx-runtime";
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import ErrorBoundary from './ErrorBoundary';
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(ErrorBoundary, { children: _jsx(App, {}) }));
