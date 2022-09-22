import * as React from "react";
import Card from "../../common/Card";
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
import Page404 from "../Page404";
import PageError from "../PageError";
import AccountDetailsCard from "../../account/AccountDetailsCard";
import Hero from "../../common/Hero";

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
        return layout(period,
            <Hero title={<>#{id} &hellip;</>} subtitle={<>&hellip;</>} />,
            <Card title="Account details" isNarrow={false} style={{flexGrow: 1}}>
                <>Please wait&hellip;</>
            </Card>,
            <>Please wait&hellip;</>,
            <>Please wait&hellip;</>,
            <>Please wait&hellip;</>,
        );
    }
    if (account === "error") {
        return <PageError />;
    }
    if (account === null) {
        return <Page404 />;
    }

    return layout(period,
        <Hero title={<>
            {updatingFavorite
                ? <span className="icon">
                    <FontAwesomeIcon icon={solid.faSpinner} pulse />
                </span>
                : <span className="icon" onClick={() => toggleFavorite()} style={{ cursor: "pointer" }}>
                    {account.favorite ? <FontAwesomeIcon icon={solid.faStar} /> : <FontAwesomeIcon icon={regular.faStar} />}
                </span>} #{account.id} {account.name}
        </>}
            subtitle={account.description.trim() != "" ? account.description : PeriodFunctions.print(period)}
            period={[period, period => { setPeriod(period); setPage(1); setDraw(draw => draw + 1); }]} />,
        <AccountDetailsCard account={account}
            updatingFavorite={updatingFavorite}
            toggleFavorite={toggleFavorite}
            onChange={setAccount}
            updateAccountFavoriteInPreferences={updateAccountFavoriteInPreferences}
        />,
        <AccountCategoryChart id={id} preferences={preferences} period={period} />,
        <AccountBalanceChart id={id} preferences={preferences} period={period} />,
        <AccountTransactionList
            accountId={id}
            period={period}
            page={page}
            goToPage={goToPage}
            pageSize={pageSize}
            draw={draw}
            selectedTransactions={selectedTransactions}
            setSelectedTransactions={setSelectedTransactions}
        />);

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

function layout(
    period: Period,
    hero: React.ReactElement,
    accountDetails: React.ReactElement,
    categoryChart: React.ReactElement,
    balanceChart: React.ReactElement,
    transactions: React.ReactElement): React.ReactElement {
    
    return <>
        {hero}
        <div className="p-3">
            <div className="columns m-0 is-multiline">
                <div className="column p-0 is-narrow-tablet is-flex">
                    {accountDetails}
                </div>
                <div className="column p-0 is-flex">
                    <Card title="Categories" style={{flexGrow: 1}} isNarrow={false}>
                        {categoryChart}
                    </Card>
                </div>
                <div className="column p-0 is-12-tablet is-reset-desktop">
                    <Card title="Balance" style={{ flexGrow: 1 }} isNarrow={false}>
                        {balanceChart}
                    </Card>
                </div>
            </div>
            <Card title={"Transactions (" + PeriodFunctions.print(period) + ")"} isNarrow={false}>
                {transactions}
            </Card>
        </div>
    </>;
}