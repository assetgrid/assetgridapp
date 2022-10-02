import * as React from "react";
import { Link } from "react-router-dom";
import { routes } from "../../lib/routes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar, faUser } from "@fortawesome/free-solid-svg-icons"
import logo from "../../assets/logo.svg";
import { Preferences } from "../../models/preferences";
import { userContext } from "../App";
import { useLocation } from "react-router";

interface Props {
    show: boolean;
    setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Sidebar(props: Props) {
    const { user, setUser } = React.useContext(userContext);
    const ref = React.useRef<HTMLDivElement>(null);
    const location = useLocation();

    React.useEffect(() => {
        if (props.show) {
            ref.current?.focus();
        }
    }, [props.show]);

    React.useEffect(() => {
        props.setShowSidebar(false);
    }, [location.pathname]);

    return <div tabIndex={0} ref={ref} onBlur={onBlur}
        className={"sidebar has-background-dark" + (props.show ? " shown" : "")} style={{ width: "300px", backgroundColor: "#0a3d62", flexShrink: 0 }}>
        <Link to={routes.dashboard()}><img className="logo" src={logo}></img></Link>
        <aside className="menu has-color-white m-5">
            <p className="menu-label">
                <FontAwesomeIcon icon={faUser} /> {user === "fetching" ? <>&hellip;</> : user.email}
            </p>
            <ul className="menu-list">
                <li><Link to={routes.profile()}>Profile</Link></li>
                <li><a onClick={signOut}>Sign out</a></li>
            </ul>
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
                {user === "fetching"
                    ? <li><p>Please wait&hellip;</p></li>
                    : user.favoriteAccounts.map(account =>
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
    
    function onBlur(e: React.FocusEvent<HTMLDivElement>) {
        if (!e.currentTarget.contains(e.relatedTarget as Node) && (e.relatedTarget === null || e.relatedTarget.closest(".navbar-burger") === null)) {
            props.setShowSidebar(false);
        }
    }

    function signOut() {
        setUser(null);
    }
}