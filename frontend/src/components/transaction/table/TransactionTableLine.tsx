import Decimal from "decimal.js";
import { DateTime } from "luxon";
import * as React from "react";
import { forget, formatDateTimeWithUser, formatNumberWithUser } from "../../../lib/Utils";
import { Account } from "../../../models/account";
import { Transaction, TransactionLine } from "../../../models/transaction";
import InputAccount from "../../account/input/InputAccount";
import InputCategory from "../../input/InputCategory";
import InputDateTime from "../../input/InputDateTime";
import InputText from "../../input/InputText";
import TransactionLink from "./../TransactionLink";
import * as regular from "@fortawesome/free-regular-svg-icons";
import * as solid from "@fortawesome/free-solid-svg-icons";
import { useApi } from "../../../lib/ApiClient";
import AccountLink from "../../account/AccountLink";
import InputButton from "../../input/InputButton";
import InputNumber from "../../input/InputNumber";
import Tooltip from "../../common/Tooltip";
import InputIconButton from "../../input/InputIconButton";
import DeleteTransactionModal from "./../input/DeleteTransactionModal";
import InputCheckbox from "../../input/InputCheckbox";
import TransactionCategory from "./TransactionCategory";
import { useTranslation } from "react-i18next";
import { useUser } from "../../App";

interface Props {
    transaction: Transaction
    updateItem: (id: number, item: Transaction | null) => void
    accountId?: number
    balance?: Decimal
    allowSelection?: boolean
    allowEditing?: boolean
    allowLinks?: boolean
    selected?: boolean
    toggleSelected?: (transaction: Transaction) => void
}

interface TransactionEditingModel {
    total: Decimal
    description: string
    dateTime: DateTime
    source: Account | null
    destination: Account | null
    lines: TransactionLine[]
    isSplit: boolean
};

export default function TransactionTableLine (props: Props): React.ReactElement {
    const [disabled, setDisabled] = React.useState(false);
    const [state, setState] = React.useState<null | "editing" | "confirm-delete">(null);

    switch (state) {
        case "editing":
            return <TransactionEditor disabled={disabled} setDisabled={setDisabled} stopEditing={() => setState(null)} {...props} />;
        default:
            return <TableTransaction setState={setState} isConfirmingDeletion={state === "confirm-delete"} disabled={disabled} {...props} />;
    }
}

/*
 * Transaction that is not currently being edited
 */
type TableTransactionProps = Props & {
    disabled: boolean
    setState: (state: null | "editing" | "confirm-delete") => void
    isConfirmingDeletion: boolean
};
function TableTransaction (props: TableTransactionProps): React.ReactElement {
    const offsetAccount = props.accountId !== undefined ? props.transaction.destination?.id === props.accountId ? props.transaction.source : props.transaction.destination : null;
    const total = props.accountId === undefined || props.transaction.destination?.id === props.accountId ? props.transaction.total : props.transaction.total.neg();
    const totalClass = (total.greaterThan(0) && props.accountId !== undefined ? "positive" : (total.lessThan(0) && props.accountId !== undefined ? "negative" : ""));
    const [expandSplit, setExpandSplit] = React.useState(false);
    const user = useUser();
    const { t } = useTranslation();

    return <div key={props.transaction.id} className="table-row">
        <div>
            {props.selected !== undefined && props.allowSelection === true && <InputCheckbox onChange={() => props.toggleSelected?.(props.transaction)} value={props.selected} />}
            <TransactionLink transaction={props.transaction} disabled={!(props.allowLinks ?? true)} />
            {props.transaction.isSplit && <Tooltip
                content={expandSplit ? t("transaction.transaction_is_split_click_to_collapse") : t("transaction.transaction_is_split_click_to_expand")}>
                <InputIconButton icon={solid.faEllipsisVertical} onClick={() => setExpandSplit(expand => !expand)} />
            </Tooltip>}
        </div>
        <div>{formatDateTimeWithUser(props.transaction.dateTime, user)}</div>
        <div>{props.transaction.description.length < 50
            ? props.transaction.description
            : <Tooltip content={props.transaction.description}>{props.transaction.description.substring(0, 50)}&hellip;</Tooltip>}</div>
        <div className={"number-total " + totalClass}>
            {formatNumberWithUser(total, user)}
        </div>
        {(props.balance != null) && <div className={"number-total"} style={{ fontWeight: "normal" }}>
            {formatNumberWithUser(props.balance, user)}
        </div>}
        <div>
            {props.accountId !== undefined
                ? offsetAccount !== null && <AccountLink account={offsetAccount} disabled={!(props.allowLinks ?? true)} />
                : props.transaction.source !== null && <AccountLink account={props.transaction.source} disabled={!(props.allowLinks ?? true)} />}
        </div>
        {props.accountId === undefined && <div>
            {props.transaction.destination !== null && <AccountLink account={props.transaction.destination} disabled={!(props.allowLinks ?? true)} />}
        </div>}
        <div>
            <TransactionCategory categories={props.transaction.lines.map(line => line.category)} />
        </div>
        {props.allowEditing === true && <div>
            {!props.disabled && <>
                <InputIconButton icon={solid.faPen} onClick={() => props.setState("editing")} />
                <InputIconButton icon={regular.faTrashCan} onClick={() => props.setState("confirm-delete")} />
            </>}

            {/* Deletion modal */}
            {props.isConfirmingDeletion && <DeleteTransactionModal
                close={() => props.setState(null)}
                deleted={() => props.updateItem(props.transaction.id, null)}
                transaction={props.transaction} />}
        </div>}
        {expandSplit && props.transaction.isSplit && <div className="transaction-lines split">
            {props.transaction.lines.map((line, i) => <div key={i} className={"transaction-line" + (i === props.transaction.lines.length - 1 ? " last" : "")}>
                <div style={{ gridColumn: "colstart/innerstart" }}></div>
                <div className="description">
                    {line.description}
                </div>
                <div className="total">
                    {formatNumberWithUser(line.amount, user)}
                </div>
                <div></div>
                <div></div>
                <div className="category">
                    {line.category}
                </div>
                <div style={{ gridColumn: "innerend/colend" }}></div>
            </div>)}
        </div>}
    </div>;
}

