import * as React from "react";
import Card from "../../common/Card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as solid from "@fortawesome/free-solid-svg-icons"
import * as regular from "@fortawesome/free-regular-svg-icons"
import { Account } from "../../../models/account";
import axios from "axios";
import AccountTransactionList from "../../transaction/AccountTransactionList";
import { Preferences } from "../../../models/preferences";
import { Api, useApi } from "../../../lib/ApiClient";
import { debounce, formatNumber, formatNumberWithUser } from "../../../lib/Utils";
import AccountBalanceChart from "../../account/AccountBalanceChart";
import { useNavigate, useParams } from "react-router";
import PeriodSelector from "../../common/PeriodSelector";
import { DateTime } from "luxon";
import { Period, PeriodFunctions } from "../../../models/period";
import AccountCategoryChart from "../../account/AccountCategoryChart";
import InputIconButton from "../../input/InputIconButton";
import YesNoDisplay from "../../input/YesNoDisplay";
import { routes } from "../../../lib/routes";
import { userContext } from "../../App";
import InputButton from "../../input/InputButton";
import InputText from "../../input/InputText";
import InputCheckbox from "../../input/InputCheckbox";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../../models/search";
import Page404 from "../Page404";
import PageError from "../PageError";
import AccountDetailsCard from "../../account/AccountDetailsCard";
import Hero from "../../common/Hero";
import { Link } from "react-router-dom";

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
    const { user, updateFavoriteAccounts } = React.useContext(userContext);
    const [page, setPage] = React.useState(typeof(window.history.state.usr?.page) === "number" ? window.history.state.usr.page : 1);
    const [draw, setDraw] = React.useState(0);
    const [period, setPeriod] = React.useState<Period>(defaultPeriod);
    const [selectedTransactions, setSelectedTransactions] = React.useState<{ [id: number]: boolean }>(window.history.state.usr?.selectedTransactions ? window.history.state.usr?.selectedTransactions : {});
    const api = useApi();

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
        } else if (api !== null) {
            api.Account.get(id)
                .then(result => {
                    if (result.status === 200) {
                        setAccount(result.data);
                    }
                })
                .catch(e => {
                    console.log(e);
                    setAccount("error");
                });
        }
    }, [api, id])

    if (account === "fetching") {
        return layout(period,
            <Hero title={<>#{id} &hellip;</>} subtitle={<>&hellip;</>} />,
            <Card title="Account details" isNarrow={false} style={{flexGrow: 1}}>
                <>Please wait&hellip;</>
            </Card>,
            <>Please wait&hellip;</>,
            <>Please wait&hellip;</>,
            <>Please wait&hellip;</>,
            <>
                <InputButton className="is-primary">Create deposit</InputButton>
                <InputButton className="is-primary">Create withdrawal</InputButton>
            </>
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
            {updatingFavorite || api === null
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
            updatingFavorite={updatingFavorite || api === null}
            toggleFavorite={toggleFavorite}
            onChange={setAccount}
            updateAccountFavoriteInPreferences={updateAccountFavoriteInPreferences}
        />,
        <AccountCategoryChart id={id} period={period} />,
        <AccountBalanceChart id={id} period={period} />,
        <AccountTransactionList
            accountId={id}
            period={period}
            page={page}
            goToPage={goToPage}
            pageSize={pageSize}
            draw={draw}
            selectedTransactions={selectedTransactions}
            setSelectedTransactions={setSelectedTransactions}
        />,
        <>
            <Link className="button is-primary" to={routes.transactionCreate()} state={{ allowBack: true, actionOnComplete: "back", destinationId: id }}>Create deposit</Link>
            <Link className="button is-primary" to={routes.transactionCreate()} state={{ allowBack: true, actionOnComplete: "back", sourceId: id }}>Create withdrawal</Link>
        </>
    );

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
        if (api === null) return;

        if (page === "increment") {
            const nextPeriod = PeriodFunctions.increment(period);
            const transactionCount = await countTransactions(api, nextPeriod);
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
        if (user !== "fetching") {
            if (favorite) {
                updateFavoriteAccounts([...user.favoriteAccounts, account]);
            } else {
                updateFavoriteAccounts(user.favoriteAccounts.filter(fav => fav.id !== account.id));
            }
        }
    }

    function toggleFavorite() {
        if (account === "error" || account === "fetching" || account === null || api === null) {
            throw "error";
        }

        let favorite = ! account.favorite;
        let { balance, id, ...newAccount } = account;
        newAccount.favorite = favorite;

        setUpdatingFavorite(true);

        api.Account.update(Number(id), newAccount)
            .then(result => {
                setUpdatingFavorite(false);
                if (result.status === 200) {
                    result.data.balance = account.balance;
                    updateAccountFavoriteInPreferences(result.data, result.data.favorite);
                    setAccount(result.data);
                }
            })
            .catch(e => {
                setAccount("error");
            });
    }

    function countTransactions(api: Api, period: Period): Promise<number> {
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
            api.Account.countTransactions(id, query)
                .then(result => result.status == 200 && resolve(result.data));
        });
    }
}

function layout(
    period: Period,
    hero: React.ReactElement,
    accountDetails: React.ReactElement,
    categoryChart: React.ReactElement,
    balanceChart: React.ReactElement,
    transactions: React.ReactElement,
    actions: React.ReactElement): React.ReactElement {
    
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
            <Card title={"Actions"} isNarrow={false}>
                <div className="buttons">
                    {actions}
                </div>
            </Card>
            <Card title={"Transactions (" + PeriodFunctions.print(period) + ")"} isNarrow={false}>
                {transactions}
            </Card>
        </div>
    </>;
}