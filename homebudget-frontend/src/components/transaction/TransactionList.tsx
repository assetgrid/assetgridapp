import axios from "axios";
import * as React from "react";
import { Transaction } from "../../models/transaction";
import Table from "../common/Table";
import { SearchRequest, SearchResponse } from "../../models/search";
import AccountTooltip from "../account/AccountTooltip";
import { Preferences } from "../../models/preferences";
import { formatNumber } from "../../lib/Utils";
import Decimal from "decimal.js";
import { Api } from "../../lib/ApiClient";

interface Props {
    draw?: number;
    preferences: Preferences | "fetching";
}

export default class TransactionList extends React.Component<Props, {}> {
    constructor(props: Props) {
        super(props);
    }
    
    private fetchItems(from: number, to: number, draw: number): Promise<{ items: Transaction[], totalItems: number, offset: number, draw: number }> {
        return new Promise(resolve => {
            Api.Transaction.search({
                from: from,
                to: to,
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
    }

    public render() {
        const prefs = this.props.preferences !== "fetching" ? this.props.preferences :  {
            decimalDigits: 2,
            decimalSeparator: ".",
            thousandsSeparator: ","
        } as Preferences;

        return <Table<Transaction>
            headings={<tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Description</th>
                <th>Source</th>
                <th>Destination</th>
                <th>Category</th>
            </tr>}
            pageSize={20}
            draw={this.props.draw}
            fetchItems={this.fetchItems.bind(this)}
            renderItem={transaction => {
                const total = transaction.lines.map(line => line.amount).reduce((a, b) => a.add(b), new Decimal(0));
                return <tr key={transaction.id}>
                    <td>{transaction.dateTime}</td>
                    <td className={"number-total"}>
                        {formatNumber(total, prefs.decimalDigits, prefs.decimalSeparator, prefs.thousandsSeparator)}
                    </td>
                    <td>{transaction.description}</td>
                    <td>{transaction.source != null
                        ? <AccountTooltip account={transaction.source}>#{transaction.source.id} {transaction.source.name}</AccountTooltip>
                        : <></>
                    }</td>
                    <td>{transaction.destination != null
                        ? <AccountTooltip account={transaction.destination}>#{transaction.destination.id} {transaction.destination.name}</AccountTooltip>
                        : <></>
                    }</td>
                    <td></td>
                </tr> }
            }
            />;
    }
}