import axios, { AxiosResponse } from "axios";
import * as React from "react";
import { Transaction, TransactionListResponse } from "../../models/transaction";
import CreateTransaction from "./CreateTransaction";
import InputButton from "../form/InputButton";
import Table from "../common/Table";
import { SearchGroup, SearchGroupType, SearchOperator, SearchRequest, SearchResponse } from "../../models/search";
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
import { Link } from "react-router-dom";
import { routes } from "../../lib/routes";
import AccountLink from "../account/AccountLink";
import TransactionLink from "./TransactionLink";

interface Props {
    draw?: number;
    accountId: number;
    preferences: Preferences | "fetching";
    period: Period;
    decrementPeriod?: () => Promise<void>;
    incrementPeriod?: () => Promise<void>;
}

interface State {
    total: Decimal | null;
    descending: boolean;
    draw: number;
    page: number;
}

interface TableLine {
    balance: Decimal;
    amount: Decimal;
    offsetAccount: Account;
    transaction: Transaction;
    category: string;
}

const pageSize = 20;

export default function AccountTransactionList(props: Props) {
    const [total, setTotal] = React.useState<Decimal | null>(null);
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
        headings={<tr>
            <th></th>
            <th>Date</th>
            <th>Description</th>
            <th className="has-text-right">Amount</th>
            <th className="has-text-right">Balance</th>
            <th>Destination</th>
            <th>Category</th>
            <th>Actions</th>
        </tr>}
        decrement={() => decrementPeriod()}
        increment={() => incrementPeriod()}
        pageSize={pageSize}
        draw={(props.draw ?? 0) + draw}
        type="async-increment"
        fetchItems={fetchItems}
        page={page}
        goToPage={page => goToPage(page)}
        reversePagination={true}
        renderItem={line =>
            <AccountTransactionListItem preferences={props.preferences}
                data={line}
                key={line.transaction.id}
                type={line.transaction.source?.id === props.accountId ? "withdrawal" : "deposit"}
                updateItem={() => setDraw(draw => draw + 1) } />
        }
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

                setTotal(result.total);
                resolve({
                    items: transactions.map((t, i) => ({ 
                        balance: balances[i],
                        transaction: t,
                        offsetAccount: t.destination?.id === props.accountId ? t.source : t.destination,
                        amount: t.destination?.id === props.accountId ? t.total : t.total.neg(),
                        category: t.category
                    })),
                    draw: draw,
                    offset: from,
                    totalItems: result.totalItems
                });
            })
        });
    }
}

interface IAccountTransactionListItemProps {
    data: TableLine;
    preferences: Preferences | "fetching";
    updateItem: (item: Transaction) => void;
    type: "deposit" | "withdrawal";
}
interface TransactionEditingModel {
    amount: Decimal;
    description: string;
    dateTime: DateTime;
    offsetAccount: Account;
    category: string;
};

function AccountTransactionListItem(props: IAccountTransactionListItemProps) {
    const [disabled, setDisabled] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);
    const [model, setModel] = React.useState<TransactionEditingModel | null>(null);
    const line = props.data;

    if (model !== null) {
        return <tr key={line.transaction.id} className="editing">
            <td><TransactionLink transaction={line.transaction} /></td>
            <td>
                <InputDate value={model.dateTime}
                    onChange={e => setModel({ ...model, dateTime: e })}
                    disabled={disabled} /></td>
            <td>
                <InputText value={model.description}
                    onChange={(e) => setModel({ ...model, description: e.target.value })}
                    disabled={disabled} /></td>
            <td className={"number-total " + (line.amount.greaterThan(0) ? "positive" : (line.amount.lessThan(0) ? "negative" : ""))}>{formatNumberWithPrefs(line.amount, props.preferences)}</td>
            <td className={"number-total"} style={{ fontWeight: "normal" }}>{formatNumberWithPrefs(line.balance, props.preferences)}</td>
            <td>
                <InputAccount 
                    value={model.offsetAccount?.id ?? null}
                    disabled={disabled}
                    allowNull={true}
                    onChange={account => setModel({ ...model, offsetAccount: account })} />
            </td>
            <td>
                <InputCategory
                    value={model.category}
                    disabled={disabled}
                    onChange={category => setModel({ ...model, category: category })} />
            </td>
            <td>
                {! disabled && <>
                    <span className="icon button" onClick={() => saveChanges()}>
                        <FontAwesomeIcon icon={solid.faCheck} />
                    </span>
                    <span className="icon button" onClick={() => setModel(null)}>
                        <FontAwesomeIcon icon={solid.faXmark} />
                    </span>
                </>}
            </td>
        </tr>;
    } else {
        return <tr key={line.transaction.id}>
            <td><TransactionLink transaction={line.transaction} /></td>
            <td>{line.transaction.dateTime.toString()}</td>
            <td>{line.transaction.description}</td>
            <td className={"number-total " + (line.amount.greaterThan(0) ? "positive" : (line.amount.lessThan(0) ? "negative" : ""))}>
                {formatNumberWithPrefs(line.amount, props.preferences)}
            </td>
            <td className={"number-total"} style={{ fontWeight: "normal" }}>
                {formatNumberWithPrefs(line.balance, props.preferences)}
            </td>
            <td>
                {line.offsetAccount !== null && <AccountLink account={line.offsetAccount} />}
            </td>
            <td>{line.category}</td>
            <td>
                {! disabled && <>
                    <span className="icon button" onClick={() => beginEdit()}>
                        <FontAwesomeIcon icon={solid.faPen} />
                    </span>
                    <span className="icon button" onClick={() => setDeleting(true)}>
                        <FontAwesomeIcon icon={solid.faTrashCan} />
                    </span>
                </>}
                
                {/* Deletion modal */}
                {deleting && <Modal
                    active={true}
                    title={"Delete transaction"}
                    close={() => setDeleting(false)}
                    footer={<>
                        <button className="button is-danger" onClick={() => deleteTransaction()}>Delete transaction</button>
                        <button className="button" onClick={() => setDeleting(false)}>Cancel</button>
                    </>}>
                    Are you sure you want to delete transaction "#{line.transaction.id} {line.transaction.description}"?
                </Modal>}
            </td>
        </tr>;
    }

    function beginEdit() {
        setModel({
            amount: props.data.amount,
            dateTime: props.data.transaction.dateTime,
            description: props.data.transaction.description,
            offsetAccount: props.data.offsetAccount,
            category: props.data.category,
        });
    }

    function saveChanges() {
        setDisabled(true);
        setDeleting(false);

        if (model === null) {
            return;
        }

        let source = props.type === "deposit" ? model.offsetAccount?.id ?? -1 : null;
        let destination = props.type === "deposit" ? null : model.offsetAccount?.id ?? -1;
        Api.Transaction.update({
            id: props.data.transaction.id,
            dateTime: model.dateTime,
            description: model.description,
            sourceId: source,
            destinationId: destination,
            category: model.category
        }).then(result => {
            setDisabled(false);
            setModel(null);
            props.updateItem(result);
        });
    }

    function deleteTransaction() {
        setDisabled(true);
        setDeleting(false);

        Api.Transaction.delete(props.data.transaction.id).then(result => {
            setDisabled(false);
            props.updateItem(result);
        })
    }
}