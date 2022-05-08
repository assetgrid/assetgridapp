import * as React from "react";
import { Account } from "../../models/account";
import Tooltip from "../common/Tooltip";
import { AccountReference } from "../import/ImportModels";

export interface Props {
    account?: Account;
    accountReference?: AccountReference;
}

export default class AccountTooltip extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    public render() {
        let tooltip: React.ReactNode;

        if (this.props.account !== undefined) {
            tooltip = <span>#{this.props.account.id} {this.props.account.name}</span>;
        } else if (this.props.accountReference !== undefined) {
            if (this.props.accountReference.account === "fetching") {
                tooltip = <span>Fetching account</span>;
            } else if (this.props.accountReference.account === null) {
                tooltip = <span>No account found with {this.props.accountReference.identifier}: {this.props.accountReference.value}</span>;
            } else {
                tooltip = <span>#{this.props.accountReference.account.id} {this.props.accountReference.account.name}</span>;
            }
        }

        return <Tooltip content={tooltip}>{this.props.children}</Tooltip>;
    }
}