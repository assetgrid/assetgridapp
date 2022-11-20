import * as React from "react";
import { Transaction } from "../../../models/transaction";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../../models/search";
import Decimal from "decimal.js";
import { useApi } from "../../../lib/ApiClient";
import { Period, PeriodFunctions } from "../../../models/period";
import TransactionTableLine from "./TransactionTableLine";
import { TransactionSelectDropdownButton } from "./TransactionList";
import { useNavigate } from "react-router";
import { routes } from "../../../lib/routes";
import MergeTransactionsModal from "../input/MergeTransactionsModal";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { t } from "i18next";
import { Pagination } from "../../common/Pagination";

interface Props {
    accountId: number
    period: Period
    goToPage: (page: number | "increment" | "decrement") => void
    page: number
    pageSize?: number
    totalItems?: number
    selectedTransactions: Set<number>
    setSelectedTransactions: (value: Set<number>) => void
}

interface TableLine {
    balance: Decimal
    transaction: Transaction
}

export default function AccountTransactionList (props: Props): React.ReactElement {
    const descending = true;
    const pageSize = props.pageSize ?? 20;
    const from = (props.page - 1) * pageSize;
    const to = props.page * pageSize;

    const [shownTransactions, setShownTransactions] = React.useState<Transaction[]>([]);
    const firstRender = React.useRef(true);
    const [isMergingTransactions, setIsMergingTransactions] = React.useState(false);
    const navigate = useNavigate();
    const [start, end] = PeriodFunctions.getRange(props.period);
    const api = useApi();
    const { data, isError } = useQuery({
        queryKey: ["transaction", "list", "account", {
            from,
            to,
            start,
            end,
            accountId: props.accountId
        }],
        keepPreviousData: true,
        queryFn: fetchItems,
        onSuccess: result => {
            if (result.totalItems < (props.page - 1) * pageSize) {
                props.goToPage(1);
            }
        }
    });

    if (isError) {
        return <div>{t("common.error_occured")}</div>;
    }

    return <>
        <div className="transaction-table table is-fullwidth is-hoverable multi-select">
            <TableHeading
                selectedTransactions={props.selectedTransactions}
                setSelectedTransactions={props.setSelectedTransactions}
                selectAllTransactions={selectAllTransactions}
                beginEditMultiple={beginEditMultiple}
                beginMerging={() => setIsMergingTransactions(true)}
            />
            <div className="table-body">
                {data?.items.map(line => {
                    return <TransactionTableLine
                        accountId={props.accountId}
                        transactionId={line.transaction.id}
                        balance={line.balance}
                        key={line.transaction.id}
                        allowEditing={true}
                        allowSelection={true}
                        allowLinks={true}
                        transaction={line.transaction}
                        selected={props.selectedTransactions.has(line.transaction.id)}
                        toggleSelected={() => props.selectedTransactions.has(line.transaction.id)
                            ? deselectTransaction(line.transaction)
                            : props.setSelectedTransactions(new Set([...props.selectedTransactions, line.transaction.id]))} />;
                })}
            </div>
            <TableHeading
                selectedTransactions={props.selectedTransactions}
                setSelectedTransactions={props.setSelectedTransactions}
                selectAllTransactions={selectAllTransactions}
                beginEditMultiple={beginEditMultiple}
                beginMerging={() => setIsMergingTransactions(true)}
            />
        </div>
        <Pagination goToPage={props.goToPage}
            page={props.page}
            pageSize={pageSize}
            paginationSize={9}
            reversePagination={true}
            totalItems={data?.totalItems ?? 0}
            decrementPeriod={() => props.goToPage("decrement")}
            incrementPeriod={() => props.goToPage("increment")}
        />
        <MergeTransactionsModal active={isMergingTransactions}
            close={() => setIsMergingTransactions(false)}
            transactions={props.selectedTransactions}
            merged={() => setIsMergingTransactions(false)}
        />
    </>;

    async function fetchItems (): Promise<{ items: TableLine[], totalItems: number, offset: number }> {
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

        const result = await api.Account.listTransactions(props.accountId, from, to, descending, query);
        if (result.status === 404) {
            throw new Error(`Account ${props.accountId} not found`);
        }

        const transactions: Transaction[] = result.data.data;
        const balances: Decimal[] = [];
        if (descending) {
            for (let i = 0; i < transactions.length; i++) {
                balances[transactions.length - 1 - i] = (balances[transactions.length - 1 - i + 1] ?? new Decimal(result.data.total))
                    .add(transactions[transactions.length - 1 - i].total.mul(transactions[transactions.length - 1 - i].destination?.id === props.accountId ? 1 : -1));
            }
        } else {
            for (let i = 0; i < transactions.length; i++) {
                balances[i] = (balances[i - 1] ?? new Decimal(result.data.total))
                    .add(transactions[i].total.mul(transactions[i].destination?.id === props.accountId ? 1 : -1));
            }
        }

        // If it's not the first render, reset selected transactions
        if (!firstRender.current) {
            props.setSelectedTransactions(new Set());
        }
        firstRender.current = false;
        setShownTransactions(transactions);

        return {
            items: transactions.map((t, i) => ({
                balance: balances[i],
                transaction: t
            })),
            offset: from,
            totalItems: result.data.totalItems
        };
    }

    function beginEditMultiple (type: "selection" | "all"): void {
        const query: SearchGroup = type === "all"
            ? {
                type: SearchGroupType.Or,
                children: [
                    {
                        type: SearchGroupType.Query,
                        query: {
                            column: "SourceAccountId",
                            not: false,
                            operator: SearchOperator.Equals,
                            value: props.accountId,
                            metaData: false
                        }
                    },
                    {
                        type: SearchGroupType.Query,
                        query: {
                            column: "DestinationAccountId",
                            not: false,
                            operator: SearchOperator.Equals,
                            value: props.accountId,
                            metaData: false
                        }
                    }
                ]
            }
            : {
                type: SearchGroupType.And,
                children: [{
                    type: SearchGroupType.Query,
                    query: {
                        column: "Id",
                        not: false,
                        operator: SearchOperator.In,
                        value: [...props.selectedTransactions],
                        metaData: false
                    }
                }]
            };

        navigate(routes.transactionEditMultiple(), {
            state: {
                query,
                showBack: true
            }
        });
    }

    function deselectTransaction (transaction: Transaction): void {
        const newSelectedTransactions = new Set(props.selectedTransactions);
        newSelectedTransactions.delete(transaction.id);
        props.setSelectedTransactions(newSelectedTransactions);
    }

    function selectAllTransactions (): void {
        const newSelectedTransactions = new Set(shownTransactions.map(t => t.id));
        props.setSelectedTransactions(newSelectedTransactions);
    }
}

