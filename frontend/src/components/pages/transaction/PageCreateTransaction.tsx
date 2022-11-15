import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import Decimal from "decimal.js";
import { DateTime } from "luxon";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useApi } from "../../../lib/ApiClient";
import { routes } from "../../../lib/routes";
import { forget } from "../../../lib/Utils";
import { MetaField, MetaFieldValue } from "../../../models/meta";
import { ModifyTransaction, Transaction, TransactionLine } from "../../../models/transaction";
import InputAccount from "../../account/input/InputAccount";
import Card from "../../common/Card";
import Hero from "../../common/Hero";
import InputButton from "../../input/InputButton";
import InputCategory from "../../input/InputCategory";
import InputDateTime from "../../input/InputDateTime";
import InputIconButton from "../../input/InputIconButton";
import InputNumber from "../../input/InputNumber";
import InputText from "../../input/InputText";
import InputTextOrNull from "../../input/InputTextOrNull";
import TransactionMetaInput, { MetaFieldType } from "../../transaction/input/TransactionMetaInput";
import TransactionCategory from "../../transaction/table/TransactionCategory";
import TransactionLink from "../../transaction/TransactionLink";

export default function PageCreateTransaction (): React.ReactElement {
    const defaultModel: ModifyTransaction = {
        dateTime: DateTime.now(),
        description: "",
        destinationId: window.history.state.usr?.destinationId ?? null,
        sourceId: window.history.state.usr?.sourceId ?? null,
        identifiers: [],
        lines: [{ amount: new Decimal(0), description: "", category: "" }],
        total: new Decimal(0),
        isSplit: false,
        metaData: null
    };

    const [model, setModel] = React.useState<ModifyTransaction>(defaultModel);
    const [metaFields, setMetaFields] = React.useState<Map<number, MetaField> | "fetching">("fetching");
    const [modelErrors, setModelErrors] = React.useState<{ [key: string]: string[] }>({});
    const [isCreating, setCreating] = React.useState(false);
    const navigate = useNavigate();
    const allowBack = window.history.state.usr?.allowBack === true;
    const actionOnComplete: "back" | "chose" = window.history.state.usr?.actionOnComplete ?? "chose";
    const [createdTransaction, setCreatedTransaction] = React.useState<Transaction | null>();
    const api = useApi();
    const { t } = useTranslation();

    React.useEffect(forget(loadMetaFields), [api]);

    return <>
        <Hero title={t("transaction.create_new")} />
        <div className="p-3">
            <Card title={t("transaction.transaction_details")!} isNarrow={true}>
                { (createdTransaction != null) && <article className="message is-link">
                    <div className="message-body">
                        <Trans i18nKey="transaction.has_been_created_link">
                            Transaction <TransactionLink transaction={createdTransaction} /> has been created.
                        </Trans>
                    </div>
                </article>}

                <InputDateTime label={t("common.timestamp")!}
                    value={model.dateTime}
                    onChange={value => setModel({ ...model, dateTime: value })}
                    fullwidth={false}
                    disabled={isCreating}
                    errors={modelErrors?.DateTime} />
                <InputTextOrNull label={t("common.unique_identifier")!}
                    value={model.identifiers[0] ?? ""}
                    noValueText={t("common.ignore_duplicates")}
                    onChange={value => setModel({ ...model, identifiers: value === null ? [] : [value] })}
                    disabled={isCreating}
                    errors={modelErrors?.Identifiers}/>
                <InputNumber label={t("account.total")!}
                    allowNull={false}
                    value={model.total}
                    disabled={model.isSplit || isCreating}
                    onChange={value => setModel({
                        ...model,
                        total: new Decimal(value),
                        lines: [{ ...model.lines[0], amount: new Decimal(value) }]
                    })}
                    errors={modelErrors?.Total}/>
                <InputText label={t("common.description")!}
                    value={model.description}
                    onChange={e => setModel({ ...model, description: e.target.value })}
                    disabled={isCreating}
                    errors={modelErrors?.Description}/>
                <div className="columns">
                    <div className="column is-6">
                        <InputAccount label={t("transaction.source")!}
                            value={model.sourceId}
                            disabled={isCreating}
                            allowNull={true}
                            allowCreateNewAccount={true}
                            onChange={account => setModel({ ...model, sourceId: account?.id ?? null })}
                            errors={modelErrors?.SourceId} />
                    </div>
                    <div className="column is-6">
                        <InputAccount label={t("transaction.destination")!}
                            value={model.destinationId}
                            disabled={isCreating}
                            allowNull={true}
                            allowCreateNewAccount={true}
                            onChange={account => setModel({ ...model, destinationId: account?.id ?? null })}
                            errors={modelErrors?.DestinationId} />
                    </div>
                </div>
                {model.isSplit
                    ? <div>
                        <label className="label">{t("common.category")!}</label>
                        <TransactionCategory categories={model.lines.map(line => line.category)} />
                    </div>
                    : <InputCategory label={t("common.category")!}
                        value={model.lines[0].category}
                        disabled={isCreating}
                        onChange={value => setModel({
                            ...model,
                            lines: [{ ...model.lines[0], category: value }]
                        })}
                        errors={modelErrors?.["Lines[0].Category"]} />}
            </Card>

            <Card title={t("transaction.lines")!} isNarrow={true}>
                {!model.isSplit
                    ? < InputButton onClick={splitTransaction}>
                        {t("transaction.action_split_transaction")!}
                    </InputButton>
                    : <>
                        {model.lines.map((line, i) => <div key={i} className="columns">
                            <div className="column is-3">
                                <InputNumber label={i === 0 ? t("transaction.amount")! : undefined}
                                    allowNull={false}
                                    value={line.amount}
                                    onChange={value => updateLine(i, {
                                        ...model.lines[i],
                                        amount: new Decimal(value)
                                    })}
                                    disabled={isCreating}
                                    errors={modelErrors?.[`Lines[${i}].Amount`]} />
                            </div>
                            <div className="column">
                                <InputText label={i === 0 ? t("common.description")! : undefined}
                                    value={line.description}
                                    onChange={e => updateLine(i, {
                                        ...model.lines[i],
                                        description: e.target.value
                                    })}
                                    disabled={isCreating}
                                    errors={modelErrors?.[`Lines[${i}].Description`]}/>
                            </div>
                            <div className="column">
                                <InputCategory label={i === 0 ? t("common.category")! : undefined}
                                    value={line.category}
                                    onChange={value => updateLine(i, {
                                        ...model.lines[i],
                                        category: value
                                    })}
                                    disabled={isCreating}
                                    errors={modelErrors?.[`Lines[${i}].Category`]} />
                            </div>
                            {model.lines.length !== 0 &&
                                <div className="column is-narrow">
                                    {i === 0 && <label className="label">&nbsp;</label>}
                                    <InputIconButton
                                        icon={faTrashCan}
                                        onClick={() => deleteLine(i)} />
                                </div>
                            }
                        </div>
                        )}
                        <div className="buttons">
                            <InputButton onClick={() => addLine()}>
                                {t("transaction.add_line")!}
                            </InputButton>
                        </div>
                    </>}
            </Card>

            <Card title={t("metadata.custom_fields")!} isNarrow={true}>
                {model.metaData === null && <p>{t("transaction.loading_custom_fields")!}</p>}
                {model.metaData !== null && metaFields !== "fetching" && <table className="table is-fullwidth">
                    <thead>
                        <tr>
                            <th>{t("common.name")!}</th>
                            <th>{t("common.value")!}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {model.metaData.map((field, i) => <tr key={i}>
                            <td>{metaFields.get(field.metaId)?.name}</td>
                            <td>
                                <TransactionMetaInput
                                    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                                    field={{ value: field.value, type: metaFields.get(field.metaId)!.valueType } as MetaFieldType}
                                    onChange={value => updateMetaField(value, i)}
                                    disabled={isCreating}
                                    errors={modelErrors[`MetaData[${i}].Value`]}
                                />
                            </td>
                        </tr>)}
                    </tbody>
                </table>}
            </Card>

            <Card title={t("common.actions")!} isNarrow={true}>
                <div className="buttons">
                    {actionOnComplete === "chose" && <>
                        <InputButton className="is-primary" disabled={api === null || isCreating || metaFields === "fetching"}
                            onClick={forget(async () => await create("stay"))}>
                            {t("common.create_and_stay")!}
                        </InputButton>
                        <InputButton className="is-primary" disabled={api === null || isCreating || metaFields === "fetching"}
                            onClick={forget(async () => await create("view"))}>
                            {t("transaction.create_and_view")!}
                        </InputButton>
                    </>}
                    {actionOnComplete === "back" && <>
                        <InputButton className="is-primary" disabled={api === null} onClick={forget(async () => await create("back"))}>
                            {t("transaction.create_transaction")!}
                        </InputButton>
                    </>}
                    {allowBack && <InputButton onClick={() => navigate(-1)}>{t("common.back")!}</InputButton>}
                </div>
            </Card>
        </div>
    </>;

    function splitTransaction (): void {
        setModel({
            ...model,
            isSplit: true,
            lines: [{ ...model.lines[0], description: model.description === "" ? t("transaction.transaction_line") : model.description }]
        });
    }

    function deleteLine (index: number): void {
        const lines = [...model.lines.slice(0, index), ...model.lines.slice(index + 1)];
        setModel({
            ...model,
            lines: lines.length > 0 ? lines : model.lines,
            total: lines.length === 0 ? model.lines[index].amount : lines.reduce((sum, line) => sum.add(line.amount), new Decimal(0)),
            isSplit: lines.length > 0
        });
    }

    function addLine (): void {
        setModel({
            ...model,
            lines: [
                ...model.lines,
                {
                    amount: new Decimal(0),
                    description: t("transaction.transaction_line"),
                    category: ""
                }
            ]
        });
    }

    function updateLine (index: number, newLine: TransactionLine): void {
        const lines = [
            ...model.lines.slice(0, index),
            newLine,
            ...model.lines.slice(index + 1)];
        setModel({
            ...model,
            lines,
            total: lines.reduce((sum, line) => sum.add(line.amount), new Decimal(0))
        });
    }

    async function create (action: "stay" | "view" | "back"): Promise<void> {
        if (api === null || metaFields === "fetching") return;

        setCreating(true);
        setCreatedTransaction(null);
        const result = await api.Transaction.create(model);
        if (result.status === 200) {
            if (action === "stay") {
                setModel({
                    ...defaultModel,
                    metaData: [...metaFields.values()].map(x => ({
                        metaId: x.id,
                        type: x.type,
                        value: null
                    }))
                });
                setCreating(false);
                setCreatedTransaction(result.data);
            } else if (action === "back") {
                navigate(-1);
            } else {
                navigate(routes.transaction(result.data.id.toString()));
            }
        } else if (result.status === 400) {
            setCreating(false);
            setModelErrors(result.errors);
        }
    }

    async function loadMetaFields (): Promise<void> {
        if (api === null) return;

        const result = await api.Meta.list();
        setMetaFields(new Map(result.data.map(x => [x.id, x])));
        setModel({
            ...model,
            metaData: result.data.map(x => ({
                metaId: x.id,
                type: x.valueType,
                value: null
            }))
        });
    }

    function updateMetaField (newValue: MetaFieldValue["value"], index: number): void {
        if (model.metaData === null) return;

        setModel({
            ...model,
            metaData: [
                ...model.metaData.slice(0, index),
                { ...model.metaData[index], value: newValue },
                ...model.metaData.slice(index + 1)
            ]
        });
    }
}
