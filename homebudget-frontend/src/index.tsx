import * as React from "react";
import * as ReactDOM from "react-dom";
import { BrowserRouter, Route } from "react-router-dom";
import App from "./components/App";

import "./mystyles.scss";
import "../index.html";

ReactDOM.render(
    <BrowserRouter>
        <App/>
    </BrowserRouter>,
    document.getElementById("app"),
);