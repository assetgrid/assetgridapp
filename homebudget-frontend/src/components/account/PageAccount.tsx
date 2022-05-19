import * as React from "react";
import { Card } from "../common/Card";
import TransactionList from "../transaction/TransactionList";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as solid from "@fortawesome/free-solid-svg-icons"
import * as regular from "@fortawesome/free-regular-svg-icons"
import { Account } from "../../models/account";
import axios from "axios";
import AccountTransactionList from "../transaction/AccountTransactionList";
import { Preferences } from "../../models/preferences";
import { Api } from "../../lib/ApiClient";
import { formatNumber, formatNumberWithPrefs } from "../../lib/Utils";
import AccountBalanceChart from "./AccountBalanceChart";
import { useParams } from "react-router";
import PeriodSelector from "../common/PeriodSelector";
import { DateTime } from "luxon";
import { Period } from "../../models/period";

interface Props {
    preferences: Preferences | "fetching";
    updatePreferences: () => void;
}

interface State {
    account: "fetching" | "error" | null | Account;
    updatingFavorite: boolean;
    period: Period;
}

class PageAccount extends React.Component<Props & { id: number }, State> {
    constructor(props: Props & { id: number }) {
        super(props);
        this.state = {
            account: "fetching",
            updatingFavorite: false,
            period: {
                type: "month",
                start: DateTime.now().startOf("month"),
            }
        };
    }

    componentDidMount(): void {
        this.updateAccount();
    }

    componentDidUpdate(prevProps: Readonly<Props & { id: number }>, prevState: Readonly<State>): void {
        if (this.props.id != prevProps.id) {
            this.updateAccount();
        }
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
                        {this.state.updatingFavorite
                            ? <span className="icon">
                                <FontAwesomeIcon icon={solid.faSpinner} pulse />
                            </span>
                            : <span className="icon" onClick={() => this.toggleFavorite()} style={{ cursor: "pointer" }}>
                                {this.state.account.favorite ? <FontAwesomeIcon icon={solid.faStar} /> : <FontAwesomeIcon icon={regular.faStar} />}
                            </span>} #{this.state.account.id} {this.state.account.name}
                    </p>
                    {(this.state.account.description?.trim() ?? "") !== "" &&
                        <p className="subtitle has-text-primary-light">
                            {this.state.account.description}
                        </p>}
                </div>
            </section>
            <PeriodSelector period={this.state.period} onChange={period => this.setState({ period: period }) } />
            <div className="p-3">
                <div className="columns m-0">
                    <div className="column p-0 is-narrow is-flex">
                        <Card title="Account Overview">
                            <table className="table">
                                <tbody>
                                    <tr>
                                        <td>Balance</td>
                                        <td className="has-text-right">{formatNumberWithPrefs(this.state.account.balance!, this.props.preferences)}</td>
                                        <td></td>
                                    </tr>
                                    <tr>
                                        <td>Account Number</td>
                                        <td className="has-text-right">{this.state.account.accountNumber}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </Card>
                    </div>
                    <div className="column p-0 is-flex">
                        <Card title="Categories" style={{flexGrow: 1}}>
                            <p>Graph showing expenses stratified by categories the past month</p>
                            <p>Buttons to change month</p>
                        </Card>
                    </div>
                    <div className="column p-0 is-flex">
                        <Card title="Balance" style={{ flexGrow: 1 }}>
                            <AccountBalanceChart id={Number(this.props.id)} preferences={this.props.preferences} period={this.state.period} />
                        </Card>
                    </div>
                </div>
                <Card title="Transactions">
                    <AccountTransactionList accountId={Number(this.props.id)} preferences={this.props.preferences}/>
                </Card>
            </div>
        </>;
    }

    private updateAccount(): void {
        this.setState({ account: "fetching" }, () =>
            Api.Account.get(Number(this.props.id))
                .then(result => {
                    this.setState({ account: result });
                })
                .catch(e => {
                    console.log(e);
                    this.setState({ account: "error" });
                })
        );
    }

    private toggleFavorite(): void {
        if (this.state.account === "error" || this.state.account === "fetching") {
            throw "error";
        }

        let favorite = !this.state.account.favorite;
        let { balance, id, ...newAccount } = this.state.account;
        newAccount.favorite = favorite;

        this.setState({ updatingFavorite: true });

        Api.Account.update(Number(this.props.id), newAccount)
            .then(result => {
                this.setState({ account: result, updatingFavorite: false });
                this.props.updatePreferences();
            })
            .catch(e => {
                this.setState({ account: "error" });
            });
    }
}

export default function (props: Props) {
    let { id } = useParams();
    return <PageAccount id={Number(id)} {...props} />
}