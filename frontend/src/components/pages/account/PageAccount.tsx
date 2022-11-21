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
import InputButton from "../../input/InputButton";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../../models/search";
import Page404 from "../Page404";
import PageError from "../PageError";
import AccountDetailsCard from "../../account/AccountDetailsCard";
import Hero from "../../common/Hero";
import { Link } from "react-router-dom";
import { t } from "i18next";
import { User } from "../../../models/user";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HttpErrorResult } from "../../../models/api";

const pageSize = 20;

export default function PageAccount (): React.ReactElement {
    const idString = useParams().id;
    const id = Number(idString);

    // Get state from history
    let defaultPeriod: Period = {
        type: "month",
        start: DateTime.now().startOf("month")
    };
    if (typeof window.history.state.usr?.period === "string") {
        try {
            const period = PeriodFunctions.parse(window.history.state.usr.period);
            if (period != null) {
                defaultPeriod = period;
            }
        } catch { }
    }

    const api = useApi();
    const { data: account, isError } = useQuery({ queryKey: ["account", id, "full"], queryFn: async () => await api.Account.get(id) });
    const queryClient = useQueryClient();
    const { mutate, isLoading: isMutating } = useMutation<Account, HttpErrorResult, Account, unknown>({
        mutationFn: async account => await api.Account.update(id, account),
        onSuccess: result => {
            queryClient.setQueryData<Account>(["account", id, "full"], _ => result);
            queryClient.setQueryData<Account>(["account", id], _ => result);
            forget(queryClient.invalidateQueries)(["account", "list"]);

            // Update favorite accounts
            if (result.favorite !== account?.favorite) {
                if (result.favorite) {
                    queryClient.setQueryData<User>(["user"], old => ({
                        ...old!,
                        favoriteAccounts: [...old!.favoriteAccounts, result]
                    }));
                } else {
                    queryClient.setQueryData<User>(["user"], old => ({
                        ...old!,
                        favoriteAccounts: old!.favoriteAccounts.filter(fav => fav.id !== result.id)
                    }));
                }
            }
        }
    });
    const [page, setPage] = React.useState(typeof (window.history.state.usr?.page) === "number" ? window.history.state.usr.page : 1);
    const [period, setPeriod] = React.useState<Period>(defaultPeriod);
    const [selectedTransactions, setSelectedTransactions] = React.useState<Set<number>>(
        typeof window.history.state.usr?.selectedTransactions === "object"
            ? new Set(window.history.state.usr?.selectedTransactions)
            : new Set());

    // Keep state updated
    const updateHistoryDebounced = React.useCallback(debounce(updateHistory, 300), []);
    React.useEffect(() => {
        updateHistoryDebounced(period, page, selectedTransactions);
    }, [period, page, selectedTransactions]);

    if (account === undefined) {
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
    if (isError) {
        return <PageError />;
    }
    if (account === null) {
        return <Page404 />;
    }

    return layout(period,
        <Hero title={<>
            {isMutating || api === null
                ? <span className="icon">
                    <FontAwesomeIcon icon={solid.faSpinner} pulse />
                </span>
                : <span className="icon" onClick={() => toggleFavorite()} style={{ cursor: "pointer" }}>
                    {account.favorite ? <FontAwesomeIcon icon={solid.faStar} /> : <FontAwesomeIcon icon={regular.faStar} />}
                </span>} #{account.id} {account.name}
        </>}
        subtitle={account.description.trim() !== "" ? account.description : PeriodFunctions.print(period)}
        period={[period, period => { setPeriod(period); setPage(1); }]} />,
        <AccountDetailsCard account={account} isUpdatingFavorite={isMutating} />,
        <AccountCategoryChart id={id} period={period} />,
        <AccountBalanceChart id={id} period={period} />,
        <AccountTransactionList
            accountId={id}
            period={period}
            page={page}
            goToPage={forget(goToPage)}
            pageSize={pageSize}
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
    }

    function toggleFavorite (): void {
        if (account === undefined || account === null) return;
        mutate({ ...account, favorite: !account.favorite });
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
                    not: false,
                    metaData: false
                }
            }, {
                type: SearchGroupType.Query,
                query: {
                    column: "DateTime",
                    value: end.toISO(),
                    operator: SearchOperator.GreaterThan,
                    not: true,
                    metaData: false
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
