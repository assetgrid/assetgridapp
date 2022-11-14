import * as React from "react";
import * as ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import App from "./components/App";

import "./mystyles.scss";
import "../index.html";
import "./assets/favicon.png";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

import "./i18n";

ReactDOM.render(
    <React.Suspense fallback="loading">
        <BrowserRouter>
            <App/>
        </BrowserRouter>
    </React.Suspense>,
    document.getElementById("app")
);
