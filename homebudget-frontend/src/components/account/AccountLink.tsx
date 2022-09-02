import * as React from "react";
import { Link } from "react-router-dom";
import { routes } from "../../lib/routes";
import { Account } from "../../models/account";
import Tooltip from "../common/Tooltip";

export interface Props {
    account: Account;
    targetBlank?: boolean;
}

export default class AccountLink extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    public render() {
        return <Link className="account-link" to={routes.account(this.props.account.id.toString())} target={this.props.targetBlank === true ? "_blank" : "_self"}>
            <span>#{this.props.account.id}</span> {this.props.account.name}
        </Link>
    }
}