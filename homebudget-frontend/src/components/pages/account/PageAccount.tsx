import * as React from "react";
import { Card } from "../../common/Card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as solid from "@fortawesome/free-solid-svg-icons"
import * as regular from "@fortawesome/free-regular-svg-icons"
import { Account } from "../../../models/account";
import axios from "axios";
import AccountTransactionList from "../../transaction/AccountTransactionList";
import { Preferences } from "../../../models/preferences";
import { Api } from "../../../lib/ApiClient";
import { debounce, formatNumber, formatNumberWithPrefs } from "../../../lib/Utils";
import AccountBalanceChart from "../../account/AccountBalanceChart";
import { useNavigate, useParams } from "react-router";
import PeriodSelector from "../../common/PeriodSelector";
import { DateTime } from "luxon";
import { Period, PeriodFunctions } from "../../../models/period";
import AccountCategoryChart from "../../account/AccountCategoryChart";
import InputIconButton from "../../input/InputIconButton";
import YesNoDisplay from "../../input/YesNoDisplay";
import { routes } from "../../../lib/routes";
import { preferencesContext } from "../../App";
import InputButton from "../../input/InputButton";
import InputText from "../../input/InputText";
import InputCheckbox from "../../input/InputCheckbox";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../../models/search";
import Page404 from "./Page404";
import PageError from "./PageError";

const pageSize = 20;

