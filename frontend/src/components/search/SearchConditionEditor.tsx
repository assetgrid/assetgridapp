import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "../../lib/ApiClient";
import Utils from "../../lib/Utils";
import { FieldValueType, MetaField } from "../../models/meta";
import { SearchOperator, SearchQuery } from "../../models/search";
import InputIconButton from "../input/InputIconButton";
import InputSelect from "../input/InputSelect";
import {
    ConditionValueEditorAccount, ConditionValueEditorBoolean, ConditionValueEditorDecimal, ConditionValueEditorDecimalArray, ConditionValueEditorIntegerArray, ConditionValueEditorText,
    ConditionValueEditorTextArray, ConditionValueEditorTransaction
} from "./SearchConditionValueEditor";

interface Props {
    disabled: boolean
    fields: SearchConditionField[]
    model: SearchQuery
    onChange: (value: SearchQuery) => void
    delete: () => void
}

export interface SearchConditionField {
    column: string
    label: string
    operators: SearchOperator[]
    defaultValue: SearchQuery["value"]
    editor: (
        (props: {
            disabled: boolean
            value: SearchQuery["value"]
            onChange: (value: SearchQuery["value"]) => void
        }) => React.ReactElement
    ) | null
}

export default function SearchConditionEditor (props: Props): React.ReactElement {
    const api = useApi();
    const { data: metaDataFields } = useQuery({ queryKey: ["meta"], queryFn: api.Meta.list });
    const { t } = useTranslation();

    /* eslint-disable no-multi-spaces */
    const operatorLabelDefinition = [
        // Operator,                        negated, defaultValue, label
        [SearchOperator.Equals,             false,   t("search.equals")],
        [SearchOperator.Equals,             true,    t("search.does_not_equal")],
        [SearchOperator.Contains,           false,   t("search.contains")],
        [SearchOperator.GreaterThan,        false,   t("search.greater_than")],
        [SearchOperator.GreaterThanOrEqual, false,   t("search.greater_than_or_equal")],
        [SearchOperator.GreaterThanOrEqual, true,    t("search.less_than")],
        [SearchOperator.GreaterThan,        true,    t("search.less_than_or_equal")],
        [SearchOperator.In,                 false,   t("search.in_list_of_values")],
        [SearchOperator.In,                 true,    t("search.not_in_list_of_values")],
        [SearchOperator.IsNull,             false,   t("search.does_not_have_value")],
        [SearchOperator.IsNull,             true,    t("search.has_value")]
    ] as const;
    /* eslint-enable no-multi-spaces */

    const operatorLabels = new Map(operatorLabelDefinition
        .map((label, i) => [i, ({ id: i, operator: label[0], negated: label[1], label: label[2] })]));
    const fields = React.useMemo(() => new Map(Object.entries(Utils.groupBy(props.fields, (item) => [item.column, { ...item, metaData: false }]))), [props.fields]);
    const metaFields = React.useMemo(() => metaDataFields === undefined
        ? undefined
        : new Map(metaDataFields.map(x => [x.id.toString(), fieldsFromMetaField(x)])), [metaDataFields]);

    if (metaFields === undefined) {
        return <>{t("common.loading_please_wait")}</>;
    }

    const possibleFields = (props.model.metaData ? metaFields : fields).get(props.model.column);
    if (possibleFields === undefined) throw new Error("Unknown column");
    const possibleOperators = possibleFields.flatMap(x => Array.from(operatorLabels.values()).filter(label => x.operators.includes(label.operator)));

    const field = possibleFields.find(x => x.operators.includes(props.model.operator));
    if (field === undefined) throw new Error("Unknown combination of column and operator");

    return <div className="filter-condition columns mb-0 mt-0">
        {/* Column */}
        <div className="column">
            <InputSelect isFullwidth={true}
                items={[
                    ...Array.from(fields, ([key, value]) => ({ key, value: value[0].label })),
                    ...Array.from(metaFields, ([key, value]) => ({ key: `meta.${key}`, value: value[0].label }))
                ]}
                value={props.model.metaData ? `meta.${props.model.column}` : props.model.column}
                onChange={value => operatorOrColumnChanged(value, props.model.operator, props.model.not)} />
        </div>

        {/* Operator */}
        <div className="column is-narrow">
            <InputSelect isFullwidth={true}
                disabled={props.disabled}
                items={possibleOperators.map(op => ({
                    key: op.id.toString(),
                    value: op.label
                }))}
                value={Array.from(operatorLabels.values()).find(op => op.operator === props.model.operator && op.negated === props.model.not)?.id.toString() ?? "0"}
                onChange={value => operatorOrColumnChanged(
                    props.model.metaData ? `meta.${props.model.column}` : props.model.column,
                    operatorLabels.get(Number(value))?.operator ?? SearchOperator.Equals,
                    operatorLabels.get(Number(value))?.negated ?? false)} />
        </div>

        {/* Value */}
        <div className="column">
            {field.editor !== null && <field.editor disabled={props.disabled}
                onChange={valueChanged}
                value={props.model.value}
            />}
        </div>

        <div className="column is-narrow">
            <InputIconButton icon={faTrashCan} onClick={props.delete}/>
        </div>
    </div>;

    function operatorOrColumnChanged (newColumn: string, newOperator: SearchOperator, newNegation: boolean): void {
        if (metaFields === undefined) { return; }

        const previousField = (props.model.metaData ? metaFields : fields)
            .get(props.model.column)
            ?.find(x => x.operators.includes(props.model.operator));
        if (previousField === undefined) throw new Error("Unknown field");

        const isMeta = newColumn.indexOf("meta.") === 0;
        if (isMeta) newColumn = newColumn.substring("meta.".length);
        const possibleNewFields = isMeta
            ? metaFields.get(newColumn)
            : fields.get(newColumn);

        // Make sure fields exist for this column
        if (possibleNewFields === undefined) throw new Error("Attempted to set column to an unknown value");
        // Get field with korrekt operator
        let newField = possibleNewFields.find(x => x.operators.includes(newOperator));
        // If no field matches the operator, chose the first possible field
        if (newField === undefined) {
            newField = possibleNewFields[0];
            newOperator = newField?.operators[0];
        }

        // If the column changed, set the value to the default value
        let value = props.model.value;
        if (newField.editor !== field?.editor) {
            value = newField.defaultValue;
        }

        props.onChange({
            ...props.model,
            column: newColumn,
            operator: newOperator,
            not: newNegation,
            metaData: newField.metaData,
            value
        });
    }

    function valueChanged (newValue: SearchQuery["value"]): void {
        props.onChange({
            ...props.model,
            value: newValue
        });
    }
}

