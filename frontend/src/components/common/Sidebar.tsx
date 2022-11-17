import * as React from "react";
import { Link } from "react-router-dom";
import { routes } from "../../lib/routes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar, faUser } from "@fortawesome/free-solid-svg-icons";
import logo from "../../assets/logo.svg";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useUser } from "../App";
import { useQueryClient } from "@tanstack/react-query";
import { User } from "../../models/user";

interface Props {
    show: boolean
    setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>
}

export default function Sidebar (props: Props): React.ReactElement {
    const user = useUser();
    const ref = React.useRef<HTMLDivElement>(null);
    const location = useLocation();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { t } = useTranslation();

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
                <FontAwesomeIcon icon={faUser} /> {user === undefined ? <>&hellip;</> : user.email}
            </p>
            <ul className="menu-list">
                <li><Link to={routes.profile()}>{t("sidebar.profile")}</Link></li>
                <li><a onClick={signOut}>{t("common.sign_out")}</a></li>
            </ul>
            <p className="menu-label">
                {t("sidebar.general")}
            </p>
            <ul className="menu-list">
                <li><Link to={routes.dashboard()}>{t("sidebar.dashboard")}</Link></li>
                <li><Link to={routes.transactions()}>{t("sidebar.transactions")}</Link></li>
            </ul>
            <p className="menu-label">
                {t("sidebar.accounts")}
            </p>
            <ul className="menu-list">
                <li><Link to={routes.accounts()}>{t("sidebar.manage_accounts")}</Link></li>
                {user === undefined
                    ? <li><p>{t("common.please_wait")}</p></li>
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
                {t("sidebar.manage")}
            </p>
            <ul className="menu-list">
                <li><Link to={routes.automation()}>{t("sidebar.automation")}</Link></li>
                <li><Link to={routes.meta()}>{t("sidebar.custom_fields")}</Link></li>
                <li><Link to={routes.preferences()}>{t("sidebar.preferences")}</Link></li>
                <li><Link to={routes.importCsv()}>{t("sidebar.import")}</Link></li>
            </ul>
            {user !== undefined && <p className="version">Assetgrid v{user.preferences.version}</p>}
        </aside>
    </div>;

    function onBlur (e: React.FocusEvent<HTMLDivElement>): void {
        if (!e.currentTarget.contains(e.relatedTarget as Node) && (e.relatedTarget === null || e.relatedTarget.closest(".navbar-burger") === null)) {
            props.setShowSidebar(false);
        }
    }

    function signOut (): void {
        queryClient.setQueryData<User | null>(["user"], () => null);
        localStorage.removeItem("token");
        navigate(routes.login());
    }
}
