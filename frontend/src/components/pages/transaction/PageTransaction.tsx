import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "../../../lib/ApiClient";
import { forget, formatDateTimeWithUser, formatNumberWithUser } from "../../../lib/Utils";
import { Transaction, TransactionLine } from "../../../models/transaction";
import AccountLink from "../../account/AccountLink";
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
import TransactionCategory from "../../transaction/table/TransactionCategory";
import TransactionMetaInput, { MetaFieldType } from "../../transaction/input/TransactionMetaInput";
import TransactionMetaValue from "../../transaction/input/TransactionMetaValue";
import { useTranslation } from "react-i18next";
import { t } from "i18next";
import { MetaFieldValue } from "../../../models/meta";
import { useUser } from "../../App";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function PageTransaction (): React.ReactElement {
    const id = Number(useParams().id);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [editModel, setEditModel] = React.useState<Transaction | null>(null);
    const [isUpdating, setIsUpdating] = React.useState(false);
    const [errors, setErors] = React.useState<{ [key: string]: string[] }>({});
    const navigate = useNavigate();
    const api = useApi();
    const queryClient = useQueryClient();
    const { data: transaction, isError } = useQuery({ queryKey: ["transaction", id], queryFn: async () => await api.Transaction.get(id) });
    const { t } = useTranslation();

    if (transaction === null) {
        return <Page404 />;
    }
    if (isError) {
        return <PageError />;
    }

    return <>
        <Hero title={t("transaction.transaction_with_id", { id })} subtitle={transaction !== undefined ? transaction.description : <>&hellip;</>} />
        <div className="p-3">
            <div className="columns m-0">
                <div className="column p-0 is-half is-flex">
                    <TransactionDetailsCard
                        transaction={transaction}
                        isUpdating={isUpdating}
                        editModel={editModel}
                        onChange={transaction => setEditModel(transaction)}
                        onDelete={() => setIsDeleting(true)}
                        onSaveChanges={forget(update)}
                        errors={errors} />
                </div>
                <div className="column p-0 is-half is-flex">
                    <TransactionMetaCard
                        editModel={editModel}
                        errors={errors}
                        isUpdating={isUpdating}
                        onChange={transaction => setEditModel(transaction)}
                        transaction={transaction} />
                </div>
            </div>
            <TransactionLinesCard transaction={transaction}
                isUpdating={isUpdating}
                onChange={transaction => setEditModel(transaction)}
                editModel={editModel}
                errors={errors} />
        </div>

        {/* Deletion modal */}
        {isDeleting && transaction !== undefined && <DeleteTransactionModal
            close={() => setIsDeleting(false)}
            deleted={() => navigate(routes.transactions())}
            transaction={transaction} />}
    </>;

    async function update (): Promise<void> {
        if (editModel === null || api === null) return;

        setIsUpdating(true);
        setErors({});
        const result = await api.Transaction.update(id, {
            ...editModel,
            sourceId: editModel.source?.id ?? null,
            destinationId: editModel.destination?.id ?? null
        });

        if (result.status === 200) {
            const newTransaction = result.data;

            // Loop through meta fields
            for (let i = 0; i < editModel.metaData.length; i++) {
                const metaField = editModel.metaData[i];
                if (typeof metaField.value !== "object" || metaField.value === null || !("file" in metaField.value) || metaField.value.file === undefined) {
                    continue;
                }

                // An attachment was uploaded
                const file = metaField.value.file;
                const uploadResult = await api.Meta.uploadAttachment(metaField.metaId, "transaction", id, file);
                if (uploadResult.status === 200) {
                    const newMeta = newTransaction.metaData.find(x => x.metaId === metaField.metaId);
                    if (newMeta !== undefined) {
                        newMeta.value = uploadResult.data;
                    }
                }
            }

            await queryClient.invalidateQueries(["transaction", "list"]);
            await queryClient.setQueryData(["transaction", result.data.id], result.data);

            setEditModel(null);
        } else if (result.status === 400) {
            setErors(result.errors);
        }
        setIsUpdating(false);
    }
}

