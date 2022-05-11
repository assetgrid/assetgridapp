import * as React from "react";
import { Link } from "react-router-dom";
import { routes } from "../../lib/routes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons"
import logo from "../../assets/demopic.png";

export class Sidebar extends React.Component<{}> {
    constructor(props: {}) {
        super(props);
    }

    public render() {
        return <div className="has-background-dark" style={{ width: "300px", backgroundColor: "#0a3d62" }}>
            <img src={logo}></img>
            <aside className="menu has-color-white m-5">
                <p className="menu-label">
                    General
                </p>
                <ul className="menu-list">
                    <li><Link to={routes.dashboard()}>Dashboard</Link></li>
                    <li><Link to={routes.dashboard()}>Transactions</Link></li>
                </ul>
                <p className="menu-label">
                    Accounts
                </p>
                <ul className="menu-list">
                    <li><Link to={routes.dashboard()}>Manage Accounts</Link></li>
                    <li><Link to={routes.account("1")}>
                        <span className="icon">
                            <FontAwesomeIcon icon={faStar} style={{color: "#648195"}}/>
                        </span>
                        Studiekonto
                    </Link></li>
                    <li><Link to={routes.account("2")}>
                        <span className="icon">
                            <FontAwesomeIcon icon={faStar} style={{color: "#648195"}}/>
                        </span>
                        Budgetkonto
                    </Link></li>
                </ul>
                <p className="menu-label">
                    Manage
                </p>
                <ul className="menu-list">
                    <li><a>Settings</a></li>
                    <li><Link to={routes.importCsv()}>Import</Link></li>
                </ul>
            </aside>
        </div>;
    }
}