function fieldsFromMetaField (field: MetaField): Array<SearchConditionField & { metaData: true }> {
    switch (field.valueType) {
        case FieldValueType.TextLine:
        case FieldValueType.TextLong:
            return [{
                column: field.id.toString(),
                label: field.name,
                operators: [SearchOperator.IsNull],
                defaultValue: "",
                editor: null,
                metaData: true
            }, {
                column: field.id.toString(),
                label: field.name,
                operators: [SearchOperator.Equals, SearchOperator.Contains],
                defaultValue: "",
                editor: ConditionValueEditorText,
                metaData: true
            }, {
                column: field.id.toString(),
                label: field.name,
                operators: [SearchOperator.In],
                defaultValue: [],
                editor: ConditionValueEditorTextArray,
                metaData: true
            }];
        case FieldValueType.Number:
            return [{
                column: field.id.toString(),
                label: field.name,
                operators: [SearchOperator.IsNull],
                defaultValue: "",
                editor: null,
                metaData: true
            }, {
                column: field.id.toString(),
                label: field.name,
                operators: [SearchOperator.Equals, SearchOperator.GreaterThan, SearchOperator.GreaterThanOrEqual],
                defaultValue: 0,
                editor: ConditionValueEditorDecimal,
                metaData: true
            }, {
                column: field.id.toString(),
                label: field.name,
                operators: [SearchOperator.In],
                defaultValue: [],
                editor: ConditionValueEditorDecimalArray,
                metaData: true
            }];
        case FieldValueType.Account:
            return [{
                column: field.id.toString(),
                label: field.name,
                operators: [SearchOperator.Equals],
                defaultValue: null,
                editor: ConditionValueEditorAccount,
                metaData: true
            }];
        case FieldValueType.Transaction:
            return [{
                column: field.id.toString(),
                label: field.name,
                operators: [SearchOperator.Equals],
                defaultValue: null,
                editor: ConditionValueEditorTransaction,
                metaData: true
            }, {
                column: field.id.toString(),
                label: field.name,
                operators: [SearchOperator.In],
                defaultValue: [],
                editor: ConditionValueEditorIntegerArray,
                metaData: true
            }];
        case FieldValueType.Attachment:
            return [{
                column: field.id.toString(),
                label: field.name,
                operators: [SearchOperator.IsNull],
                defaultValue: "",
                editor: null,
                metaData: true
            }];
        case FieldValueType.Boolean:
            return [{
                column: field.id.toString(),
                label: field.name,
                operators: [SearchOperator.Equals],
                defaultValue: true,
                editor: ConditionValueEditorBoolean,
                metaData: true
            }];
    }
}
