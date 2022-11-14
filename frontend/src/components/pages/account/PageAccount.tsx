import * as React from "react";
import Card from "../../common/Card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as solid from "@fortawesome/free-solid-svg-icons";
import * as regular from "@fortawesome/free-regular-svg-icons";
import { Account } from "../../../models/account";
import AccountTransactionList from "../../transaction/table/AccountTransactionList";
import { Api, useApi } from "../../../lib/ApiClient";
import { debounce, forget } from "../../../lib/Utils";
import AccountBalanceChart from "../../account/AccountBalanceChart";
import { useParams } from "react-router";
import { DateTime } from "luxon";
import { Period, PeriodFunctions } from "../../../models/period";
import AccountCategoryChart from "../../account/AccountCategoryChart";
import { routes } from "../../../lib/routes";
import { userContext } from "../../App";
import InputButton from "../../input/InputButton";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../../models/search";
import Page404 from "../Page404";
import PageError from "../PageError";
import AccountDetailsCard from "../../account/AccountDetailsCard";
import Hero from "../../common/Hero";
import { Link } from "react-router-dom";
import { t } from "i18next";

const pageSize = 20;

export default function PageAccount (): React.ReactElement {
    const idString = useParams().id;
    const id = Number(idString);

    // Get state from history
    let defaultPeriod: Period = {
        type: "month",
        start: DateTime.now().startOf("month")
    };
    if (typeof window.history.state.usr?.period === "object") {
        try {
            const period = PeriodFunctions.parse(window.history.state.usr.period);
            if (period != null) {
                defaultPeriod = period;
            }
        } catch { }
    }

    const [account, setAccount] = React.useState<"fetching" | "error" | null | Account>("fetching");
    const [updatingFavorite, setUpdatingFavorite] = React.useState(false);
    const { user, updateFavoriteAccounts } = React.useContext(userContext);
    const [page, setPage] = React.useState(typeof (window.history.state.usr?.page) === "number" ? window.history.state.usr.page : 1);
    const [draw, setDraw] = React.useState(0);
    const [period, setPeriod] = React.useState<Period>(defaultPeriod);
    const [selectedTransactions, setSelectedTransactions] = React.useState<Set<number>>(
        typeof window.history.state.usr?.selectedTransactions === "object"
            ? new Set(window.history.state.usr?.selectedTransactions)
            : new Set());
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
                    } else if (result.status === 404) {
                        setAccount(null);
                    }
                })
                .catch(e => {
                    console.log(e);
                    setAccount("error");
                });
        }
    }, [api, id]);

    if (account === "fetching") {
        return layout(period,
            <Hero title={<>#{id} &hellip;</>} subtitle={<>&hellip;</>} />,
            <Card title={t("account.account_details")!} isNarrow={false} style={{ flexGrow: 1 }}>
                <>{t("common.please_wait")}</>
            </Card>,
            <>{t("common.please_wait")}</>,
            <>{t("common.please_wait")}</>,
            <>{t("common.please_wait")}</>,
            <>
                <InputButton className="is-primary">{t("account.create_deposit")}</InputButton>
                <InputButton className="is-primary">{t("account.create_withdrawal")}</InputButton>
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
        subtitle={account.description.trim() !== "" ? account.description : PeriodFunctions.print(period)}
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
            goToPage={forget(goToPage)}
            pageSize={pageSize}
            draw={draw}
            selectedTransactions={selectedTransactions}
            setSelectedTransactions={setSelectedTransactions}
        />,
        <>
            <Link className="button is-primary"
                to={routes.transactionCreate()}
                state={{ allowBack: true, actionOnComplete: "back", destinationId: id }}>
                {t("account.create_deposit")}
            </Link>
            <Link className="button is-primary"
                to={routes.transactionCreate()}
                state={{ allowBack: true, actionOnComplete: "back", sourceId: id }}>
                {t("account.create_withdrawal")}
            </Link>
        </>
    );

    function updateHistory (period: Period, page: number, selectedTransactions: Set<number>): void {
        window.history.replaceState({
            ...window.history.state,
            usr: {
                period: PeriodFunctions.serialize(period),
                page,
                selectedTransactions: [...selectedTransactions]
            }
        }, "");
    }

    async function goToPage (newPage: number | "increment" | "decrement"): Promise<void> {
        if (api === null) return;
        if (newPage === page) return;

        if (newPage === "increment") {
            const nextPeriod = PeriodFunctions.increment(period);
            const transactionCount = await countTransactions(api, nextPeriod);
            const lastPage = Math.max(1, Math.ceil(transactionCount / pageSize));
            setPeriod(nextPeriod);
            setPage(lastPage);
        } else if (newPage === "decrement") {
            setPeriod(PeriodFunctions.decrement(period));
            setPage(1);
        } else {
            setPage(newPage);
        }
        setDraw(draw => draw + 1);
    }

    function updateAccountFavoriteInPreferences (account: Account, favorite: boolean): void {
        if (user !== "fetching") {
            if (favorite) {
                updateFavoriteAccounts([...user.favoriteAccounts, account]);
            } else {
                updateFavoriteAccounts(user.favoriteAccounts.filter(fav => fav.id !== account.id));
            }
        }
    }

    function toggleFavorite (): void {
        if (account === "error" || account === "fetching" || account === null || api === null) {
            throw new Error();
        }

        const favorite = !account.favorite;
        const { balance, id, ...newAccount } = account;
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

    async function countTransactions (api: Api, period: Period): Promise<number> {
        const [start, end] = PeriodFunctions.getRange(period);
        const query: SearchGroup = {
            type: SearchGroupType.And,
            children: [{
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

        const result = await api.Account.countTransactions(id, query);
        if (result.status === 404) {
            throw new Error(`Account ${id} not found.`);
        }
        return result.data;
    }
}

function layout (
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
                    <Card title={t("common.categories")!} style={{ flexGrow: 1 }} isNarrow={false}>
                        {categoryChart}
                    </Card>
                </div>
                <div className="column p-0 is-12-tablet is-reset-desktop">
                    <Card title={t("account.balance")!} style={{ flexGrow: 1 }} isNarrow={false}>
                        {balanceChart}
                    </Card>
                </div>
            </div>
            <Card title={t("common.actions")!} isNarrow={false}>
                <div className="buttons">
                    {actions}
                </div>
            </Card>
            <Card title={t("transaction.transactions_for_period", { period: PeriodFunctions.print(period) })!} isNarrow={false}>
                {transactions}
            </Card>
        </div>
    </>;
}
