import { jsx as _jsx } from "react/jsx-runtime";
import { Component } from 'react';
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true };
    }
    componentDidCatch(error, errorInfo) {
        console.error('Error caught by Error Boundary:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return _jsx("div", { children: "Something went wrong." });
        }
        return this.props.children;
    }
}
export default ErrorBoundary;
