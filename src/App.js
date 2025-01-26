import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NameInput from "./components/NameInput";
import GamePage from "./components/GamePage";
const App = () => {
    return (_jsx(Router, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(NameInput, {}) }), _jsx(Route, { path: "/game", element: _jsx(GamePage, {}) })] }) }));
};
export default App;