interface TransactionDetailsCardProps {
    transaction?: Transaction
    isUpdating: boolean
    onChange: (editModel: Transaction | null) => void
    editModel: Transaction | null
    onDelete: () => void
    onSaveChanges: () => void
    errors: { [key: string]: string[] }
}
function TransactionDetailsCard (props: TransactionDetailsCardProps): React.ReactElement {
    const user = useUser();
    const transaction = props.transaction;
    const editModel = props.editModel;
    const { t } = useTranslation();

    if (transaction === undefined) {
        return <Card title={t("transaction.transaction_details")!} isNarrow={true}>
            <table className="table is-fullwidth">
                <tbody>
                    <tr>
                        <td>{t("common.id")}</td>
                        <td>&hellip;</td>
                    </tr>
                    <tr>
                        <td>{t("common.unique_identifier")}</td>
                        <td>&hellip;</td>
                    </tr>
                    <tr>
                        <td>{t("common.description")}</td>
                        <td>&hellip;</td>
                    </tr>
                    <tr>
                        <td>{t("common.timestamp")}</td>
                        <td>&hellip;</td>
                    </tr>
                    <tr>
                        <td>{t("account.total")}</td>
                        <td>&hellip;</td>
                    </tr>
                    <tr>
                        <td>{t("transaction.source")}</td>
                        <td>&hellip;</td>
                    </tr>
                    <tr>
                        <td>{t("transaction.destination")}</td>
                        <td>&hellip;</td>
                    </tr>
                    <tr>
                        <td>{t("common.category")}</td>
                        <td>&hellip;</td>
                    </tr>
                </tbody>
            </table>
        </Card>;
    }

    if (editModel === null) {
        return <Card title={<>
            <span style={{ flexGrow: 1 }}>{t("transaction.transaction_details")}</span>
            <InputIconButton icon={solid.faPen} onClick={() => props.onChange(transaction)} />
            <InputIconButton icon={regular.faTrashCan} onClick={() => props.onDelete()} />
        </>} isNarrow={true}>
            <table className="table is-fullwidth">
                <tbody>
                    <tr>
                        <td>{t("common.id")}</td>
                        <td>{transaction.id}</td>
                    </tr>
                    <tr>
                        <td>{t("common.unique_identifiers")}</td>
                        <td>{transaction.identifiers.length === 0 ? "None" : transaction.identifiers.join(", ")}</td>
                    </tr>
                    <tr>
                        <td>{t("common.description")}</td>
                        <td style={{ maxWidth: "300px" }}>{transaction.description}</td>
                    </tr>
                    <tr>
                        <td>{t("common.timestamp")}</td>
                        <td>{formatDateTimeWithUser(transaction.dateTime, user)}</td>
                    </tr>
                    <tr>
                        <td>{t("account.total")}</td>
                        <td>{formatNumberWithUser(transaction.total, user)}</td>
                    </tr>
                    <tr>
                        <td>{t("transaction.source")}</td>
                        <td>
                            {transaction.source === null ? "None" : <AccountLink account={transaction.source} />}
                        </td>
                    </tr>
                    <tr>
                        <td>{t("transaction.destination")}</td>
                        <td>
                            {transaction.destination === null ? "None" : <AccountLink account={transaction.destination} />}
                        </td>
                    </tr>
                    <tr>
                        <td>{t("common.category")}</td>
                        <td>
                            <TransactionCategory categories={transaction.lines.map(line => line.category)} />
                        </td>
                    </tr>
                </tbody>
            </table>
        </Card>;
    } else {
        return <Card title={t("transaction.transaction_details")!} isNarrow={true}>
            <table className="table is-fullwidth">
                <tbody>
                    <tr>
                        <td>{t("transaction.transaction_id")}</td>
                        <td>{transaction.id}</td>
                    </tr>
                    <tr>
                        <td>{t("common.unique_identifier")}</td>
                        <td>
                            <InputTextMultiple
                                value={editModel.identifiers}
                                onChange={value => props.onChange({ ...editModel, identifiers: value })}
                                disabled={props.isUpdating}
                                errors={props.errors.Identifiers} />
                        </td>
                    </tr>
                    <tr>
                        <td>{t("common.description")}</td>
                        <td>
                            <InputText
                                value={editModel.description}
                                onChange={e => props.onChange({ ...editModel, description: e.target.value })}
                                disabled={props.isUpdating}
                                errors={props.errors.Description} />
                        </td>
                    </tr>
                    <tr>
                        <td>{t("common.timestamp")}</td>
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
                        <td>{t("account.total")}</td>
                        {!editModel.isSplit
                            ? <td><InputNumber
                                value={editModel.total}
                                onChange={value => props.onChange({
                                    ...editModel,
                                    total: value,
                                    lines: [{ ...editModel.lines[0], amount: value }]
                                })}
                                allowNull={false}
                                disabled={props.isUpdating}
                                errors={props.errors.DateTime} />
                            </td>
                            : <td>{formatNumberWithUser(editModel.total, user)}</td>}
                    </tr>
                    <tr>
                        <td>{t("transaction.source")}</td>
                        <td>
                            <InputAccount
                                value={editModel.source?.id ?? null}
                                onChange={value => props.onChange({ ...editModel, source: value })}
                                allowNull={true}
                                allowCreateNewAccount={true}
                                disabled={props.isUpdating}
                                errors={props.errors.SourceId} />
                        </td>
                    </tr>
                    <tr>
                        <td>{t("transaction.destination")}</td>
                        <td>
                            <InputAccount
                                value={editModel.destination?.id ?? null}
                                onChange={value => props.onChange({ ...editModel, destination: value })}
                                allowNull={true}
                                allowCreateNewAccount={true}
                                disabled={props.isUpdating}
                                errors={props.errors.DestinationId} />
                        </td>
                    </tr>
                    <tr>
                        <td>{t("transaction.category")}</td>
                        <td>
                            {editModel.isSplit
                                ? <TransactionCategory categories={editModel.lines.map(line => line.category)} />
                                : <InputCategory
                                    value={editModel.lines[0].category}
                                    onChange={value => props.onChange({ ...editModel, lines: [{ ...editModel.lines[0], category: value }] })}
                                    disabled={props.isUpdating}
                                    errors={props.errors["Lines[0].Category"]} /> }
                        </td>
                    </tr>
                </tbody>
            </table>
            <div className="buttons">
                <InputButton disabled={props.isUpdating} className="is-primary" onClick={props.onSaveChanges}>{t("common.save_changes")}</InputButton>
                <InputButton onClick={() => props.onChange(null)}>{t("common.cancel")}</InputButton>
            </div>
        </Card>;
    }
}

