import * as React from "react";
import { Transaction } from "../../models/transaction";
import Table from "../common/Table";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../models/search";
import Decimal from "decimal.js";
import { Api } from "../../lib/ApiClient";
import { Period, PeriodFunctions } from "../../models/period";
import TransactionTableLine from "./TransactionTableLine";
import { TransactionSelectDropdownButton } from "./TransactionList";
import { useNavigate } from "react-router";
import { routes } from "../../lib/routes";
import { serializeQueryForHistory } from "./filter/FilterHelpers";
import MergeTransactionsModal from "./input/MergeTransactionsModal";

interface Props {
    draw?: number
    accountId: number
    period: Period
    goToPage: (page: number | "increment" | "decrement") => void
    page: number
    pageSize?: number
    totalItems?: number
    selectedTransactions: { [id: number]: boolean }
    setSelectedTransactions: (value: { [id: number]: boolean }) => void
}

interface TableLine {
    balance: Decimal
    transaction: Transaction
}

export default function AccountTransactionList (props: Props): React.ReactElement {
    const descending = true;
    const [draw, setDraw] = React.useState(0);
    const [shownTransactions, setShownTransactions] = React.useState<Transaction[]>([]);
    const firstRender = React.useRef(true);
    const [isMergingTransactions, setIsMergingTransactions] = React.useState(false);
    const navigate = useNavigate();

    return <>
        <Table<TableLine>
            renderType="custom"
            pageSize={props.pageSize ?? 20}
            draw={(props.draw ?? 0) + draw}
            type="async-increment"
            fetchItems={fetchItems}
            page={props.page}
            goToPage={props.goToPage}
            reversePagination={true}
            render={renderTable}
        />
        <MergeTransactionsModal active={isMergingTransactions}
            close={() => setIsMergingTransactions(false)}
            transactions={props.selectedTransactions}
            merged={() => { setIsMergingTransactions(false); setDraw(draw => draw + 1); }} />
    </>;

    async function fetchItems (api: Api, from: number, to: number, draw: number): Promise<{ items: TableLine[], totalItems: number, offset: number, draw: number }> {
        const [start, end] = PeriodFunctions.getRange(props.period);
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
        return await new Promise(resolve => {
            api.Account.listTransactions(props.accountId, from, to, descending, query).then(result => {
                if (result.status === 200) {
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
                        props.setSelectedTransactions({});
                    }
                    firstRender.current = false;
                    setShownTransactions(transactions);

                    resolve({
                        items: transactions.map((t, i) => ({
                            balance: balances[i],
                            transaction: t
                        })),
                        draw,
                        offset: from,
                        totalItems: result.data.totalItems
                    });
                }
            });
        });
    }

    function renderTable (items: Array<{ item: TableLine, index: number }>, renderPagination: () => React.ReactElement): React.ReactElement {
        const heading = <div className="table-heading">
            <div>
                <TransactionSelectDropdownButton
                    clearSelection={() => props.setSelectedTransactions({})}
                    selectAll={() => selectAllTransactions()}
                    selected={Object.keys(props.selectedTransactions).length > 0}
                    editSelection={() => beginEditMultiple("selection")}
                    editSelectionDisabled={Object.keys(props.selectedTransactions).length === 0}
                    editAll={() => beginEditMultiple("all")}
                    editAllText="Modify all transactions for this account"
                    mergeSelection={() => setIsMergingTransactions(true)}
                />
            </div>
            <div>Date</div>
            <div>Description</div>
            <div className="has-text-right">Amount</div>
            <div className="has-text-right">Balance</div>
            <div>Destination</div>
            <div>Category</div>
            <div>Actions</div>
        </div>;

        return <>
            <div className="transaction-table table is-fullwidth is-hoverable multi-select">
                {heading}
                <div className="table-body">
                    {items.map(({ item: line }) => {
                        return <TransactionTableLine
                            accountId={props.accountId}
                            transaction={line.transaction}
                            balance={line.balance}
                            key={line.transaction.id}
                            allowEditing={true}
                            allowSelection={true}
                            allowLinks={true}
                            updateItem={() => setDraw(draw => draw + 1)}
                            selected={props.selectedTransactions[line.transaction.id] === true}
                            toggleSelected={() => props.selectedTransactions[line.transaction.id]
                                ? deselectTransaction(line.transaction)
                                : props.setSelectedTransactions({ ...props.selectedTransactions, [line.transaction.id]: true })} />;
                    })}
                </div>
                {heading}
            </div>
            {renderPagination()}
        </>;
    }

    function beginEditMultiple (type: "selection" | "all") {
        const query: SearchGroup = type == "all"
            ? {
                type: SearchGroupType.Or,
                children: [
                    {
                        type: SearchGroupType.Query,
                        query: {
                            column: "SourceAccountId",
                            not: false,
                            operator: SearchOperator.Equals,
                            value: props.accountId
                        }
                    },
                    {
                        type: SearchGroupType.Query,
                        query: {
                            column: "DestinationAccountId",
                            not: false,
                            operator: SearchOperator.Equals,
                            value: props.accountId
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
                        value: Object.keys(props.selectedTransactions).map(id => Number(id))
                    }
                }]
            };

        navigate(routes.transactionEditMultiple(), {
            state: {
                query: serializeQueryForHistory(query),
                showBack: true
            }
        });
    }

    function deselectTransaction (transaction: Transaction) {
        const newSelectedTransactions = { ...props.selectedTransactions };
        delete newSelectedTransactions[transaction.id];
        props.setSelectedTransactions(newSelectedTransactions);
    }

    function selectAllTransactions () {
        const newSelectedTransactions: { [id: number]: boolean } = {};
        shownTransactions.forEach(t => newSelectedTransactions[t.id] = true);
        props.setSelectedTransactions(newSelectedTransactions);
    }
}
