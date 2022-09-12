import * as React from "react";
import { Transaction } from "../../models/transaction";
import Table from "../common/Table";
import { SearchGroup, SearchRequest } from "../../models/search";
import { Preferences } from "../../models/preferences";
import { formatNumberWithPrefs } from "../../lib/Utils";
import Decimal from "decimal.js";
import { Api } from "../../lib/ApiClient";
import AccountLink from "../account/AccountLink";
import Tooltip from "../common/Tooltip";
import TransactionLink from "./TransactionLink";
import TransactionTableLine from "./TransactionTableLine";

interface Props {
    draw?: number;
    preferences: Preferences | "fetching";
    query?: SearchGroup;
}

export default function TransactionList(props: Props) {
    const [draw, setDraw] = React.useState(0);
    
    return <Table<Transaction>
        /* headings={<tr>
            <th></th>
            <th>Date</th>
            <th>Description</th>
            <th className="has-text-right">Amount</th>
            <th>Source</th>
            <th>Destination</th>
            <th>Category</th>
            <th>Actions</th>
        </tr>} */
        pageSize={20}
        draw={props.draw + draw}
        type="async"
        renderType="custom"
        fetchItems={fetchItems}
        render={renderTable}
    />;
    
    function fetchItems(from: number, to: number, draw: number): Promise<{ items: Transaction[], totalItems: number, offset: number, draw: number }> {
        return new Promise(resolve => {
            Api.Transaction.search({
                from: from,
                to: to,
                query: props.query
            } as SearchRequest).then(result => {
                const transactions: Transaction[] = result.data;
                resolve({
                    items: transactions,
                    draw: draw,
                    offset: from,
                    totalItems: result.totalItems
                });
            })
        });
    };

    function renderTable(items: { item: Transaction, index: number }[], renderPagination: () => React.ReactElement): React.ReactElement {
        const heading = <div className="table-heading">
            <div></div>
            <div>Date</div>
            <div>Description</div>
            <div className="has-text-right">Amount</div>
            <div>Source</div>
            <div>Destination</div>
            <div>Category</div>
            <div>Actions</div>
        </div>;

        return <>
            <div className="transaction-table table is-fullwidth is-hoverable">
                {heading}
                <div className="table-body">
                    {items.map(({ item: transaction }) => {
                        return <TransactionTableLine
                            key={transaction.id}
                            transaction={transaction}
                            preferences={props.preferences}
                            updateItem={() => setDraw(draw => draw + 1)} />
                    })}
                </div>
                {heading}
            </div>
            {renderPagination()}
        </>;
    }
}