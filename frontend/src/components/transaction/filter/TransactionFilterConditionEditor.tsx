import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import Decimal from "decimal.js";
import { DateTime } from "luxon";
import * as React from "react";
import { Account } from "../../../models/account";
import { SearchOperator, SearchQuery } from "../../../models/search";
import InputAccount from "../../account/input/InputAccount";
import InputCategory from "../../input/InputCategory";
import InputDateTime from "../../input/InputDateTime";
import InputIconButton from "../../input/InputIconButton";
import InputNumber from "../../input/InputNumber";
import InputNumbers from "../../input/InputNumbers";
import InputSelect from "../../input/InputSelect";
import InputText from "../../input/InputText";
import InputTextMultiple from "../../input/InputTextMultiple";
import * as FilterHelpers from "./FilterHelpers";

type Column = FilterHelpers.ConditionModel["column"];

interface ConditionProps {
    query: SearchQuery
    setQuery: (query: SearchQuery | null) => void
}

export default function Condition (props: ConditionProps): React.ReactElement {
    const column = props.query.column as Column;

    return <div className="filter-condition columns mb-0 mt-0">
        {/* Column */}
        <div className="column">
            <InputSelect isFullwidth={true} items={[
                { key: "Id", value: "Transaction Id" },
                { key: "SourceAccountId", value: "Source Account" },
                { key: "DestinationAccountId", value: "Destination Account" },
                { key: "DateTime", value: "Datetime" },
                { key: "Category", value: "Category" },
                { key: "Description", value: "Description" },
                { key: "Total", value: "Total" }
            ]}
            value={props.query.column}
            onChange={value => operatorOrColumnChanged(value as typeof column, props.query.operator, props.query.not)} />
        </div>

        {/* Operator */}
        <div className="column is-narrow">
            <InputSelect isFullwidth={true} items={FilterHelpers.getPossibleOperators(column).map(op => ({
                key: FilterHelpers.Operators.findIndex(o => o.operator === op.operator && o.negated === op.negated).toString(),
                value: op.label
            }))}
            value={FilterHelpers.Operators.findIndex(op => op.operator === props.query.operator && op.negated === props.query.not).toString()}
            onChange={value => operatorOrColumnChanged(
                column,
                FilterHelpers.Operators[Number(value)].operator,
                FilterHelpers.Operators[Number(value)].negated)} />
        </div>

        {/* Value */}
        <div className="column">
            {/* We disable the warning here as a cast is necessary as we guarantee a valid column/operator/value combination elsewhere in the code */ }
            {/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */ }
            <ConditionValueEditor condition={{
                column,
                operator: props.query.operator,
                negated: props.query.not,
                value: props.query.value,
                onChange: (value: any) => props.setQuery({ ...props.query, value }),
                valueType: FilterHelpers.getValueType(column, props.query.operator)
            } as FilterHelpers.ConditionModel} />
        </div>

        <div className="column is-narrow">
            <InputIconButton icon={faTrashCan} onClick={() => props.setQuery(null)}/>
        </div>
    </div>;

    function operatorOrColumnChanged (newColumn: Column, newOperator: SearchOperator, newNegation: boolean): void {
        // Check for invalid operators
        if (!FilterHelpers.getPossibleOperators(newColumn).some(op => op.operator === newOperator && op.negated === newNegation)) {
            // Operator and column combination is not valid. Reset to default (0 = Equals)
            newOperator = SearchOperator.Equals;
            newNegation = false;
        }

        let value = props.query.value;
        const newType = FilterHelpers.getValueType(newColumn, newOperator);
        const oldType = FilterHelpers.getValueType(props.query.column as Column, props.query.operator);
        if (newType !== oldType) {
            switch (newType) {
                case "number":
                    value = 0;
                    break;
                case "decimal":
                    value = new Decimal(0);
                    break;
                case "string":
                    value = "";
                    break;
                case "account":
                    value = null;
                    break;
                case "number[]":
                case "decimal[]":
                case "string[]":
                    value = [];
                    break;
                case "datetime":
                    value = DateTime.now();
            }
        }

        props.setQuery({
            ...props.query,
            column: newColumn,
            operator: newOperator,
            not: newNegation,
            value
        });
    }
}