/*
 * Inline transaction editor for transaction tables
 */
type TransactionEditorProps = Props & {
    disabled: boolean
    setDisabled: (disabled: boolean) => void
    stopEditing: () => void
};

function TransactionEditor (props: TransactionEditorProps): React.ReactElement {
    const defaultModel = {
        total: props.transaction.total,
        dateTime: props.transaction.dateTime,
        description: props.transaction.description,
        source: props.transaction.source,
        destination: props.transaction.destination,
        lines: props.transaction.lines,
        isSplit: props.transaction.isSplit
    };
    const [model, setModel] = React.useState<TransactionEditingModel>(defaultModel);
    const [errors, setErrors] = React.useState<{ [key: string]: string[] }>({});
    const user = useUser();
    const api = useApi();
    const { t } = useTranslation();

    const total = props.accountId === undefined || props.transaction.destination?.id === props.accountId ? props.transaction.total : props.transaction.total.neg();
    const totalClass = (total.greaterThan(0) && props.accountId !== undefined ? "positive" : (total.lessThan(0) && props.accountId !== undefined ? "negative" : ""));
    // If the current account is the source, all amounts should be negative
    const amountMultiplier = props.accountId !== undefined && props.accountId === props.transaction.source?.id ? new Decimal(-1) : new Decimal(1);

    return <div key={props.transaction.id} className="table-row editing">
        <div>
            {props.selected !== undefined && props.allowSelection === true &&
                <InputCheckbox onChange={() => props.toggleSelected?.(props.transaction)} value={props.selected} />}
            <TransactionLink transaction={props.transaction} />
        </div>
        <div>
            <InputDateTime value={model.dateTime}
                fullwidth={true}
                onChange={e => setModel({ ...model, dateTime: e })}
                disabled={props.disabled}
                errors={errors.DateTime} /></div>
        <div>
            <InputText value={model.description}
                onChange={(e) => setModel({ ...model, description: e.target.value })}
                disabled={props.disabled}
                errors={errors.Description} /></div>
        {!model.isSplit
            ? <div>
                <InputNumber allowNull={false}
                    value={model.total.times(amountMultiplier)}
                    onChange={newTotal => setModel({
                        ...model,
                        total: newTotal.times(amountMultiplier),
                        lines: [{ ...model.lines[0], amount: newTotal.times(amountMultiplier) }]
                    })}
                    errors={errors.Total} />
            </div>
            : < div className={"number-total " + totalClass}>
                {/* If the transaction is split, the total is the sum of the lines */}
                {formatNumberWithUser(model.total.times(amountMultiplier), user)}
            </div>
        }
        {(props.balance != null) && <div className={"number-total"} style={{ fontWeight: "normal" }}>{formatNumberWithUser(props.balance, user)}</div>}
        {(props.accountId === undefined || props.accountId !== props.transaction.source?.id) && <div>
            <InputAccount
                value={model.source}
                disabled={props.disabled}
                allowNull={true}
                onChange={account => setModel({ ...model, source: account })}
                allowCreateNewAccount={true}
                errors={errors.SourceId} />
        </div>}
        {(props.accountId === undefined || props.accountId !== props.transaction.destination?.id) && <div>
            <InputAccount
                value={model.destination}
                disabled={props.disabled}
                allowNull={true}
                onChange={account => setModel({ ...model, destination: account })}
                allowCreateNewAccount={true}
                errors={errors.DestinationId} />
        </div>}
        <div>
            {model.isSplit
                ? <TransactionCategory categories={model.lines.map(line => line.category)} />
                : <InputCategory
                    value={model.lines[0].category}
                    disabled={props.disabled}
                    onChange={category => updateLine({ ...model.lines[0], category }, 0)}
                    errors={errors["Lines[0].Category"]} />}
        </div>
        <div>
            {!props.disabled && api !== null && <>
                <InputIconButton icon={solid.faSave} onClick={forget(saveChanges)} />
                <InputIconButton icon={solid.faXmark} onClick={props.stopEditing} />
            </>}
        </div>
        {model.isSplit
            ? < div className="transaction-lines split">
                {model.lines.map((line, i) => <TransactionLineEditor key={i}
                    index={i}
                    line={line}
                    update={changes => updateLine(changes, i)}
                    delete={() => deleteLine(i)}
                    disabled={props.disabled}
                    inverse={amountMultiplier.toNumber() === -1}
                    errors={errors}
                    last={i === model.lines.length} />)}
                <div style={{ gridColumn: "colstart / innerstart" }}></div>
                <div className="btn-add-line">
                    <InputButton className="is-small"
                        onClick={() => setModel({
                            ...model,
                            lines: [...model.lines, { amount: new Decimal(0), description: t("transaction.transaction_line"), category: "" }]
                        })}>Add line</InputButton>
                </div>
                <div style={{ gridColumn: " innerend / colend" }}></div>
            </div>
            : < div className="transaction-lines non-split">
                <InputButton className="is-small"
                    onClick={splitTransaction}>{t("transaction.action_split_transaction")}</InputButton>
            </div>}
    </div>;

    async function saveChanges (): Promise<void> {
        if (model === null || api === null) return;

        props.setDisabled(true);
        setErrors({});

        const result = await api.Transaction.update(props.transaction.id, {
            dateTime: model.dateTime,
            description: model.description,
            sourceId: model.source?.id ?? null,
            destinationId: model.destination?.id ?? null,
            total: model.total,
            lines: model.lines,
            isSplit: model.isSplit,
            identifiers: props.transaction.identifiers,
            metaData: null
        });

        if (result.status === 200) {
            props.updateItem(props.transaction.id, result.data);
            props.stopEditing();
        } else if (result.status === 400) {
            setErrors(result.errors);
        }
        props.setDisabled(false);
    }

    function splitTransaction (): void {
        setModel({
            ...model,
            isSplit: true,
            lines: [{
                ...model.lines[0],
                description: model.lines[0].description.trim() === "" ? t("transaction.transaction_line") : model.description
            }]
        });
    }

    function updateLine (newLine: Partial<TransactionLine>, index: number): void {
        if (model === null || model.lines === null) return;

        const lines = [
            ...model.lines.slice(0, index),
            { ...model.lines[index], ...newLine },
            ...model.lines.slice(index + 1)
        ];
        setModel({
            ...model,
            total: lines.reduce((sum, line) => sum.add(line.amount), new Decimal(0)),
            lines
        });
    }

    function deleteLine (index: number): void {
        if (model === null || model.lines === null) return;

        const newLines = [...model.lines.slice(0, index), ...model.lines.slice(index + 1)];
        const total = newLines.length > 0 ? newLines.reduce((sum, line) => sum.add(line.amount), new Decimal(0)) : model.lines[index].amount;
        setModel({
            ...model,
            total,
            lines: newLines.length > 0 ? newLines : model.lines,
            isSplit: newLines.length > 0
        });
    }
}

