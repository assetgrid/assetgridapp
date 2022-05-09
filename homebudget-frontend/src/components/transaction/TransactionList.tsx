import axios, { AxiosResponse } from "axios";
import * as React from "react";
import { Transaction } from "../../models/transaction";
import CreateTransaction from "./CreateTransaction";
import InputButton from "../form/InputButton";
import Table from "../common/Table";
import { SearchRequest, SearchResponse } from "../../models/search";
import AccountTooltip from "../account/AccountTooltip";

interface Props {
    draw?: number;
}

export default class TransactionList extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }
    
    private fetchItems(from: number, to: number, draw: number): Promise<{ items: Transaction[], totalItems: number, offset: number, draw: number }> {
        return new Promise(resolve => {
            axios.post<SearchRequest, AxiosResponse<SearchResponse<Transaction>>>(`https://localhost:7262/transaction/search`, {
                from: from,
                to: to,
            }).then(res => {
                const transactions: Transaction[] = res.data.data;
                resolve({
                    items: transactions,
                    draw: draw,
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
            draw={this.props.draw}
            fetchItems={this.fetchItems}
            renderItem={transaction =>
                <tr key={transaction.id}>
                    <td>{transaction.dateTime}</td>
                    <td style={{textAlign: "right"}}>{transaction.lines.map(line => line.amount).reduce((a, b) => a + b, 0)}</td>
                    <td>{transaction.description}</td>
                    <td>{transaction.sourceAccount != null
                        ? <AccountTooltip account={transaction.sourceAccount}>#{transaction.sourceAccount.id} {transaction.sourceAccount.name}</AccountTooltip>
                        : <></>
                    }</td>
                    <td>{transaction.destinationAccount != null
                        ? <AccountTooltip account={transaction.destinationAccount}>#{transaction.destinationAccount.id} {transaction.destinationAccount.name}</AccountTooltip>
                        : <></>
                    }</td>
                    <td></td>
                </tr>}
            />;
    }
}