function ConditionValueEditor (props: { condition: FilterHelpers.ConditionModel }): React.ReactElement {
    switch (props.condition.column) {
        case "Id":
        case "Total":
            return <ConditionValueEditorNumeric condition={props.condition} />;
        case "Category":
        case "Description":
            return <ConditionValueEditorText condition={props.condition} />;
        case "SourceAccountId":
        case "DestinationAccountId":
            return <ConditionValueEditorAccount condition={{
                ...props.condition,
                onChange: ((account: Account) => (props.condition.onChange as (id: number) => void)(account?.id ?? null)) as any
            }} />;
        case "DateTime":
            return <ConditionValueEditorDateTime condition={props.condition} />;
    }
}

function ConditionValueEditorNumeric (props: { condition: FilterHelpers.ConditionModel }): React.ReactElement {
    switch (props.condition.valueType) {
        case "number":
        case "decimal":
        case "number[]":
        case "decimal[]":
            break;
        default:
            throw new Error("Invalid value type for numeric editor");
    }

    switch (props.condition.operator) {
        case SearchOperator.In:
            switch (props.condition.valueType) {
                case "number[]": {
                    const intArrayCondition = props.condition;
                    return <InputNumbers
                        allowDecimal={props.condition.column !== "Id"}
                        value={props.condition.value.map(number => new Decimal(number))}
                        onChange={value => intArrayCondition.onChange(value.map(number => number.toNumber()))} />;
                }
                case "decimal[]": {
                    const decimalArrayCondition = props.condition;
                    return <InputNumbers
                        value={props.condition.value}
                        allowDecimal={true}
                        onChange={value => decimalArrayCondition.onChange(value)} />;
                }
            }
            break;
        default:
            switch (props.condition.valueType) {
                case "number": {
                    const intCondition = props.condition;
                    return <InputNumber
                        allowNull={false}
                        value={new Decimal(props.condition.value)}
                        onChange={value => intCondition.onChange(props.condition.column === "Id" ? Math.round(value.toNumber()) : value.toNumber())} />;
                }
                case "decimal": {
                    const decimalCondtition = props.condition;
                    return <InputNumber
                        allowNull={false}
                        value={props.condition.value}
                        onChange={value => decimalCondtition.onChange(new Decimal(value))} />;
                }
            }
    }
}

function ConditionValueEditorText (props: { condition: FilterHelpers.ConditionModel }): React.ReactElement {
    switch (props.condition.column) {
        case "Category":
            if (props.condition.operator === SearchOperator.Equals) {
                const condition = props.condition;
                return <InputCategory value={condition.value} onChange={value => condition.onChange(value)} disabled={false} />;
            }
            break;
        case "Description":
            break;
        default:
            throw new Error(`Invalid column ${props.condition.column} for text editor`);
    }

    switch (props.condition.operator) {
        case SearchOperator.Equals:
        case SearchOperator.Contains: {
            const conditionScalar = props.condition;
            return <InputText value={conditionScalar.value} onChange={e => conditionScalar.onChange(e.target.value)} />;
        }
        case SearchOperator.In: {
            const conditionArray = props.condition;
            return <InputTextMultiple value={conditionArray.value} onChange={value => conditionArray.onChange(value)} />;
        }
    }
}

function ConditionValueEditorAccount (props: { condition: FilterHelpers.ConditionModel }): React.ReactElement {
    switch (props.condition.column) {
        case "SourceAccountId":
        case "DestinationAccountId":
            break;
        default:
            throw new Error("Invalid column");
    }

    const condition = props.condition;
    switch (props.condition.operator) {
        case SearchOperator.Equals:
            return <InputAccount
                value={condition.value}
                onChange={account => condition.onChange(account)}
                nullSelectedText="No Account"
                disabled={false}
                allowCreateNewAccount={false}
                allowNull={true} />;
    }
}

function ConditionValueEditorDateTime (props: { condition: FilterHelpers.ConditionModel }): React.ReactElement {
    switch (props.condition.column) {
        case "DateTime":
            break;
        default:
            throw new Error("Invalid column");
    }

    const condition = props.condition;
    switch (props.condition.operator) {
        case SearchOperator.Equals:
        case SearchOperator.GreaterThan:
        case SearchOperator.GreaterThanOrEqual:
            return <InputDateTime
                value={condition.value}
                onChange={value => condition.onChange(value)}
                disabled={false}
                fullwidth={false} />;
    }
}
