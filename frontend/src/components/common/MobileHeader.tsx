import logo from "../../assets/logo.svg";
import * as React from "react";
import { routes } from "../../lib/routes";
import { Link } from "react-router-dom";

interface Props {
    setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>
    sidebarVisible: boolean
}

export default function MobileHeader (props: Props): React.ReactElement {
    return <div className="mobile-header has-background-dark">
        <Link className="logo" to={routes.dashboard()}><img src={logo}></img></Link>
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

    function toggleSidebar (): void {
        props.setShowSidebar(value => !value);
    }
}