interface TransactionLinesCardProps {
    transaction?: Transaction
    isUpdating: boolean
    onChange: (transaction: Transaction) => void
    editModel: Transaction | null
    errors: { [key: string]: string[] }
}
function TransactionLinesCard (props: TransactionLinesCardProps): React.ReactElement {
    const user = useUser();
    const transaction = props.transaction;
    const editModel = props.editModel;

    if (transaction === undefined) {
        return <Card title={t("transaction.transaction_lines")!} isNarrow={false}>
            {t("common.please_wait")}
        </Card>;
    }

    if (editModel === null) {
        /*
         * Not currently editing
         */
        if (!transaction.isSplit) {
            return <Card title={<>
                <span style={{ flexGrow: 1 }}>{t("transaction.transaction_lines")}</span>
                <InputIconButton icon={solid.faPen} onClick={() => props.onChange(transaction)} />
            </>} isNarrow={false}>
                {t("transaction.transaction_has_no_lines")}
            </Card>;
        } else {
            return <Card title={<>
                <span style={{ flexGrow: 1 }}>{t("transaction.transaction_lines")}</span>
                <InputIconButton icon={solid.faPen} onClick={() => props.onChange(transaction)} />
            </>} isNarrow={false}>
                <table className="table is-fullwidth">
                    <thead>
                        <tr>
                            <th>{t("common.description")}</th>
                            <th className="has-text-right">{t("transaction.amount")}</th>
                            <th>{t("transaction.source")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transaction.lines.map((line, i) => <tr key={i}>
                            <td>{line.description}</td>
                            <td className="has-text-right">{formatNumberWithUser(line.amount, user)}</td>
                            <td>{line.category}</td>
                        </tr>)}
                    </tbody>
                </table>
            </Card>;
        }
    } else {
        /*
         * Currently editing
         */
        if (!editModel.isSplit) {
            return <Card title="Transaction lines" isNarrow={false}>
                <p>{t("transaction.transaction_has_no_lines")}</p>
                <p>{t("transaction.split_to_add_lines")}</p>
                <div className="buttons mt-3">
                    <InputButton disabled={props.isUpdating}
                        onClick={splitTransaction}>
                        {t("transaction.action_split_transaction")}
                    </InputButton>
                </div>
            </Card>;
        } else {
            return <Card title="Transaction lines" isNarrow={false}>
                <table className="table is-fullwidth">
                    <thead>
                        <tr>
                            <th>{t("common.description")}</th>
                            <th className="has-text-right">{t("transaction.amount")}</th>
                            <th>{t("common.category")}</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {editModel.lines.map((line, i) => <tr key={i}>
                            <td>
                                <InputText value={line.description}
                                    onChange={e => updateLine({ ...line, description: e.target.value }, i)}
                                    disabled={props.isUpdating}
                                    errors={props.errors[`Lines[${i}].Description`]}
                                />
                            </td>
                            <td className="has-text-right">{
                                <InputNumber value={line.amount}
                                    onChange={value => updateLine({ ...line, amount: value }, i)}
                                    allowNull={false}
                                    disabled={props.isUpdating}
                                    errors={props.errors[`Lines[${i}].Amount`]}
                                />
                            }</td>
                            <td>
                                <InputCategory
                                    value={line.category}
                                    onChange={value => updateLine({ ...line, category: value }, i)}
                                    disabled={props.isUpdating}
                                    errors={props.errors[`Lines[${i}].Category`]}
                                />
                            </td>
                            <td style={{ verticalAlign: "middle" }}>
                                <InputIconButton icon={regular.faTrashCan} onClick={() => deleteLine(i)} />
                            </td>
                        </tr>)}
                    </tbody>
                </table>
                <div className="buttons">
                    <InputButton disabled={props.isUpdating}
                        onClick={() => props.onChange({
                            ...editModel,
                            lines: [...editModel.lines, { description: "Transaction line", amount: new Decimal(0), category: "" }]
                        })}>
                        {t("transaction.add_line")}
                    </InputButton>
                </div>
            </Card>;
        }
    }

    function splitTransaction (): void {
        if (editModel === null) return;

        props.onChange({
            ...editModel,
            isSplit: true,
            lines: [{
                ...editModel.lines[0],
                description: editModel.lines[0].description.trim() === "" ? t("transaction.transaction_line") : editModel.description
            }]
        });
    }

    function updateLine (newLine: TransactionLine, index: number): void {
        if (editModel === null) return;

        const lines = [
            ...editModel.lines.slice(0, index),
            newLine,
            ...editModel.lines.slice(index + 1)
        ];
        props.onChange({
            ...editModel,
            total: lines.reduce((sum, line) => sum.add(line.amount), new Decimal(0)),
            lines
        });
    }

    function deleteLine (index: number): void {
        if (editModel === null) return;

        const newLines = [...editModel.lines.slice(0, index), ...editModel.lines.slice(index + 1)];
        const total = newLines.length > 0 ? newLines.reduce((sum, line) => sum.add(line.amount), new Decimal(0)) : editModel.lines[index].amount;
        props.onChange({
            ...editModel,
            total,
            lines: newLines.length > 0 ? newLines : editModel.lines,
            isSplit: newLines.length > 0
        });
    }
}

