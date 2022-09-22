import * as React from "react";
import Card from "../../common/Card";
import AccountList from "../../account/AccountList";
import { Link } from "react-router-dom";
import { routes } from "../../../lib/routes";
import Hero from "../../common/Hero";

export default function PageAccountOverview() {
    return <>
        <Hero title="Accounts" subtitle="Manage your accounts" />
        <div className="p-3">
            <Card title="Actions" isNarrow={true}>
                <Link to={routes.accountCreate()} state={{ allowBack: true }} className="button is-primary">
                    Create account
                </Link>
            </Card>
            <Card title="Accounts" isNarrow={true}>
                <AccountList />
            </Card>
        </div>
    </>;
}