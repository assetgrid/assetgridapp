import * as React from "react";
import { Link } from "react-router-dom";
import { routes } from "../../lib/routes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons"
import logo from "../../assets/logo.svg";
import { Preferences } from "../../models/preferences";
import { preferencesContext } from "../App";

interface Props {
    show: boolean;
}

export default function Sidebar(props: Props) {
    const { preferences } = React.useContext(preferencesContext);

    return <div className={"sidebar has-background-dark" + (props.show ? " shown" : "")} style={{ width: "300px", backgroundColor: "#0a3d62", flexShrink: 0 }}>
        <img className="logo" src={logo}></img>
        <aside className="menu has-color-white m-5">
            <p className="menu-label">
                General
            </p>
            <ul className="menu-list">
                <li><Link to={routes.dashboard()}>Dashboard</Link></li>
                <li><Link to={routes.transactions()}>Transactions</Link></li>
            </ul>
            <p className="menu-label">
                Accounts
            </p>
            <ul className="menu-list">
                <li><Link to={routes.accounts()}>Manage Accounts</Link></li>
                {preferences === "fetching"
                    ? <li><p>Please wait&hellip;</p></li>
                    : preferences.favoriteAccounts.map(account =>
                        <li key={account.id}><Link to={routes.account(account.id.toString())}>
                            <span className="icon">
                                <FontAwesomeIcon icon={faStar} style={{ color: "#648195" }} />
                            </span>
                            { account.name }
                        </Link></li>
                    )}
            </ul>
            <p className="menu-label">
                Manage
            </p>
            <ul className="menu-list">
                <li><Link to={routes.preferences()}>Preferences</Link></li>
                <li><Link to={routes.importCsv()}>Import</Link></li>
            </ul>
        </aside>
    </div>;
}