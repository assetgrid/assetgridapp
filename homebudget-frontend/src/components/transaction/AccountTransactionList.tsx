import * as React from "react";
import { Transaction, TransactionListResponse } from "../../models/transaction";
import Table from "../common/Table";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../models/search";
import Decimal from "decimal.js";
import { Api } from "../../lib/ApiClient";
import { Period, PeriodFunctions } from "../../models/period";
import TransactionTableLine from "./TransactionTableLine";
import { preferencesContext } from "../App";

interface Props {
    draw?: number;
    accountId: number;
    period: Period;
    goToPage: (page: number | "increment" | "decrement") => void;
    page: number;
    pageSize?: number;
    totalItems?: number;
}

interface TableLine {
    balance: Decimal;
    transaction: Transaction;
}

export default function AccountTransactionList(props: Props) {
    const [descending, setDescending] = React.useState(true);
    const [draw, setDraw] = React.useState(0);

    return <Table<TableLine>
        renderType="custom"
        pageSize={props.pageSize ?? 20}
        draw={(props.draw ?? 0) + draw}
        type="async-increment"
        fetchItems={fetchItems}
        page={props.page}
        goToPage={props.goToPage}
        reversePagination={true}
        render={renderTable}
    />;

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
                        return <TransactionTableLine
                            accountId={props.accountId}
                            transaction={line.transaction}
                            balance={line.balance}
                            key={line.transaction.id}
                            allowEditing={true}
                            allowLinks={true}
                            updateItem={() => setDraw(draw => draw + 1) } />
                    })}
                </div>
                {heading}
            </div>
            {renderPagination()}
        </>;
    }
}