interface TableHeadingProps {
    selectedTransactions: Set<number>
    setSelectedTransactions: (value: Set<number>) => void
    selectAllTransactions: () => void
    beginEditMultiple: (type: "selection" | "all") => void
    beginMerging: () => void
}
function TableHeading (props: TableHeadingProps): React.ReactElement {
    const { t } = useTranslation();
    return <div className="table-heading">
        <div>
            <TransactionSelectDropdownButton
                clearSelection={() => props.setSelectedTransactions(new Set())}
                selectAll={() => props.selectAllTransactions()}
                selected={props.selectedTransactions.size > 0}
                editSelection={() => props.beginEditMultiple("selection")}
                editSelectionDisabled={props.selectedTransactions.size === 0}
                editAll={() => props.beginEditMultiple("all")}
                editAllText={t("account.modify_all_transactions_for_account")}
                mergeSelection={() => props.beginMerging()}
            />
        </div>
        <div>{t("common.timestamp")}</div>
        <div>{t("common.description")}</div>
        <div className="has-text-right">{t("transaction.amount")}</div>
        <div className="has-text-right">{t("account.balance")}</div>
        <div>{t("transaction.destination")}</div>
        <div>{t("common.category")}</div>
        <div>{t("common.actions")}</div>
    </div>;
}
