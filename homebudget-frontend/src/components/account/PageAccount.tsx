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
import { Period, PeriodFunctions } from "../../models/period";
import AccountCategoryChart from "./AccountCategoryChart";

interface Props {
    preferences: Preferences | "fetching";
    updatePreferences: () => void;
}

export default function (props: Props) {
    const { id } = useParams();
    const [account, setAccount] = React.useState<"fetching" | "error" | null | Account>("fetching")
    const [updatingFavorite, setUpdatingFavorite] = React.useState<boolean>(false);
    
    let defaultPeriod: Period = {
        type: "month",
        start: DateTime.now().startOf("month"),
    };
    if (window.history.state.period) {
        try {
            const period = PeriodFunctions.parse(window.history.state.period);
            if (period) {
                defaultPeriod = period;
            }
        } catch { }
    }
    const [period, setPeriod] = React.useState<Period>(defaultPeriod);

    function toggleFavorite() {
        if (account === "error" || account === "fetching") {
            throw "error";
        }

        let favorite = ! account.favorite;
        let { balance, id, ...newAccount } = account;
        newAccount.favorite = favorite;

        setUpdatingFavorite(true);

        Api.Account.update(Number(id), newAccount)
            .then(result => {
                setUpdatingFavorite(false);
                result.balance = account.balance;
                setAccount(result);
                props.updatePreferences();
            })
            .catch(e => {
                setAccount("error");
            });
    }

    // Update history when period is changed
    React.useEffect(() => {
        window.history.replaceState({ ...window.history.state, period: PeriodFunctions.serialize(period) }, "");
    }, [period]);

    // Update account when id is changed
    React.useEffect(() => {
        setAccount("fetching");
        Api.Account.get(Number(id))
            .then(result => {
                setAccount(result);
            })
            .catch(e => {
                console.log(e);
                setAccount("error");
            })
    }, [id])

    if (account === "fetching") {
        return <p>Please wait</p>;
    }
    if (account === "error") {
        return <p>Error</p>;
    }
    if (account === null) {
        return <p>Not found</p>;
    }

    return <>
        <section className="hero has-background-primary" style={{ flexDirection: "row", alignItems: "center" }}>
            <div className="hero-body">
                <p className="title has-text-white">
                    {updatingFavorite
                        ? <span className="icon">
                            <FontAwesomeIcon icon={solid.faSpinner} pulse />
                        </span>
                        : <span className="icon" onClick={() => toggleFavorite()} style={{ cursor: "pointer" }}>
                            {account.favorite ? <FontAwesomeIcon icon={solid.faStar} /> : <FontAwesomeIcon icon={regular.faStar} />}
                        </span>} #{account.id} {account.name}
                </p>
                {(account.description?.trim() ?? "") !== "" &&
                    <p className="subtitle has-text-primary-light">
                        {account.description} {PeriodFunctions.print(period)}
                    </p>}
            </div>
            <div>
                <PeriodSelector period={period} onChange={period => setPeriod(period) } />
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
                                    <td className="has-text-right">{formatNumberWithPrefs(account.balance!, props.preferences)}</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Account Number</td>
                                    <td className="has-text-right">{account.accountNumber}</td>
                                </tr>
                            </tbody>
                        </table>
                    </Card>
                </div>
                <div className="column p-0 is-flex">
                    <Card title="Categories" style={{flexGrow: 1}}>
                        <AccountCategoryChart id={Number(id)} preferences={props.preferences} period={period} />
                    </Card>
                </div>
                <div className="column p-0 is-flex">
                    <Card title="Balance" style={{ flexGrow: 1 }}>
                        <AccountBalanceChart id={Number(id)} preferences={props.preferences} period={period} />
                    </Card>
                </div>
            </div>
            <Card title={"Transactions (" + PeriodFunctions.print(period) + ")"}>
                <AccountTransactionList
                    accountId={Number(id)}
                    preferences={props.preferences} period={period}
                    decrementPeriod={() => new Promise<void>(resolve => { setPeriod(PeriodFunctions.decrement(period)); resolve(); })}
                    incrementPeriod={() => new Promise<void>(resolve => { setPeriod(PeriodFunctions.increment(period)); resolve(); })}
                />
            </Card>
        </div>
    </>;
}