import * as React from "react";
import { Card } from "../common/Card";
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
import { useNavigate, useParams } from "react-router";
import PeriodSelector from "../common/PeriodSelector";
import { DateTime } from "luxon";
import { Period, PeriodFunctions } from "../../models/period";
import AccountCategoryChart from "./AccountCategoryChart";
import InputIconButton from "../form/InputIconButton";
import ModifyAccountModal from "../form/account/ModifyAccountModal";
import YesNoDisplay from "../form/YesNoDisplay";
import DeleteAccountModal from "../form/account/DeleteAccountModal";
import { routes } from "../../lib/routes";
import { preferencesContext } from "../App";

export default function () {
    const { id } = useParams();
    const [account, setAccount] = React.useState<"fetching" | "error" | null | Account>("fetching");
    const [updatingFavorite, setUpdatingFavorite] = React.useState(false);
    const [currentModal, setCurrentModal] = React.useState<null | "deleting" | "modifying">(null);
    const navigate = useNavigate();
    const { preferences, updatePreferences } = React.useContext(preferencesContext);
    
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
                updateAccountFavoriteInPreferences(result, result.favorite);
                setAccount(result);
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
                        {account.description.trim() != "" ? account.description : PeriodFunctions.print(period)}
                    </p>}
            </div>
            <div>
                <PeriodSelector period={period} onChange={period => setPeriod(period) } />
            </div>
        </section>
        <div className="p-3">
            <div className="columns m-0">
                <div className="column p-0 is-narrow is-flex">
                    <Card title={<>
                        <span style={{ flexGrow: 1 }}>Account Details</span>
                        {updatingFavorite
                        ? <span className="icon">
                            <FontAwesomeIcon icon={solid.faSpinner} pulse />
                        </span>
                        : <span className="icon" onClick={() => toggleFavorite()} style={{ cursor: "pointer" }}>
                            {account.favorite ? <FontAwesomeIcon icon={solid.faStar} /> : <FontAwesomeIcon icon={regular.faStar} />}
                        </span>}
                        <InputIconButton icon={solid.faPen} onClick={() => setCurrentModal("modifying")} />
                        <InputIconButton icon={regular.faTrashCan} onClick={() => setCurrentModal("deleting")} />
                    </>}>
                        <table className="table">
                            <tbody>
                                <tr>
                                    <td>Balance</td>
                                    <td className="has-text-right">{formatNumberWithPrefs(account.balance!, preferences)}</td>
                                </tr>
                                <tr>
                                    <td>Account Number</td>
                                    <td className="has-text-right">{account.accountNumber}</td>
                                </tr>
                                <tr>
                                    <td>Favorite</td>
                                    <td className="has-text-right">
                                        <YesNoDisplay value={account.favorite} />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Include in net worth</td>
                                    <td className="has-text-right">
                                        <YesNoDisplay value={account.includeInNetWorth} />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </Card>
                </div>
                <div className="column p-0 is-flex">
                    <Card title="Categories" style={{flexGrow: 1}}>
                        <AccountCategoryChart id={Number(id)} preferences={preferences} period={period} />
                    </Card>
                </div>
                <div className="column p-0 is-flex">
                    <Card title="Balance" style={{ flexGrow: 1 }}>
                        <AccountBalanceChart id={Number(id)} preferences={preferences} period={period} />
                    </Card>
                </div>
            </div>
            <Card title={"Transactions (" + PeriodFunctions.print(period) + ")"}>
                <AccountTransactionList
                    accountId={Number(id)}
                    period={period}
                    decrementPeriod={() => new Promise<void>(resolve => { setPeriod(PeriodFunctions.decrement(period)); resolve(); })}
                    incrementPeriod={() => new Promise<void>(resolve => { setPeriod(PeriodFunctions.increment(period)); resolve(); })}
                />
            </Card>
        </div>
        {currentModal === "modifying" && <ModifyAccountModal
            close={() => setCurrentModal(null)}
            updated={modifiedAccount => {
                if (modifiedAccount.favorite !== account.favorite) {
                    updateAccountFavoriteInPreferences(account, modifiedAccount.favorite);
                }
                setAccount(modifiedAccount);
            }}
            account={account}
            closeOnChange={true} />}
        {currentModal === "deleting" && <DeleteAccountModal
            close={() => setCurrentModal(null)}
            deleted={() => {
                if (account.favorite) {
                    updateAccountFavoriteInPreferences(account, false);
                }
                navigate(routes.accounts());
            }}
            account={account}
            preferences={preferences} />}
    </>;

    function updateAccountFavoriteInPreferences(account: Account, favorite: boolean) {
        if (preferences === "fetching") {
            // Refetch preferences. Can't modify them as they aren't fetched.
            updatePreferences(null);
            return;
        }

        if (favorite) {
            updatePreferences({ ...preferences, favoriteAccounts: [...preferences.favoriteAccounts, account]});
        } else {
            updatePreferences({ ...preferences, favoriteAccounts: preferences.favoriteAccounts.filter(fav => fav.id !== account.id)});
        }
    }
}