export default function () {
    const idString = useParams().id;
    const id = Number(idString);

    // Get state from history
    let defaultPeriod: Period = {
        type: "month",
        start: DateTime.now().startOf("month"),
    };
    if (window.history.state.usr?.period) {
        try {
            const period = PeriodFunctions.parse(window.history.state.usr.period);
            if (period) {
                defaultPeriod = period;
            }
        } catch { }
    }

    const [account, setAccount] = React.useState<"fetching" | "error" | null | Account>("fetching");
    const [updatingFavorite, setUpdatingFavorite] = React.useState(false);
    const { preferences, updatePreferences } = React.useContext(preferencesContext);
    const [page, setPage] = React.useState(typeof(window.history.state.usr?.page) === "number" ? window.history.state.usr.page : 1);
    const [draw, setDraw] = React.useState(0);
    const [period, setPeriod] = React.useState<Period>(defaultPeriod);
    const [selectedTransactions, setSelectedTransactions] = React.useState<{ [id: number]: boolean }>(window.history.state.usr?.selectedTransactions ? window.history.state.usr?.selectedTransactions : {});

    // Keep state updated
    const updateHistoryDebounced = React.useCallback(debounce(updateHistory, 300), []);
    React.useEffect(() => {
        updateHistoryDebounced(period, page, selectedTransactions);
    }, [period, page, selectedTransactions]);

    // Update account when id is changed
    React.useEffect(() => {
        setAccount("fetching");
        if (isNaN(id)) {
            setAccount("error");
        } else {
            Api.Account.get(id)
                .then(result => {
                    setAccount(result);
                })
                .catch(e => {
                    console.log(e);
                    setAccount("error");
                });
        }
    }, [id])

    if (account === "fetching") {
        return <>
            <section className="hero has-background-primary" style={{ flexDirection: "row", alignItems: "center" }}>
                <div className="hero-body">
                    <p className="title has-text-white">
                        #{id} &hellip;
                    </p>
                </div>
            </section>
            <div className="p-3">
                <div className="columns m-0">
                    <div className="column p-0 is-narrow is-flex">
                        <Card title="Account details">
                            Please wait&hellip;
                        </Card>
                    </div>
                    <div className="column p-0 is-flex">
                        <Card title="Categories" style={{flexGrow: 1}}>
                            Please wait&hellip;
                        </Card>
                    </div>
                    <div className="column p-0 is-flex">
                        <Card title="Balance" style={{ flexGrow: 1 }}>
                            Please wait&hellip;
                        </Card>
                    </div>
                </div>
                <Card title={"Transactions (" + PeriodFunctions.print(period) + ")"}>
                    Please wait&hellip;
                </Card>
            </div>
        </>;
    }
    if (account === "error") {
        return <PageError />;
    }
    if (account === null) {
        return <Page404 />;
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
                <PeriodSelector period={period} onChange={period => { setPeriod(period); setPage(1); setDraw(draw => draw + 1); } } />
            </div>
        </section>
        <div className="p-3">
            <div className="columns m-0">
                <div className="column p-0 is-narrow is-flex">
                    <AccountDetailsCard account={account}
                        updatingFavorite={updatingFavorite}
                        toggleFavorite={toggleFavorite}
                        onChange={setAccount}
                        updateAccountFavoriteInPreferences={updateAccountFavoriteInPreferences}
                    />
                </div>
                <div className="column p-0 is-flex">
                    <Card title="Categories" style={{flexGrow: 1}}>
                        <AccountCategoryChart id={id} preferences={preferences} period={period} />
                    </Card>
                </div>
                <div className="column p-0 is-flex">
                    <Card title="Balance" style={{ flexGrow: 1 }}>
                        <AccountBalanceChart id={id} preferences={preferences} period={period} />
                    </Card>
                </div>
            </div>
            <Card title={"Transactions (" + PeriodFunctions.print(period) + ")"}>
                <AccountTransactionList
                    accountId={id}
                    period={period}
                    page={page}
                    goToPage={goToPage}
                    pageSize={pageSize}
                    draw={draw}
                    selectedTransactions={selectedTransactions}
                    setSelectedTransactions={setSelectedTransactions}
                />
            </Card>
        </div>
    </>;

    function updateHistory(period: Period, page: number, selectedTransactions: { [id: number]: boolean }) {
        window.history.replaceState({
            ...window.history.state,
            usr: {
                period: PeriodFunctions.serialize(period),
                page,
                selectedTransactions
            }
        }, "");
    }
    
    async function goToPage(page: number | "increment" | "decrement") {
        if (page === "increment") {
            const nextPeriod = PeriodFunctions.increment(period);
            const transactionCount = await countTransactions(nextPeriod);
            const lastPage = Math.max(1, Math.ceil(transactionCount / pageSize));
            setPeriod(nextPeriod);
            setPage(lastPage);
        } else if (page === "decrement") { 
            setPeriod(PeriodFunctions.decrement(period));
            setPage(1);
        } else {
            setPage(page);
        }
        setDraw(draw => draw + 1);
    }

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

    function toggleFavorite() {
        if (account === "error" || account === "fetching" || account === null) {
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

    function countTransactions(period: Period): Promise<number> {
        let [start, end] = PeriodFunctions.getRange(period);
        let query: SearchGroup = {
            type: SearchGroupType.And,
            children: [ {
                type: SearchGroupType.Query,
                query: {
                    column: "DateTime",
                    value: start.toISO(),
                    operator: SearchOperator.GreaterThanOrEqual,
                    not: false
                }
            }, {
                type: SearchGroupType.Query,
                query: {
                    column: "DateTime",
                    value: end.toISO(),
                    operator: SearchOperator.GreaterThan,
                    not: true
                }
            }]
        };
        return new Promise(resolve => {
            Api.Account.countTransactions(id, query)
                .then(result => resolve(result));
        });
    }
}

export function AccountDetailsCard(props: {
    account: Account,
    updatingFavorite: boolean,
    toggleFavorite: () => void,
    onChange: (account: Account) => void;
    updateAccountFavoriteInPreferences: (account: Account, favorite: boolean) => void
}): React.ReactElement {
    
    const [editingModel, setEditingModel] = React.useState<Account | null>(null);
    const [isUpdating, setIsUpdating] = React.useState(false);
    const { preferences } = React.useContext(preferencesContext);
    const navigate = useNavigate();

    if (editingModel === null) {
        return <Card title={<>
            <span style={{ flexGrow: 1 }}>Account details</span>
            {props.updatingFavorite
                ? <span className="icon">
                    <FontAwesomeIcon icon={solid.faSpinner} pulse />
                </span>
                : <span className="icon" onClick={() => props.toggleFavorite()} style={{ cursor: "pointer" }}>
                    {props.account.favorite ? <FontAwesomeIcon icon={solid.faStar} /> : <FontAwesomeIcon icon={regular.faStar} />}
                </span>}
            <InputIconButton icon={solid.faPen} onClick={() => setEditingModel(props.account)} />
            <InputIconButton icon={regular.faTrashCan} onClick={() => {
                // Balance breaks navigation. Luckily we don't need it on the delete page
                const { balance, ...accountWithoutBalance } = props.account;
                navigate(routes.accountDelete(props.account.id.toString()), { state: { account: accountWithoutBalance, allowBack: true } })
            }} />
        </>}>
            <table className="table">
                <tbody>
                    <tr>
                        <td>Balance</td>
                        <td>{formatNumberWithPrefs(props.account.balance!, preferences)}</td>
                    </tr>
                    <tr>
                        <td>Name</td>
                        <td>{props.account.name}</td>
                    </tr>
                    <tr>
                        <td>Description</td>
                        <td style={{maxWidth: "300px"}}>{props.account.description}</td>
                    </tr>
                    <tr>
                        <td>Account Number</td>
                        <td>{props.account.accountNumber}</td>
                    </tr>
                    <tr>
                        <td>Favorite</td>
                        <td>
                            <YesNoDisplay value={props.account.favorite} />
                        </td>
                    </tr>
                    <tr>
                        <td>Include in net worth</td>
                        <td>
                            <YesNoDisplay value={props.account.includeInNetWorth} />
                        </td>
                    </tr>
                </tbody>
            </table>
        </Card>
    } else {
        return <Card title="Account details">
            <table className="table">
                <tbody>
                    <tr>
                        <td>Balance</td>
                        <td>{formatNumberWithPrefs(props.account.balance!, preferences)}</td>
                    </tr>
                    <tr>
                        <td>Name</td>
                        <td>
                            <InputText
                                value={editingModel.name}
                                onChange={e => setEditingModel({ ...editingModel, name: e.target.value })}
                                disabled={isUpdating} />
                        </td>
                    </tr>
                    <tr>
                        <td>Description</td>
                        <td>
                            <InputText
                                value={editingModel.description}
                                onChange={e => setEditingModel({ ...editingModel, description: e.target.value })}
                                disabled={isUpdating} />
                        </td>
                    </tr>
                    <tr>
                        <td>Account number</td>
                        <td>
                            <InputText
                                value={editingModel.accountNumber}
                                onChange={e => setEditingModel({ ...editingModel, accountNumber: e.target.value })}
                                disabled={isUpdating} />
                        </td>
                    </tr>
                    <tr>
                        <td>Favorite</td>
                        <td>
                            <InputCheckbox
                                value={editingModel.favorite}
                                onChange={e => setEditingModel({ ...editingModel, favorite: e.target.checked })}
                                disabled={isUpdating} />  
                        </td>
                    </tr>
                    <tr>
                        <td>Include in net worth</td>
                        <td>
                            <InputCheckbox
                                value={editingModel.includeInNetWorth}
                                onChange={e => setEditingModel({ ...editingModel, includeInNetWorth: e.target.checked })}
                                disabled={isUpdating} />
                        </td>
                    </tr>
                </tbody>
            </table>
            <div className="buttons">
                <InputButton disabled={isUpdating} className="is-primary" onClick={saveChanges}>Save changes</InputButton>
                <InputButton onClick={() => setEditingModel(null)}>Cancel</InputButton>
            </div>
        </Card>
    }

    async function saveChanges() {
        if (editingModel === null) return;

        setIsUpdating(true);
        const { balance, ...updateModel } = editingModel;
        const result = await Api.Account.update(props.account.id, updateModel);
        result.balance = props.account.balance;
        setEditingModel(null);
        setIsUpdating(false);
        if (editingModel.favorite !== props.account.favorite) {
            props.updateAccountFavoriteInPreferences(props.account, editingModel.favorite);
        }
        props.onChange(result);
    }
}