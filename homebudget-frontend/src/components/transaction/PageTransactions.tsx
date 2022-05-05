import { History } from "history";
import * as React from "react";
import { connect, ConnectedProps } from "react-redux";
import { Link } from "react-router-dom";
import { ThunkDispatch } from "redux-thunk";
import { routes } from "../../lib/routes";
import InputButton from "../form/InputButton";
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
