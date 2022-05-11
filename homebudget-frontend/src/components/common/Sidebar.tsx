import * as React from "react";
import { Link } from "react-router-dom";
import { routes } from "../../lib/routes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons"

export class Sidebar extends React.Component<{}> {
    constructor(props: {}) {
        super(props);
    }

    public render() {
        return <div className="has-background-dark p-5" style={{ width: "300px", backgroundColor: "#0a3d62" }}>
            <aside className="menu has-color-white">
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