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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as regular from "@fortawesome/free-regular-svg-icons"
import * as solid from "@fortawesome/free-solid-svg-icons"
import { DateTime } from "luxon";
import InputText from "../form/InputText";
import InputAccount from "../form/account/InputAccount";
import { Calendar } from "react-date-range";
import InputDate from "../form/InputDate";
import Modal from "../common/Modal";
import InputCategory from "../form/InputCategory";

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
    category: string;
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
                            category: t.category
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
                <th>Actions</th>
            </tr>}
            decrement={this.props.decrementPeriod}
            increment={() => { this.props.incrementPeriod(); }}
            pageSize={20}
            draw={(this.props.draw ?? 0) + this.state.draw}
            fetchItems={this.fetchItems.bind(this)}
            reversePagination={true}
            renderItem={line =>
                <AccountTransactionListItem preferences={this.props.preferences}
                    data={line}
                    key={line.transaction.id}
                    type={line.transaction.source?.id === this.props.accountId ? "withdrawal" : "deposit"}
                    updateItem={() => this.setState({ draw: this.state.draw + 1 }) } />
            }
            />;
    }
}

interface IAccountTransactionListItemProps {
    data: TableLine;
    preferences: Preferences | "fetching";
    updateItem: (item: Transaction) => void;
    type: "deposit" | "withdrawal";
}
interface IAccountTransactionListItemState {
    disabled: boolean;
    editingModel: null | {
        amount: Decimal,
        description: string,
        dateTime: DateTime,
        offsetAccount: Account,
        category: string,
    };
    deleting: boolean;
}

class AccountTransactionListItem extends React.Component<IAccountTransactionListItemProps, IAccountTransactionListItemState> {
    constructor(props: IAccountTransactionListItemProps) {
        super(props);
        this.state = {
            disabled: false,
            editingModel: null,
            deleting: false
        };
    }

    public render() {
        const line = this.props.data;

        if (this.state.editingModel !== null) {
            const model = this.state.editingModel;
            return <tr key={line.transaction.id} className="editing">
                <td>
                    <InputDate value={model.dateTime}
                        onChange={e => this.setState({ editingModel: { ...this.state.editingModel, dateTime: e } })}
                        disabled={this.state.disabled} /></td>
                <td>
                    <InputText value={model.description}
                        onChange={(e) => this.setState({ editingModel: { ...this.state.editingModel, description: e.target.value } })}
                        disabled={this.state.disabled} /></td>
                <td className={"number-total " + (line.amount.greaterThan(0) ? "positive" : (line.amount.lessThan(0) ? "negative" : ""))}>{formatNumberWithPrefs(line.amount, this.props.preferences)}</td>
                <td className={"number-total"} style={{ fontWeight: "normal" }}>{formatNumberWithPrefs(line.balance, this.props.preferences)}</td>
                <td>
                    <InputAccount 
                        value={model.offsetAccount?.id ?? null}
                        disabled={this.state.disabled}
                        allowNull={true}
                        onChange={account => this.setState({ editingModel: { ...this.state.editingModel, offsetAccount: account } })} />
                </td>
                <td>
                    <InputCategory
                        value={model.category}
                        disabled={this.state.disabled}
                        onChange={category => this.setState({editingModel: { ...this.state.editingModel, category: category }})} />
                </td>
                <td>
                    {! this.state.disabled && <>
                        <span className="icon button" onClick={() => this.saveChanges()}>
                            <FontAwesomeIcon icon={solid.faCheck} />
                        </span>
                        <span className="icon button" onClick={() => this.setState({ editingModel: null })}>
                            <FontAwesomeIcon icon={solid.faXmark} />
                        </span>
                    </>}
                </td>
            </tr>;
        } else {
            return <tr key={line.transaction.id}>
                <td>{line.transaction.dateTime.toString()}</td>
                <td>{line.transaction.description}</td>
                <td className={"number-total " + (line.amount.greaterThan(0) ? "positive" : (line.amount.lessThan(0) ? "negative" : ""))}>
                    {formatNumberWithPrefs(line.amount, this.props.preferences)}
                </td>
                <td className={"number-total"} style={{ fontWeight: "normal" }}>
                    {formatNumberWithPrefs(line.balance, this.props.preferences)}
                </td>
                <td>
                    {line.offsetAccount !== null && <AccountTooltip account={line.offsetAccount}>#{line.offsetAccount.id} {line.offsetAccount.name}</AccountTooltip>}
                </td>
                <td>{line.category}</td>
                <td>
                    {! this.state.disabled && <>
                        <span className="icon button" onClick={() => this.beginEdit()}>
                            <FontAwesomeIcon icon={solid.faPen} />
                        </span>
                        <span className="icon button" onClick={() => this.setState({ deleting: true })}>
                            <FontAwesomeIcon icon={solid.faTrashCan} />
                        </span>
                    </>}
                    
                    {/* Deletion modal */}
                    {this.state.deleting && <Modal
                        active={true}
                        title={"Delete transaction"}
                        close={() => this.setState({ deleting: false })}
                        footer={<>
                            <button className="button is-danger" onClick={() => this.delete()}>Delete transaction</button>
                            <button className="button" onClick={() => this.setState({ deleting: false })}>Cancel</button>
                        </>}>
                        Are you sure you want to delete transaction "#{line.transaction.id} {line.transaction.description}"?
                    </Modal>}
                </td>
            </tr>;
        }
    }

    private beginEdit() {
        this.setState({
            editingModel: {
                amount: this.props.data.amount,
                dateTime: this.props.data.transaction.dateTime,
                description: this.props.data.transaction.description,
                offsetAccount: this.props.data.offsetAccount,
                category: this.props.data.category,
            }
        });
    }

    private saveChanges() {
        this.setState({ disabled: true, deleting: false });

        const model = this.state.editingModel;
        if (model === null) {
            return;
        }

        let source = this.props.type === "deposit" ? model.offsetAccount?.id ?? -1 : null;
        let destination = this.props.type === "deposit" ? null : model.offsetAccount?.id ?? -1;
        Api.Transaction.update({
            id: this.props.data.transaction.id,
            dateTime: model.dateTime,
            description: model.description,
            sourceId: source,
            destinationId: destination,
            category: model.category
        }).then(result => {
            this.setState({ disabled: false, editingModel: null });
            this.props.updateItem(result);
        })
    }

    private delete() {
        this.setState({ disabled: true, deleting: false });

        Api.Transaction.delete(this.props.data.transaction.id).then(result => {
            this.setState({ disabled: false });
            this.props.updateItem(result);
        })
    }
}