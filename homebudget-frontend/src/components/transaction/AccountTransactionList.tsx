import axios, { AxiosResponse } from "axios";
import * as React from "react";
import { Transaction, TransactionListResponse } from "../../models/transaction";
import CreateTransaction from "./CreateTransaction";
import InputButton from "../form/InputButton";
import Table from "../common/Table";
import { SearchGroup, SearchGroupType, SearchOperator, SearchRequest, SearchResponse } from "../../models/search";
import AccountTooltip from "../account/AccountTooltip";
import { formatNumber, formatNumberWithPrefs } from "../../lib/Utils";
import { Preferences } from "../../models/preferences";
import { Account } from "../../models/account";
import Decimal from "decimal.js";
import { Api } from "../../lib/ApiClient";
import { Period, PeriodFunctions } from "../../models/period";

interface Props {
    draw?: number;
    accountId: number;
    preferences: Preferences | "fetching";
    period: Period;
    decrementPeriod?: () => void;
    incrementPeriod?: () => void;
}

interface State {
    total: Decimal | null;
    descending: boolean;
    draw: number;
}

interface TableLine {
    balance: Decimal;
    amount: Decimal;
    offsetAccount: Account;
    transaction: Transaction;
}

export default class AccountTransactionList extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            total: null,
            descending: true,
            draw: 0,
        };
    }
    
    private fetchItems(from: number, to: number, draw: number): Promise<{ items: TableLine[], totalItems: number, offset: number, draw: number }> {
        console.log(draw);
        console.log(this.state.draw);
        let [start, end] = PeriodFunctions.getRange(this.props.period);
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
            Api.Account.listTransactions(this.props.accountId, from, to, this.state.descending, query).then(result => {
                const transactions: Transaction[] = result.data;
                let balances: Decimal[] = [];
                if (this.state.descending) {
                    for (let i = 0; i < transactions.length; i++) {
                        balances[transactions.length - 1 - i] = (balances[transactions.length - 1 - i + 1] ?? new Decimal(result.total))
                            .add(transactions[transactions.length - 1 - i].total.mul(transactions[transactions.length - 1 - i].destination?.id === this.props.accountId ? 1 : -1))
                    }
                } else {
                    for (let i = 0; i < transactions.length; i++) {
                        balances[i] = (balances[i - 1] ?? new Decimal(result.total))
                            .add(transactions[i].total.mul(transactions[i].destination?.id === this.props.accountId ? 1 : -1))
                    }
                }

                this.setState({ total: result.total }, () =>
                    resolve({
                        items: transactions.map((t, i) => ({ 
                            balance: balances[i],
                            transaction: t,
                            offsetAccount: t.destination?.id === this.props.accountId ? t.source : t.destination,
                            amount: t.destination?.id === this.props.accountId ? t.total : t.total.neg(),
                        })),
                        draw: draw,
                        offset: from,
                        totalItems: result.totalItems
                    }));
            })
        });
    }

    componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any): void {
        if (prevProps.period !== this.props.period) {
            this.setState({ draw: this.state.draw + 1 });
        }
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
            decrement={this.props.decrementPeriod}
            increment={() => { this.props.incrementPeriod(); }}
            pageSize={20}
            draw={(this.props.draw ?? 0) + this.state.draw}
            fetchItems={this.fetchItems.bind(this)}
            renderItem={line => {
                return <tr key={line.transaction.id}>
                    <td>{line.transaction.dateTime.toString()}</td>
                    <td>{line.transaction.description}</td>
                    <td className={"number-total " + (line.amount.greaterThan(0) ? "positive" : (line.amount.lessThan(0) ? "negative" : ""))}>{formatNumberWithPrefs(line.amount, this.props.preferences)}</td>
                    <td className={"number-total"} style={{fontWeight: "normal"}}>{formatNumberWithPrefs(line.balance, this.props.preferences)}</td>
                    <td>
                        {line.offsetAccount !== null && <AccountTooltip account={line.offsetAccount}>#{line.offsetAccount.id} {line.offsetAccount.name}</AccountTooltip>}
                    </td>
                    <td></td>
                </tr>
                }
            }
            />;
    }
}