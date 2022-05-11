import * as React from "react";
import { RouteComponentProps } from "react-router";
import { Card } from "../common/Card";
import TransactionList from "../transaction/TransactionList";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as solid from "@fortawesome/free-solid-svg-icons"
import * as regular from "@fortawesome/free-regular-svg-icons"

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
                        <span className="icon">
                            <FontAwesomeIcon icon={regular.faStar}/>
                        </span> Studiekonto
                    </p>
                    <p className="subtitle has-text-primary-light">
                        Eventuel beskrivelse
                    </p>
                </div>
            </section>
            <div className="p-3">
                <div className="columns m-0">
                    <div className="column p-0 is-narrow is-flex">
                        <Card title="Account Overview">
                            <table className="table">
                                <tbody>
                                    <tr>
                                        <td>Balance</td>
                                        <td className="number-total">143 000,50</td>
                                        <td></td>
                                    </tr>
                                    <tr>
                                        <td>Past week</td>
                                        <td className="number-total positive">+150,00</td>
                                        <td className="number-total negative">-250,00</td>
                                    </tr>
                                    <tr>
                                        <td>Past month</td>
                                        <td className="number-total positive">+150,00</td>
                                        <td className="number-total negative">-250,00</td>
                                    </tr>
                                    <tr>
                                        <td>Past year</td>
                                        <td className="number-total positive">+150,00</td>
                                        <td className="number-total negative">-250,00</td>
                                    </tr>
                                </tbody>
                            </table>
                        </Card>
                    </div>
                    <div className="column p-0 is-flex">
                        <Card title="Details">
                            <table className="table">
                                <tbody>
                                    <tr>
                                        <td>Id</td>
                                        <td>1</td>
                                    </tr>
                                    <tr>
                                        <td>Account Number</td>
                                        <td>2</td>
                                    </tr>
                                </tbody>
                            </table>
                        </Card>
                    </div>
                </div>
                <Card title="Transactions">
                    <TransactionList />
                </Card>
            </div>
        </>;
    }
}