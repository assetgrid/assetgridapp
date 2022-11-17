import { faTrashCan } from "@fortawesome/free-solid-svg-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Utils from "../../lib/Utils";
import { SearchOperator, SearchQuery } from "../../models/search";
import InputIconButton from "../input/InputIconButton";
import InputSelect from "../input/InputSelect";

interface Props {
    disabled: boolean
    fields: SearchConditionField[]
    model: SearchQuery
    onChange: (value: SearchQuery) => void
    delete: () => void
}

export interface SearchConditionField {
    key: string
    label: string
    operators: SearchOperator[]
    defaultValue: SearchQuery["value"]
    editor: (props: { disabled: boolean, value: SearchQuery["value"], onChange: (value: SearchQuery["value"]) => void }) => React.ReactElement
}

export default function SearchConditionEditor (props: Props): React.ReactElement {
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
        [SearchOperator.In,                 true,    t("search.not_in_list_of_values")]] as const;
    /* eslint-enable no-multi-spaces */

    const operatorLabels = new Map(operatorLabelDefinition
        .map((label, i) => [i, ({ id: i, operator: label[0], negated: label[1], label: label[2] })]));
    const fields = React.useMemo(() => new Map(Object.entries(Utils.groupBy(props.fields, (item) => [item.key, item]))), [props.fields]);

    const possibleFields = fields.get(props.model.column);
    if (possibleFields === undefined) throw new Error("Unknown column");
    const possibleOperators = possibleFields.flatMap(x => Array.from(operatorLabels.values()).filter(label => x.operators.includes(label.operator)));

    const field = possibleFields.find(x => x.operators.includes(props.model.operator));
    if (field === undefined) throw new Error("Unknown combination of column and operator");

    return <div className="filter-condition columns mb-0 mt-0">
        {/* Column */}
        <div className="column">
            <InputSelect isFullwidth={true}
                items={Array.from(fields, ([key, value]) => ({ key, value: value[0].label }))}
                value={props.model.column}
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
                    props.model.column,
                    operatorLabels.get(Number(value))?.operator ?? SearchOperator.Equals,
                    operatorLabels.get(Number(value))?.negated ?? false)} />
        </div>

        {/* Value */}
        <div className="column">
            <field.editor disabled={props.disabled}
                onChange={valueChanged}
                value={props.model.value}
            />
        </div>

        <div className="column is-narrow">
            <InputIconButton icon={faTrashCan} onClick={props.delete}/>
        </div>
    </div>;

    function operatorOrColumnChanged (newColumn: string, newOperator: SearchOperator, newNegation: boolean): void {
        const previousField = fields.get(props.model.column)?.find(x => x.operators.includes(props.model.operator));
        if (previousField === undefined) throw new Error("Unknown field");

        const possibleNewFields = fields.get(newColumn);
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
