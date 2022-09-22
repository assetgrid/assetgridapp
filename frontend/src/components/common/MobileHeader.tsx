import logo from "../../assets/logo.svg";
import * as React from "react";

interface Props {
    setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>;
    sidebarVisible: boolean;
}

export default function (props: Props) {
    return <div className="mobile-header has-background-dark">
        <img className="logo" src={logo}></img>
        <a role="button"
            className={"navbar-burger" + (props.sidebarVisible ? " is-active" : "")}
            tabIndex={0}
            onClick={toggleSidebar}
            aria-label="menu" aria-expanded={props.sidebarVisible}>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
        </a>
    </div>;

    function toggleSidebar() {
        props.setShowSidebar(value => !value);
    }
}