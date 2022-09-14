import * as React from "react";
import { Link } from "react-router-dom";
import { routes } from "../../lib/routes";
import { Preferences } from "../../models/preferences";
import AccountList from "../account/AccountList";
import CreateAccountModal from "../form/account/CreateAccountModal";
import CreateTransaction from "../transaction/CreateTransaction";
import TransactionList from "../transaction/TransactionList";

export default function PageDashboard () {
    return <section className="section container">
        <AccountList />
        
        <TransactionList />
        <CreateTransaction />

        <Link to={routes.transactions()}>View transactions</Link>

    </section>;
}
