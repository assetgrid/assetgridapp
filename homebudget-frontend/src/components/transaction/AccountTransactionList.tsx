import axios, { AxiosResponse } from "axios";
import * as React from "react";
import { Transaction, TransactionListResponse } from "../../models/transaction";
import CreateTransaction from "./CreateTransaction";
import InputButton from "../form/InputButton";
import Table from "../common/Table";
import { SearchRequest, SearchResponse } from "../../models/search";
import AccountTooltip from "../account/AccountTooltip";
import { formatNumber } from "../../lib/Utils";
import { Preferences } from "../../models/preferences";

interface Props {
    draw?: number;
    accountId: number;
    preferences: Preferences | "fetching";
}

interface State {
    total: number | null;
    descending: boolean;
}

interface TableLine {
    balance: number;
    transaction: Transaction;
}

export default class AccountTransactionList extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            total: null,
            descending: true,
        };
    }
    
    private fetchItems(from: number, to: number, draw: number): Promise<{ items: TableLine[], totalItems: number, offset: number, draw: number }> {
        return new Promise(resolve => {
            axios.post<TransactionListResponse>("https://localhost:7262/account/" + this.props.accountId + "/transactions", {
                from: from,
                to: to,
                descending: this.state.descending
            }).then(res => {
                const transactions: Transaction[] = res.data.data;
                let balances: number[] = [];
                if (this.state.descending) {
                    for (let i = 0; i < transactions.length; i++) {
                        balances[transactions.length - 1 - i] = (balances[transactions.length - 1 - i + 1] ?? res.data.total) + transactions[transactions.length - 1 - i]
                            .lines.map(line => line.amount).reduce((a, b) => a + b, 0)
                    }
                } else {
                    for (let i = 0; i < transactions.length; i++) {
                        balances[i] = (balances[i - 1] ?? res.data.total) + transactions[i]
                            .lines.map(line => line.amount).reduce((a, b) => a + b, 0)
                    }
                }

                this.setState({ total: res.data.total }, () =>
                    resolve({
                        items: transactions.map((t, i) => ({ balance: balances[i], transaction: t })),
                        draw: draw,
                        offset: from,
                        totalItems: res.data.totalItems
                    }));
            })
        });
    }

    public render() {
        return <Table<TableLine>
            headings={<tr>
                <th>Date</th>
                <th>Description</th>
                <th className="has-text-right">Amount</th>
                <th className="has-text-right">Balance</th>
                <th>Destination</th>
                <th>Category</th>
            </tr>}
            pageSize={20}
            draw={this.props.draw}
            fetchItems={this.fetchItems.bind(this)}
            renderItem={line => {
                const total = line.transaction.lines.map(line => line.amount).reduce((a, b) => a + b, 0);
                return <tr key={line.transaction.id}>
                        <td>{line.transaction.dateTime}</td>
                        <td>{line.transaction.description}</td>
                        <td className={"number-total " + (total > 0 ? "positive" : (total < 0 ? "negative" : ""))}>{formatNumber(total)}</td>
                        <td className={"number-total"} style={{fontWeight: "normal"}}>{formatNumber(line.balance)}</td>
                        <td>{line.transaction.destination != null
                            ? <AccountTooltip account={line.transaction.destination}>#{line.transaction.destination.id} {line.transaction.destination.name}</AccountTooltip>
                            : <></>
                        }</td>
                        <td></td>
                    </tr>
                }
            }
            />;
    }
}