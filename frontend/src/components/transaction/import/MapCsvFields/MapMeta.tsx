import * as React from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "../../../../lib/ApiClient";
import { CsvImportProfile, MetaParseOptions, MetaParseOptionsNumber, MetaParseOptionsText, ParseOptions } from "../../../../models/csvImportProfile";
import Card from "../../../common/Card";
import Table from "../../../common/Table";
import { CsvCreateTransaction } from "../importModels";
import { useQuery } from "@tanstack/react-query";
import { FieldValueType, MetaField } from "../../../../models/meta";
import InputSelect from "../../../input/InputSelect";
import { InputParseOptionsModal } from "../../../input/InputParsingOptions";
import { DefaultParseOptions } from "../../../pages/transaction/PageImportTransactionsCsv";
import { getValue, parseMetaValue } from "./parseTransactionsCsv";
import InputText from "../../../input/InputText";

interface Props {
    options: CsvImportProfile
    transactions: CsvCreateTransaction[]
    setOptions: (options: CsvImportProfile) => void
    disabled: boolean
    data: any[]
    setModal: (modal: React.ReactElement | null) => void
    onChange: (transactions: CsvCreateTransaction[], options: CsvImportProfile) => void
}

export default function MapMeta (props: Props): React.ReactElement {
    const [page, setPage] = React.useState(1);
    const api = useApi();
    const { t } = useTranslation();
    const { data: fields } = useQuery({ queryKey: ["meta"], queryFn: api.Meta.list });

    if (fields === undefined || fields.length === 0) {
        return <Card title={t("import.meta_fields")!} isNarrow={true}>
            <p>{t("import.no_meta_fields")!}</p>
        </Card>;
    }

    return <Card title={t("import.meta_fields")!} isNarrow={true}>
        {t("import.map_meta_fields")!}
        <Table pageSize={10}
            renderItem={(field, i) => <MapMetaField
                key={field.id}
                field={field}
                options={props.options}
                disabled={props.disabled}
                data={props.data}
                transactions={props.transactions}
                onChange={props.onChange}
                setModal={props.setModal} />}
            page={page}
            goToPage={setPage}
            headings={<tr>
                <th>{t("meta.meta_field")!}</th>
                <th></th>
                <th></th>
            </tr>}
            items={fields} />
    </Card>;
}

interface MapMetaFieldProps {
    field: MetaField
    options: CsvImportProfile
    disabled: boolean
    data: any[]
    transactions: CsvCreateTransaction[]
    setModal: (modal: React.ReactElement | null) => void
    onChange: (transactions: CsvCreateTransaction[], options: CsvImportProfile) => void
}
function MapMetaField (props: MapMetaFieldProps): React.ReactElement {
    const { t } = useTranslation();
    const metaOptions = props.options.metaParseOptions ?? [];
    const fieldParseOptions = metaOptions.find(x => x.metaId === props.field.id);
    switch (props.field.valueType) {
        case FieldValueType.TextLine:
        case FieldValueType.TextLong:
            return <MapMetaTextInput
                field={props.field as any}
                options={fieldParseOptions as MetaParseOptionsText}
                disabled={props.disabled}
                data={props.data}
                setModal={props.setModal}
                transactions={props.transactions}
                onChange={(transactions, options) => props.onChange(transactions, {
                    ...props.options,
                    metaParseOptions: [
                        ...metaOptions.filter(x => x.metaId !== props.field.id),
                        options
                    ]
                })} />;
        case FieldValueType.Number:
            return <MapMetaNumberInput
                field={props.field as any}
                options={fieldParseOptions as MetaParseOptionsNumber}
                disabled={props.disabled}
                data={props.data}
                setModal={props.setModal}
                transactions={props.transactions}
                onChange={(transactions, options) => props.onChange(transactions, {
                    ...props.options,
                    metaParseOptions: [
                        ...metaOptions.filter(x => x.metaId !== props.field.id),
                        options
                    ]
                })} />;
        default:
            return <tr>
                <td>{props.field.name}</td>
                <td colSpan={2}>{t("meta.field_import_not_supported")}</td>
            </tr>;
    }
}

