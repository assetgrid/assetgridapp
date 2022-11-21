import { faShare } from "@fortawesome/free-solid-svg-icons";
import { faUser } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as React from "react";
import { Link } from "react-router-dom";
import { routes } from "../../lib/routes";
import { Account } from "../../models/account";

export interface Props {
    account: Account
    targetBlank?: boolean
    disabled?: boolean
}

export default function AccountLink (props: Props): React.ReactElement {
    const icon = props.account.includeInNetWorth
        ? <FontAwesomeIcon icon={faUser} />
        : <FontAwesomeIcon icon={faShare} />;

    if (props.disabled === true) {
        return <span className="transaction-link">
            <span>{icon}</span> {props.account.name}
        </span>;
    }

    return <Link className="account-link" to={routes.account(props.account.id.toString())} state={{ page: 1 }} target={props.targetBlank === true ? "_blank" : "_self"}>
        <span>{icon}</span> {props.account.name}
    </Link>;
}