/*
 * Inline editor for a transaction line
 */
interface LineEditorProps {
    index: number
    line: TransactionLine
    update: (changes: Partial<TransactionLine>) => void
    delete: () => void
    disabled: boolean
    last: boolean
    inverse: boolean
    errors: { [key: string]: string[] }
}
function TransactionLineEditor (props: LineEditorProps): React.ReactElement {
    const multiplier = props.inverse ? new Decimal(-1) : new Decimal(1);

    return <div className={"transaction-line" + (props.last ? " last" : "")}>
        <div style={{ gridColumn: "colstart/innerstart" }}>
            <InputIconButton icon={solid.faGripLinesVertical} onClick={() => 0} />
        </div>
        <div className="description">
            <InputText disabled={props.disabled}
                isSmall={true}
                value={props.line.description}
                onChange={e => props.update({ description: e.target.value })}
                errors={props.errors[`Lines[${props.index}].Description`]} />
        </div>
        <div className="total">
            <InputNumber
                disabled={props.disabled}
                allowNull={false}
                isSmall={true}
                value={props.line.amount.times(multiplier)}
                onChange={value => props.update({ amount: value.times(multiplier) })}
                errors={props.errors[`Lines[${props.index}].Total`]} />
        </div>
        <div></div>
        <div></div>
        <div className="category">
            <InputCategory
                isSmall={true}
                value={props.line.category}
                disabled={props.disabled}
                onChange={category => props.update({ category })}
                errors={props.errors[`Lines[${props.index}].Category`]} />
        </div>
        <div style={{ gridColumn: "innerend/colend" }}>
            <InputIconButton icon={regular.faTrashCan} onClick={props.delete} />
        </div>
    </div>;
}
