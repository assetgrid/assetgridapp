import * as React from "react";
import Card from "../../common/Card";
import AccountList from "../../account/AccountList";
import { Link } from "react-router-dom";
import { routes } from "../../../lib/routes";
import Hero from "../../common/Hero";
import { SearchGroupType, SearchOperator } from "../../../models/search";

export default function PageAccountOverview (): React.ReactElement {
    return <>
        <Hero title="Accounts" subtitle="Manage your accounts" />
        <div className="p-3">
            <Card title="Actions" isNarrow={true}>
                <Link to={routes.accountCreate()} state={{ allowBack: true }} className="button is-primary">
                    Create account
                </Link>
            </Card>
            <Card title="Your accounts (included in net worth)" isNarrow={true}>
                <AccountList query={{
                    type: SearchGroupType.Query,
                    query: {
                        column: "IncludeInNetWorth",
                        value: true,
                        operator: SearchOperator.Equals,
                        not: false
                    }
                }} />
            </Card>
            <Card title={<>Offset accounts (<span style={{ textDecoration: "underline" }}>not</span>&nbsp;included in net worth)</>} isNarrow={true}>
                <AccountList query={{
                    type: SearchGroupType.Query,
                    query: {
                        column: "IncludeInNetWorth",
                        value: false,
                        operator: SearchOperator.Equals,
                        not: false
                    }
                }} />
            </Card>
        </div>
    </>;
}