interface TransactionMetaProps {
    transaction?: Transaction
    editModel: Transaction | null
    onChange: (transaction: Transaction) => void
    isUpdating: boolean
    errors: { [key: string]: string[] }
}
function TransactionMetaCard (props: TransactionMetaProps): React.ReactElement {
    if (props.transaction === undefined) {
        return <Card title={t("transaction.custom_fields")!} isNarrow={true}>
            {t("common.please_wait")}
        </Card>;
    }
    const transaction = props.transaction;

    if (props.editModel === null) {
        return <Card title={<>
            <span style={{ flexGrow: 1 }}>{t("transaction.custom_fields")}</span>
            <InputIconButton icon={solid.faPen} onClick={() => props.onChange(transaction)} />
        </>} isNarrow={true}>
            <table className="table is-fullwidth">
                <thead>
                    <tr>
                        <th>{t("common.name")}</th>
                        <th>{t("common.value")}</th>
                    </tr>
                </thead>
                <tbody>
                    {transaction.metaData.map((field, i) => <tr key={i}>
                        <td>{field.metaName}</td>
                        { /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */ }
                        <td><TransactionMetaValue field={{ type: field.type, value: field.value } as MetaFieldType}/></td>
                    </tr>)}
                </tbody>
            </table>
        </Card>;
    } else {
        return <Card title={t("transaction.custom_fields")!} isNarrow={true}>
            <table className="table is-fullwidth">
                <thead>
                    <tr>
                        <th>{t("common.name")}</th>
                        <th>{t("common.value")}</th>
                    </tr>
                </thead>
                <tbody>
                    {props.editModel.metaData.map((field, i) => <tr key={i}>
                        <td>{field.metaName}</td>
                        <td>
                            <TransactionMetaInput
                                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                                field={{ value: field.value, type: field.type } as MetaFieldType}
                                onChange={value => updateField(value, i)}
                                disabled={props.isUpdating}
                                errors={props.errors[`MetaData[${i}].Value`]}
                            />
                        </td>
                    </tr>)}
                </tbody>
            </table>
        </Card>;
    }

    function updateField (newValue: MetaFieldValue["value"], index: number): void {
        if (props.editModel === null) return;

        props.onChange({
            ...props.editModel,
            metaData: [
                ...props.editModel.metaData.slice(0, index),
                { ...props.editModel.metaData[index], value: newValue },
                ...props.editModel.metaData.slice(index + 1)
            ]
        });
    }
}
