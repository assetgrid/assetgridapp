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

interface Props {
    draw?: number;
    preferences: Preferences | "fetching";
    query?: SearchGroup;
}

export default function TransactionList(props: Props) {
    return <Table<Transaction>
        headings={<tr>
            <th></th>
            <th>Date</th>
            <th>Amount</th>
            <th>Description</th>
            <th>Source</th>
            <th>Destination</th>
            <th>Category</th>
        </tr>}
        pageSize={20}
        draw={props.draw}
        type="async"
        fetchItems={fetchItems}
        renderItem={transaction => {
            const total = transaction.lines.map(line => line.amount).reduce((a, b) => a.add(b), new Decimal(0));
            return <tr key={transaction.id}>
                <td>
                    <TransactionLink transaction={transaction} />
                </td>
                <td>{transaction.dateTime.toString()}</td>
                <td className={"number-total"}>
                    {formatNumberWithPrefs(total, props.preferences)}
                </td>
                <td>{transaction.description}</td>
                <td>{transaction.source != null
                    ? <AccountLink account={transaction.source} />
                    : <></>
                }</td>
                <td>{transaction.destination != null
                    ? <AccountLink account={transaction.destination} />
                    : <></>
                }</td>
                <td>{transaction.category}</td>
            </tr> }
        }
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
}