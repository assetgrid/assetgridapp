import * as React from "react";
import { Link } from "react-router-dom";
import { routes } from "../../lib/routes";
import { Preferences } from "../../models/preferences";
import { Card } from "../common/Card";
import TransactionList from "./TransactionList";

interface Props {
    preferences: Preferences | "fetching";
}

export default class PageTransactions extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    public render() {
        return <>
            <section className="hero has-background-primary">
                <div className="hero-body">
                    <p className="title has-text-white">Transactions</p>
                </div>
            </section>
            <div className="p-3">
                <Card title="Transactions">
                    <Link to={routes.createTransaction()}
                        className="button">
                        Create Transaction
                    </Link>
                
                    <TransactionList preferences={this.props.preferences} />
                </Card>
            </div>
        </>;
    }
}
