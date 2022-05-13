import * as React from "react";
import { RouteComponentProps } from "react-router";
import { Card } from "../common/Card";
import TransactionList from "../transaction/TransactionList";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as solid from "@fortawesome/free-solid-svg-icons"
import * as regular from "@fortawesome/free-regular-svg-icons"
import { Account } from "../../models/account";
import axios from "axios";
import AccountTransactionList from "../transaction/AccountTransactionList";
import { Preferences } from "../../models/preferences";
import AccountList from "./AccountList";

export default class PageAccountOverview extends React.Component<{}> {
    constructor(props: {}) {
        super(props);
    }
    public render(): React.ReactNode {
        return <>
            <section className="hero has-background-primary">
                <div className="hero-body">
                    <p className="title has-text-white">Accounts</p>
                    <p className="subtitle has-text-white">Manage your accounts</p>
                </div>
            </section>
            <div className="p-3">
                <Card title="Accounts">
                    <AccountList />
                </Card>
            </div>
        </>;
    }
}