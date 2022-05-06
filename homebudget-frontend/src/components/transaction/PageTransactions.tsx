import * as React from "react";
import { Link } from "react-router-dom";
import { routes } from "../../lib/routes";
import TransactionList from "./TransactionList";

export default class PageTransactions extends React.Component<{}> {
    constructor(props: {}) {
        super(props);
    }

    public render() {
        return <section className="section container">
            <Link to={routes.createTransaction()}
                className="button">
                Create Transaction
            </Link>
            
            <TransactionList />
        </section>;
    }
}
