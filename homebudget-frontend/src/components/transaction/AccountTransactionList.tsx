import * as React from "react";
import { Transaction, TransactionListResponse } from "../../models/transaction";
import Table from "../common/Table";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../models/search";
import { Preferences } from "../../models/preferences";
import { Account } from "../../models/account";
import Decimal from "decimal.js";
import { Api } from "../../lib/ApiClient";
import { Period, PeriodFunctions } from "../../models/period";
import TransactionTableLine from "./TransactionTableLine";

interface Props {
    draw?: number;
    accountId: number;
    preferences: Preferences | "fetching";
    period: Period;
    decrementPeriod?: () => Promise<void>;
    incrementPeriod?: () => Promise<void>;
}

interface TableLine {
    balance: Decimal;
    transaction: Transaction;
}

const pageSize = 20;

export default function AccountTransactionList(props: Props) {
    const [descending, setDescending] = React.useState(true);
    const [draw, setDraw] = React.useState(0);
    const [page, setPage] = React.useState(1);

    const [targetPage, setTargetPage] = React.useState<number | "last" | null>(null);

    React.useEffect(() => {
        if (targetPage === "last") {
            countTransactions().then(count => {
                const lastPage = Math.max(1, Math.ceil(count / pageSize));
                setPage(lastPage);
                setDraw(draw => draw + 1);
                setTargetPage(null);
            });
            return;
        } else if (targetPage !== null) {
            setPage(targetPage);
            setTargetPage(null);
        }
        setDraw(draw => draw + 1);
    }, [props.period])

    return <Table<TableLine>
        renderType="custom"
        decrement={() => decrementPeriod()}
        increment={() => incrementPeriod()}
        pageSize={pageSize}
        draw={(props.draw ?? 0) + draw}
        type="async-increment"
        fetchItems={fetchItems}
        page={page}
        goToPage={page => goToPage(page)}
        reversePagination={true}
        render={renderTable}
    />;
    
    function goToPage(page: number) {
        setPage(page);
        setDraw(draw => draw + 1);
    }

    function decrementPeriod() {
        setTargetPage(1);
        props.decrementPeriod();
    }

    async function incrementPeriod() {
        setTargetPage("last");
        props.incrementPeriod();
    }

    function countTransactions(): Promise<number> {
        let [start, end] = PeriodFunctions.getRange(props.period);
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
            Api.Account.countTransactions(props.accountId, query)
                .then(result => resolve(result));
        });
    }

    function fetchItems(from: number, to: number, draw: number): Promise<{ items: TableLine[], totalItems: number, offset: number, draw: number }> {
        let [start, end] = PeriodFunctions.getRange(props.period);
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
            Api.Account.listTransactions(props.accountId, from, to, descending, query).then(result => {
                const transactions: Transaction[] = result.data;
                let balances: Decimal[] = [];
                if (descending) {
                    for (let i = 0; i < transactions.length; i++) {
                        balances[transactions.length - 1 - i] = (balances[transactions.length - 1 - i + 1] ?? new Decimal(result.total))
                            .add(transactions[transactions.length - 1 - i].total.mul(transactions[transactions.length - 1 - i].destination?.id === props.accountId ? 1 : -1))
                    }
                } else {
                    for (let i = 0; i < transactions.length; i++) {
                        balances[i] = (balances[i - 1] ?? new Decimal(result.total))
                            .add(transactions[i].total.mul(transactions[i].destination?.id === props.accountId ? 1 : -1))
                    }
                }

                resolve({
                    items: transactions.map((t, i) => ({ 
                        balance: balances[i],
                        transaction: t,
                    })),
                    draw: draw,
                    offset: from,
                    totalItems: result.totalItems
                });
            })
        });
    }

    function renderTable(items: { item: TableLine, index: number }[], renderPagination: () => React.ReactElement): React.ReactElement {
        const heading = <div className="table-heading">
            <div></div>
            <div>Date</div>
            <div>Description</div>
            <div className="has-text-right">Amount</div>
            <div className="has-text-right">Balance</div>
            <div>Destination</div>
            <div>Category</div>
            <div>Actions</div>
        </div>;

        return <>
            <div className="transaction-table table is-fullwidth is-hoverable">
                {heading}
                <div className="table-body">
                    {items.map(({ item: line }) => {
                        return <TransactionTableLine preferences={props.preferences}
                            accountId={props.accountId}
                            transaction={line.transaction}
                            balance={line.balance}
                            key={line.transaction.id}
                            updateItem={() => setDraw(draw => draw + 1) } />
                    })}
                </div>
                {heading}
            </div>
            {renderPagination()}
        </>;
    }
}