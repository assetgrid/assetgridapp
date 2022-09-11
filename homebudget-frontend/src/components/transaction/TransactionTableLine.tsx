import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Decimal from "decimal.js";
import { DateTime } from "luxon";
import React = require("react");
import { formatNumberWithPrefs } from "../../lib/Utils";
import { Account } from "../../models/account";
import { Preferences } from "../../models/preferences";
import { Transaction } from "../../models/transaction";
import InputAccount from "../form/account/InputAccount";
import InputCategory from "../form/InputCategory";
import InputDate from "../form/InputDate";
import InputText from "../form/InputText";
import TransactionLink from "./TransactionLink";
import * as regular from "@fortawesome/free-regular-svg-icons"
import * as solid from "@fortawesome/free-solid-svg-icons"
import Modal from "../common/Modal";
import { Api } from "../../lib/ApiClient";
import AccountLink from "../account/AccountLink";

type Props  = {
    transaction: Transaction;
    preferences: Preferences | "fetching";
    updateItem: (item: Transaction) => void;
    accountId?: number;
    balance?: Decimal;
}

interface TransactionEditingModel {
    total: Decimal;
    description: string;
    dateTime: DateTime;
    source: Account | null;
    destination: Account | null;
    category: string;
};

export default function TransactionTableLine(props: Props) {
    const [disabled, setDisabled] = React.useState(false);
    const [deleting, setDeleting] = React.useState(false);
    const [model, setModel] = React.useState<TransactionEditingModel | null>(null);

    const offsetAccount = props.accountId !== undefined ? props.transaction.destination?.id === props.accountId ? props.transaction.source : props.transaction.destination : null ;
    const total = props.accountId === undefined || props.transaction.destination?.id === props.accountId ? props.transaction.total : props.transaction.total.neg();
    const totalClass = (total.greaterThan(0) && props.accountId !== undefined ? "positive" : (total.lessThan(0) && props.accountId !== undefined ? "negative" : ""));

    if (model !== null) {
        return <tr key={props.transaction.id} className="editing">
            <td><TransactionLink transaction={props.transaction} /></td>
            <td>
                <InputDate value={model.dateTime}
                    onChange={e => setModel({ ...model, dateTime: e })}
                    disabled={disabled} /></td>
            <td>
                <InputText value={model.description}
                    onChange={(e) => setModel({ ...model, description: e.target.value })}
                    disabled={disabled} /></td>
            <td className={"number-total " + totalClass}>
                {formatNumberWithPrefs(total, props.preferences)}
            </td>
            {props.balance && <td className={"number-total"} style={{ fontWeight: "normal" }}>{formatNumberWithPrefs(props.balance, props.preferences)}</td>}
            {(props.accountId === undefined || props.accountId !== props.transaction.source?.id) && <td>
                <InputAccount
                    value={model.source?.id ?? null}
                    disabled={disabled}
                    allowNull={true}
                    onChange={account => setModel({ ...model, source: account })} />
            </td>}
            {(props.accountId === undefined || props.accountId !== props.transaction.destination?.id) && <td>
                <InputAccount
                    value={model.destination?.id ?? null}
                    disabled={disabled}
                    allowNull={true}
                    onChange={account => setModel({ ...model, destination: account })} />
            </td>}
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
        return <tr key={props.transaction.id}>
            <td><TransactionLink transaction={props.transaction} /></td>
            <td>{props.transaction.dateTime.toString()}</td>
            <td>{props.transaction.description}</td>
            <td className={"number-total " + totalClass}>
                {formatNumberWithPrefs(total, props.preferences)}
            </td>
            {props.balance && <td className={"number-total"} style={{ fontWeight: "normal" }}>
                {formatNumberWithPrefs(props.balance, props.preferences)}
            </td>}
            <td>
                {props.accountId !== undefined
                    ? offsetAccount !== null && <AccountLink account={offsetAccount} />
                    : props.transaction.source !== null && <AccountLink account={props.transaction.source} />}
            </td>
            { props.accountId === undefined && <td>
                {props.transaction.destination !== null && <AccountLink account={props.transaction.destination} />}
            </td>}
            <td>{props.transaction.category}</td>
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
                    Are you sure you want to delete transaction "#{props.transaction.id} {props.transaction.description}"?
                </Modal>}
            </td>
        </tr>;
    }

    function beginEdit() {
        console.log(props);
        setModel({
            total: props.transaction.total,
            dateTime: props.transaction.dateTime,
            description: props.transaction.description,
            source: props.transaction.source,
            destination: props.transaction.destination,
            category: props.transaction.category,
        });
    }

    function saveChanges() {
        setDisabled(true);
        setDeleting(false);

        if (model === null) {
            return;
        }

        Api.Transaction.update({
            id: props.transaction.id,
            dateTime: model.dateTime,
            description: model.description,
            sourceId: model.source?.id ?? -1,
            destinationId: model.destination?.id ?? -1,
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

        Api.Transaction.delete(props.transaction.id).then(result => {
            setDisabled(false);
            props.updateItem(result);
        })
    }
}