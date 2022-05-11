import * as React from "react";
import { RouteComponentProps } from "react-router";
import TransactionList from "../transaction/TransactionList";

interface RouteProps {
    id: string,
}

export default class PageAccount extends React.Component<RouteComponentProps<RouteProps>> {
    constructor(props: RouteComponentProps<RouteProps>) {
        super(props);
    }

    public render() {
        return <>
            <section className="hero has-background-primary">
                <div className="hero-body">
                    <p className="title has-text-white">
                        Studiekonto
                    </p>
                    <p className="subtitle has-text-primary-light">
                        Eventuel beskrivelse
                    </p>
                </div>
            </section>
            <div className="box m-5">
                <TransactionList />
            </div>
        </>;
    }
}