interface MapMetaTextInputProps {
    field: MetaField & { valueType: FieldValueType.TextLine | FieldValueType.TextLong }
    options?: MetaParseOptionsText
    disabled: boolean
    data: any[]
    transactions: CsvCreateTransaction[]
    setModal: (modal: React.ReactElement | null) => void
    onChange: (transactions: CsvCreateTransaction[], options: MetaParseOptions) => void
}
function MapMetaTextInput (props: MapMetaTextInputProps): React.ReactElement {
    const { t } = useTranslation();

    const options = props.options ?? {
        column: null,
        metaId: props.field.id,
        type: props.field.valueType,
        parseOptions: DefaultParseOptions
    };

    return <tr>
        <td>{props.field.name}</td>
        <td>
            <InputSelect label={t("import.column")!}
                isFullwidth={true}
                value={options.column}
                placeholder={t("import.select_column")!}
                disabled={props.disabled}
                onChange={result => onChange(result, options.parseOptions)}
                items={[
                    { key: "___NULL___", value: t("common.none") },
                    ...Object.keys(props.data[0]).map(item => {
                        return {
                            key: item,
                            value: item
                        };
                    })]}
                addOnAfter={
                    options.column !== null
                        ? <div className="control">
                            <button className="button is-primary"
                                disabled={props.disabled}
                                onClick={() => props.setModal(<InputParseOptionsModal
                                    value={options.parseOptions}
                                    previewData={props.data.map(row => getValue(row, options.column))}
                                    onChange={options => onChange(props.options!.column, options)}
                                    close={() => props.setModal(null)}
                                    closeOnChange={true} />
                                )}>
                                {t("import.parse_options")}
                            </button>
                        </div>
                        : undefined
                } />
        </td>
        <td></td>
    </tr>;

    function onChange (column: string | null, parseOptions: ParseOptions): void {
        if (column === "___NULL___") {
            props.onChange(props.data.map((x, i) => ({
                ...props.transactions[i],
                metaFields: [
                    ...props.transactions[i].metaFields.filter(x => x.metaId !== options.metaId)
                ]
            })), {
                ...options,
                column: null
            });
            return;
        }

        const newOptions = {
            ...options,
            column,
            parseOptions
        };
        props.onChange(props.data.map((x, i) => ({
            ...props.transactions[i],
            metaFields: [
                ...props.transactions[i].metaFields.filter(x => x.metaId !== newOptions.metaId),
                {
                    metaId: newOptions.metaId,
                    type: newOptions.type,
                    ...parseMetaValue(x, newOptions)
                }
            ]
        })), newOptions);
    }
}

interface MapMetaNumberInputProps {
    field: MetaField & { valueType: FieldValueType.Number }
    options?: MetaParseOptionsNumber
    disabled: boolean
    data: any[]
    transactions: CsvCreateTransaction[]
    setModal: (modal: React.ReactElement | null) => void
    onChange: (transactions: CsvCreateTransaction[], options: MetaParseOptions) => void
}
function MapMetaNumberInput (props: MapMetaNumberInputProps): React.ReactElement {
    const { t } = useTranslation();

    const options = props.options ?? {
        column: null,
        metaId: props.field.id,
        type: FieldValueType.Number,
        parseOptions: DefaultParseOptions,
        decimalSeparator: "."
    };

    return <tr>
        <td>{props.field.name}</td>
        <td>
            <InputSelect label={t("import.column")!}
                isFullwidth={true}
                value={options.column}
                placeholder={t("import.select_column")!}
                disabled={props.disabled}
                onChange={result => onChange(result, options.parseOptions, options.decimalSeparator)}
                items={[
                    { key: "___NULL___", value: t("common.none") },
                    ...Object.keys(props.data[0]).map(item => {
                        return {
                            key: item,
                            value: item
                        };
                    })]}
                addOnAfter={
                    options.column !== null
                        ? <div className="control">
                            <button className="button is-primary"
                                disabled={props.disabled}
                                onClick={() => props.setModal(<InputParseOptionsModal
                                    value={options.parseOptions}
                                    previewData={props.data.map(row => getValue(row, options.column))}
                                    onChange={newOptions => onChange(options.column, newOptions, options.decimalSeparator)}
                                    close={() => props.setModal(null)}
                                    closeOnChange={true} />
                                )}>
                                {t("import.parse_options")}
                            </button>
                        </div>
                        : undefined
                } />
        </td>
        <td>
            {options.column !== null &&
                <InputText label={t("import.decimal_separator")!}
                    value={options.decimalSeparator}
                    disabled={props.disabled}
                    onChange={e => onChange(options.column, options.parseOptions, e.target.value)}
                />}
        </td>
    </tr>;

    function onChange (column: string | null, parseOptions: ParseOptions, decimalSeparator: string): void {
        if (column === "___NULL___") {
            props.onChange(props.data.map((x, i) => ({
                ...props.transactions[i],
                metaFields: [
                    ...props.transactions[i].metaFields.filter(x => x.metaId !== options.metaId)
                ]
            })), {
                ...options,
                column: null
            });
            return;
        }

        const newOptions = {
            ...options,
            column,
            parseOptions,
            decimalSeparator
        };
        props.onChange(props.data.map((x, i) => ({
            ...props.transactions[i],
            metaFields: [
                ...props.transactions[i].metaFields.filter(x => x.metaId !== newOptions.metaId),
                {
                    metaId: newOptions.metaId,
                    type: newOptions.type,
                    ...parseMetaValue(x, newOptions)
                }
            ]
        })), newOptions);
    }
}
