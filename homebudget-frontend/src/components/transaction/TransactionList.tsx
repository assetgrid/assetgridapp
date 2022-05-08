import axios, { AxiosResponse } from "axios";
import * as React from "react";
import { Transaction } from "../../models/transaction";
import CreateTransaction from "./CreateTransaction";
import InputButton from "../form/InputButton";
import Table from "../common/Table";
import { SearchRequest, SearchResponse } from "../../models/search";
import AccountTooltip from "../account/AccountTooltip";

export default class TransactionList extends React.Component<{}> {
    constructor(props: {}) {
        super(props);
    }
    
    private fetchItems(from: number, to: number): Promise<{ items: Transaction[], totalItems: number, offset: number }> {
        return new Promise(resolve => {
            axios.post<SearchRequest, AxiosResponse<SearchResponse<Transaction>>>(`https://localhost:7262/transaction/search`, {
                from: from,
                to: to
            }).then(res => {
                const transactions: Transaction[] = res.data.data;
                resolve({
                    items: transactions,
                    offset: from,
                    totalItems: res.data.totalItems
                });
            })
        });
    }

    public render() {
        return <Table
            headings={<tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Description</th>
                <th>Source</th>
                <th>Destination</th>
                <th>Category</th>
            </tr>}
            pageSize={20}
            fetchItems={this.fetchItems}
            renderItem={transaction =>
                <tr key={transaction.id}>
                    <td>{transaction.created}</td>
                    <td style={{textAlign: "right"}}>{transaction.lines.map(line => line.amount).reduce((a, b) => a + b, 0)}</td>
                    <td>{transaction.description}</td>
                    <td>{transaction.from != null
                        ? <AccountTooltip account={transaction.from}>#{transaction.from.id} {transaction.from.name}</AccountTooltip>
                        : <></>
                    }</td>
                    <td>{transaction.to != null
                        ? <AccountTooltip account={transaction.to}>#{transaction.to.id} {transaction.to.name}</AccountTooltip>
                        : <></>
                    }</td>
                    <td></td>
                </tr>}
            />;
    }
}