import * as React from "react";
import { RouteComponentProps } from "react-router";
import { Card } from "../common/Card";
import TransactionList from "../transaction/TransactionList";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as solid from "@fortawesome/free-solid-svg-icons"
import * as regular from "@fortawesome/free-regular-svg-icons"
import { Account } from "../../models/account";
import axios from "axios";
import OrderedTransactionList from "../transaction/OrderedTransactionList";

interface RouteProps {
    id: string;
}

interface State {
    account: "fetching" | "error" | null | Account
}

export default class PageAccount extends React.Component<RouteComponentProps<RouteProps>, State> {
    constructor(props: RouteComponentProps<RouteProps>) {
        super(props);
        this.state = {
            account: "fetching"
        };
    }

    componentDidMount(): void {
        this.updateAccount();
    }

    public render(): React.ReactNode {
        if (this.state.account === "fetching") {
            return <p>Please wait</p>;
        }
        if (this.state.account === "error") {
            return <p>Error</p>;
        }
        if (this.state.account === null) {
            return <p>Not found</p>;
        }

        return <>
            <section className="hero has-background-primary">
                <div className="hero-body">
                    <p className="title has-text-white">
                        <span className="icon">
                            <FontAwesomeIcon icon={regular.faStar}/>
                        </span> {this.state.account.name}
                    </p>
                    {(this.state.account.description?.trim() ?? "") !== "" &&
                        <p className="subtitle has-text-primary-light">
                            {this.state.account.description}
                        </p>}
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
                    <div className="column p-0 is-flex is-narrow">
                        <Card title="Details">
                            <table className="table">
                                <tbody>
                                    <tr>
                                        <td>Id</td>
                                        <td>{this.state.account.id}</td>
                                    </tr>
                                    <tr>
                                        <td>Account Number</td>
                                        <td>{this.state.account.accountNumber}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </Card>
                    </div>
                    <div className="column p-0 is-flex">
                        <Card title="Graph" style={{flexGrow: 1}}>
                            <p>Look at this graph</p>
                        </Card>
                    </div>
                </div>
                <Card title="Transactions">
                    <OrderedTransactionList />
                </Card>
            </div>
        </>;
    }

    private updateAccount(): void {
        this.setState({ account: "fetching" });
        axios.get<Account>('https://localhost:7262/account/' + Number(this.props.match.params.id))
            .then(res => {
                this.setState({ account: res.data });
            })
            .catch(e => {
                console.log(e);
                this.setState({ account: "error" });
            });
    }
}