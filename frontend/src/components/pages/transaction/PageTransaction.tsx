import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "../../../lib/ApiClient";
import { forget, formatDateTimeWithUser, formatNumberWithUser } from "../../../lib/Utils";
import { Transaction, TransactionLine } from "../../../models/transaction";
import AccountLink from "../../account/AccountLink";
import { userContext } from "../../App";
import Card from "../../common/Card";
import InputIconButton from "../../input/InputIconButton";
import * as solid from "@fortawesome/free-solid-svg-icons";
import * as regular from "@fortawesome/free-regular-svg-icons";
import { routes } from "../../../lib/routes";
import DeleteTransactionModal from "../../transaction/input/DeleteTransactionModal";
import InputText from "../../input/InputText";
import InputDateTime from "../../input/InputDateTime";
import InputNumber from "../../input/InputNumber";
import InputAccount from "../../account/input/InputAccount";
import InputCategory from "../../input/InputCategory";
import InputButton from "../../input/InputButton";
import Decimal from "decimal.js";
import Page404 from "../Page404";
import PageError from "../PageError";
import Hero from "../../common/Hero";
import InputTextMultiple from "../../input/InputTextMultiple";

export default function PageTransaction (): React.ReactElement {
    const id = Number(useParams().id);
    const [transaction, setTransaction] = React.useState<Transaction | "fetching" | null | "error">("fetching");
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [editModel, setEditModel] = React.useState<Transaction | null>(null);
    const [isUpdating, setIsUpdating] = React.useState(false);
    const [errors, setErors] = React.useState<{ [key: string]: string[] }>({});
    const navigate = useNavigate();
    const api = useApi();

    React.useEffect(forget(fetchTransaction), [id, api]);

    if (transaction === null) {
        return <Page404 />;
    }
    if (transaction === "error") {
        return <PageError />;
    }

    return <>
        <Hero title={<>Transaction #{id}</>} subtitle={transaction !== "fetching" ? transaction.description : <>&hellip;</>} />
        <div className="p-3">
            <div className="columns">
                <div className="column p-0 is-narrow is-flex">
                    <TransactionDetailsCard
                        transaction={transaction}
                        isUpdating={isUpdating}
                        editModel={editModel}
                        onChange={transaction => setEditModel(transaction)}
                        onDelete={() => setIsDeleting(true)}
                        onSaveChanges={forget(update)}
                        errors={errors} />
                </div>
                <div className="column p-0 is-narrow is-flex">
                    {transactionLines(transaction,
                        isUpdating,
                        transaction => setEditModel(transaction),
                        editModel,
                        () => setIsDeleting(true),
                        forget(update)
                    )}
                </div>
            </div>
        </div>

        {/* Deletion modal */}
        {isDeleting && transaction !== "fetching" && <DeleteTransactionModal
            close={() => setIsDeleting(false)}
            deleted={() => navigate(routes.transactions())}
            transaction={transaction} />}
    </>;

    async function fetchTransaction (): Promise<void> {
        setTransaction("fetching");

        if (isNaN(id)) {
            setTransaction("error");
        } else if (api !== null) {
            const result = await api.Transaction.get(id);
            switch (result.status) {
                case 200:
                    setTransaction(result.data);
                    break;
                case 404:
                    setTransaction(null);
                    break;
                default:
                    setTransaction("error");
            }
        }
    }

    async function update (): Promise<void> {
        if (editModel === null || api === null) return;

        setIsUpdating(true);
        setErors({});
        const result = await api.Transaction.update(id, {
            ...editModel,
            sourceId: editModel.source?.id ?? -1,
            destinationId: editModel.destination?.id ?? -1
        });

        if (result.status === 200) {
            setTransaction(result.data);
            setEditModel(null);
        } else if (result.status === 400) {
            setErors(result.errors);
        }
        setIsUpdating(false);
    }
}

interface TransactionDetailsCardProps {
    transaction: Transaction | "fetching"
    isUpdating: boolean
    onChange: (editModel: Transaction | null) => void
    editModel: Transaction | null
    onDelete: () => void
    onSaveChanges: () => void
    errors: { [key: string]: string[] }
}
function TransactionDetailsCard (props: TransactionDetailsCardProps): React.ReactElement {
    const { user } = React.useContext(userContext);
    const transaction = props.transaction;
    const editModel = props.editModel;

    if (transaction === "fetching") {
        return <Card title="Transaction details" isNarrow={false}>
            <table className="table is-fullwidth">
                <tbody>
                    <tr>
                        <td>Id</td>
                        <td>&hellip;</td>
                    </tr>
                    <tr>
                        <td>Unique Identifier</td>
                        <td>&hellip;</td>
                    </tr>
                    <tr>
                        <td>Description</td>
                        <td>&hellip;</td>
                    </tr>
                    <tr>
                        <td>Timestamp</td>
                        <td>&hellip;</td>
                    </tr>
                    <tr>
                        <td>Total</td>
                        <td>&hellip;</td>
                    </tr>
                    <tr>
                        <td>Source</td>
                        <td>&hellip;</td>
                    </tr>
                    <tr>
                        <td>Destination</td>
                        <td>&hellip;</td>
                    </tr>
                    <tr>
                        <td>Category</td>
                        <td>&hellip;</td>
                    </tr>
                </tbody>
            </table>
        </Card>;
    }

    if (editModel === null) {
        return <Card title={<>
            <span style={{ flexGrow: 1 }}>Transaction details</span>
            <InputIconButton icon={solid.faPen} onClick={() => props.onChange(transaction)} />
            <InputIconButton icon={regular.faTrashCan} onClick={() => props.onDelete()} />
        </>} isNarrow={false}>
            <table className="table is-fullwidth">
                <tbody>
                    <tr>
                        <td>Id</td>
                        <td>{transaction.id}</td>
                    </tr>
                    <tr>
                        <td>Unique Identifiers</td>
                        <td>{transaction.identifiers.length === 0 ? "None" : transaction.identifiers.join(", ")}</td>
                    </tr>
                    <tr>
                        <td>Description</td>
                        <td style={{ maxWidth: "300px" }}>{transaction.description}</td>
                    </tr>
                    <tr>
                        <td>Timestamp</td>
                        <td>{formatDateTimeWithUser(transaction.dateTime, user)}</td>
                    </tr>
                    <tr>
                        <td>Total</td>
                        <td>{formatNumberWithUser(transaction.total, user)}</td>
                    </tr>
                    <tr>
                        <td>Source</td>
                        <td>
                            {transaction.source === null ? "None" : <AccountLink account={transaction.source} />}
                        </td>
                    </tr>
                    <tr>
                        <td>Destination</td>
                        <td>
                            {transaction.destination === null ? "None" : <AccountLink account={transaction.destination} />}
                        </td>
                    </tr>
                    <tr>
                        <td>Category</td>
                        <td>
                            {transaction.category}
                        </td>
                    </tr>
                </tbody>
            </table>
        </Card>;
    } else {
        return <Card title="Transaction details" isNarrow={false}>
            <table className="table is-fullwidth">
                <tbody>
                    <tr>
                        <td>Id</td>
                        <td>{transaction.id}</td>
                    </tr>
                    <tr>
                        <td>Unique identifier</td>
                        <td>
                            <InputTextMultiple
                                value={editModel.identifiers}
                                onChange={value => props.onChange({ ...editModel, identifiers: value })}
                                disabled={props.isUpdating}
                                errors={props.errors.Identifiers} />
                        </td>
                    </tr>
                    <tr>
                        <td>Description</td>
                        <td>
                            <InputText
                                value={editModel.description}
                                onChange={e => props.onChange({ ...editModel, description: e.target.value })}
                                disabled={props.isUpdating}
                                errors={props.errors.Description} />
                        </td>
                    </tr>
                    <tr>
                        <td>Timestamp</td>
                        <td>
                            <InputDateTime
                                value={editModel.dateTime}
                                fullwidth={true}
                                onChange={value => props.onChange({ ...editModel, dateTime: value })}
                                disabled={props.isUpdating}
                                errors={props.errors.DateTime} />
                        </td>
                    </tr>
                    <tr>
                        <td>Total</td>
                        {editModel.lines.length === 0
                            ? <td><InputNumber
                                value={editModel.total}
                                onChange={value => props.onChange({ ...editModel, total: value })}
                                allowNull={false}
                                disabled={props.isUpdating}
                                errors={props.errors.DateTime} />
                            </td>
                            : <td>{formatNumberWithUser(editModel.total, user)}</td>}
                    </tr>
                    <tr>
                        <td>Source</td>
                        <td>
                            <InputAccount
                                value={editModel.source}
                                onChange={value => props.onChange({ ...editModel, source: value })}
                                allowNull={true}
                                allowCreateNewAccount={true}
                                disabled={props.isUpdating}
                                errors={props.errors.SourceAccountId} />
                        </td>
                    </tr>
                    <tr>
                        <td>Destination</td>
                        <td>
                            <InputAccount
                                value={editModel.destination}
                                onChange={value => props.onChange({ ...editModel, destination: value })}
                                allowNull={true}
                                allowCreateNewAccount={true}
                                disabled={props.isUpdating}
                                errors={props.errors.DestinationAccountId} />
                        </td>
                    </tr>
                    <tr>
                        <td>Category</td>
                        <td>
                            <InputCategory
                                value={editModel.category}
                                onChange={value => props.onChange({ ...editModel, category: value })}
                                disabled={props.isUpdating}
                                errors={props.errors.Category} />
                        </td>
                    </tr>
                </tbody>
            </table>
            <div className="buttons">
                <InputButton disabled={props.isUpdating} className="is-primary" onClick={props.onSaveChanges}>Save changes</InputButton>
                <InputButton onClick={() => props.onChange(null)}>Cancel</InputButton>
            </div>
        </Card>;
    }
}

function transactionLines (
    transaction: Transaction | "fetching",
    isUpdating: boolean,
    onChange: (transaction: Transaction) => void,
    editModel: Transaction | null,
    beginDelete: () => void,
    saveChanges: () => void
): React.ReactElement {
    const { user } = React.useContext(userContext);

    if (transaction === "fetching") {
        return <Card title="Transaction lines" isNarrow={false}>
            Please wait&hellip;
        </Card>;
    }

    if (editModel === null) {
        /*
         * Not currently editing
         */
        if (transaction.lines.length === 0) {
            return <Card title={<>
                <span style={{ flexGrow: 1 }}>Transaction lines</span>
                <InputIconButton icon={solid.faPen} onClick={() => onChange(transaction)} />
            </>} isNarrow={false}>
                This transaction does not have any lines.
            </Card>;
        } else {
            return <Card title={<>
                <span style={{ flexGrow: 1 }}>Transaction lines</span>
                <InputIconButton icon={solid.faPen} onClick={() => onChange(transaction)} />
            </>} isNarrow={false}>
                <table className="table is-fullwidth">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th className="has-text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transaction.lines.map((line, i) => <tr key={i}>
                            <td>{ line.description }</td>
                            <td className="has-text-right">{formatNumberWithUser(line.amount, user)}</td>
                        </tr>)}
                    </tbody>
                </table>
            </Card>;
        }
    } else {
        /*
         * Currently editing
         */
        if (editModel.lines.length === 0) {
            return <Card title="Transaction lines" isNarrow={false}>
                <p>This transaction does not have any lines.</p>
                <p>Split the transaction to add lines.</p>
                <div className="buttons mt-3">
                    <InputButton disabled={isUpdating}
                        onClick={() => onChange({ ...editModel, lines: [{ description: "Transaction line", amount: editModel.total }] })}>
                        Split Transaction
                    </InputButton>
                </div>
            </Card>;
        } else {
            return <Card title="Transaction lines" isNarrow={false}>
                <table className="table is-fullwidth">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th className="has-text-right">Amount</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {editModel.lines.map((line, i) => <tr key={i}>
                            <td>
                                <InputText value={line.description}
                                    onChange={e => updateLine({ ...line, description: e.target.value }, i)}
                                    disabled={isUpdating}
                                />
                            </td>
                            <td className="has-text-right">{
                                <InputNumber value={line.amount}
                                    onChange={value => updateLine({ ...line, amount: value }, i)}
                                    allowNull={false}
                                    disabled={isUpdating}
                                />
                            }</td>
                            <td style={{ verticalAlign: "middle" }}>
                                <InputIconButton icon={regular.faTrashCan} onClick={() => deleteLine(i)} />
                            </td>
                        </tr>)}
                    </tbody>
                </table>
                <div className="buttons">
                    <InputButton disabled={isUpdating}
                        onClick={() => onChange({
                            ...editModel,
                            lines: [...editModel.lines, { description: "Transaction line", amount: new Decimal(0) }]
                        })}>
                        Add line
                    </InputButton>
                </div>
            </Card>;
        }
    }

    function updateLine (newLine: TransactionLine, index: number): void {
        if (editModel === null) return;

        const lines = [
            ...editModel.lines.slice(0, index),
            newLine,
            ...editModel.lines.slice(index + 1)
        ];
        onChange({
            ...editModel,
            total: lines.reduce((sum, line) => sum.add(line.amount), new Decimal(0)),
            lines
        });
    }

    function deleteLine (index: number): void {
        if (editModel === null) return;

        const newLines = [...editModel.lines.slice(0, index), ...editModel.lines.slice(index + 1)];
        const total = newLines.length > 0 ? newLines.reduce((sum, line) => sum.add(line.amount), new Decimal(0)) : editModel.lines[index].amount;
        onChange({
            ...editModel,
            total,
            lines: newLines
        });
    }
}
