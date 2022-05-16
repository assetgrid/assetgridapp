import * as React from "react";
import { Account } from "../../models/account";
import Tooltip from "../common/Tooltip";
import { AccountReference } from "../import/ImportModels";

export interface Props {
    account: Account;
    children: React.ReactNode;
}

export default class AccountTooltip extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    public render() {
        let tooltip: React.ReactNode = <span>#{this.props.account.id} {this.props.account.name}</span>
        return <Tooltip content={tooltip}>{this.props.children}</Tooltip>;
    }
}