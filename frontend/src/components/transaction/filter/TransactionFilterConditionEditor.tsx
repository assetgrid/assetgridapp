import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import Decimal from "decimal.js";
import { DateTime } from "luxon";
import * as React from "react";
import { Account } from "../../../models/account";
import { SearchOperator, SearchQuery } from "../../../models/search";
import InputAccount from "../../account/input/InputAccount";
import InputButton from "../../input/InputButton";
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
    query: SearchQuery;
    setQuery: (query: SearchQuery | null) => void;
}

export default function Condition(props: ConditionProps) {
    const column = props.query.column as Column; 

    return <div className="filter-condition columns mb-0 mt-0">
        {/* Column */}
        <div className="column">
            <InputSelect isFullwidth={true} items={[
                    { key: "Id", value: "Transaction Id" },
                    { key: "SourceAccountId", value: "Source Account" },
                    { key: "DestinationAccountId", value: "Destination Account" },
                    { key: "DateTime", value: "Datetime" },
                    { key: "Identifier", value: "Unique Identifier" },
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
            <ConditionValueEditor condition={{
                column: column,
                operator: props.query.operator,
                negated: props.query.not,
                value: props.query.value,
                onChange: (value: any) => props.setQuery({ ...props.query, value: value }),
                valueType: FilterHelpers.getValueType(column, props.query.operator)
            } as FilterHelpers.ConditionModel} />
        </div>

        <div className="column is-narrow">
            <InputIconButton icon={faTrashCan}  onClick={() => props.setQuery(null)}/>
        </div>
    </div>;

    function operatorOrColumnChanged(newColumn: Column, newOperator: SearchOperator, newNegation: boolean) {
        // Check for invalid operators
        if (!FilterHelpers.getPossibleOperators(newColumn).some(op => op.operator === newOperator && op.negated === newNegation)) {
            // Operator and column combination is not valid. Reset to default (0 = Equals)
            newOperator = SearchOperator.Equals;
            newNegation = false;
        }

        let value = props.query.value;
        let newType = FilterHelpers.getValueType(newColumn, newOperator);
        let oldType = FilterHelpers.getValueType(props.query.column as Column, props.query.operator);
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
                    value = DateTime.now()
            }
        }

        props.setQuery({
            ...props.query,
            column: newColumn,
            operator: newOperator,
            not: newNegation,
            value: value
        });
    }
}

function ConditionValueEditor(props: {condition: FilterHelpers.ConditionModel}): React.ReactElement {
    switch (props.condition.column) {
        case "Id":
        case "Total":
            return <ConditionValueEditorNumeric condition={props.condition} />;
        case "Category":
        case "Description":
        case "Identifier":
            return <ConditionValueEditorText condition={props.condition} />;
        case "SourceAccountId":
        case "DestinationAccountId":
            return <ConditionValueEditorAccount condition={{
                ...props.condition,
                onChange: ((account: Account) => (props.condition.onChange as (id: number) => void)(account?.id ?? null)) as any
            }} />;
        case "DateTime":
            return <ConditionValueEditorDateTime condition={props.condition} />;
        default:
            throw "Uknown column";
    }
}

function ConditionValueEditorNumeric(props: { condition: FilterHelpers.ConditionModel }) {
    switch (props.condition.valueType) {
        case "number":
        case "decimal":
        case "number[]":
        case "decimal[]":
            break;
        default:
            throw "Invalid value type for numeric editor";
    }

    switch (props.condition.operator) {
        case SearchOperator.In:
            if (props.condition.valueType === "number[]") {
                let condition = props.condition;
                return <InputNumbers
                    allowDecimal={props.condition.column !== "Id"}
                    value={props.condition.value.map(number => new Decimal(number))}
                    onChange={value => condition.onChange(value.map(number => number.toNumber()))} />
            } else if (props.condition.valueType === "decimal[]") {
                let condition = props.condition;
                return <InputNumbers
                    value={props.condition.value}
                    allowDecimal={true}
                    onChange={value => condition.onChange(value)} />
            }
        default:
            if (props.condition.valueType === "number") {
                let condition = props.condition;
                return <InputNumber
                    allowNull={false}
                    value={new Decimal(props.condition.value)}
                    onChange={value => condition.onChange(props.condition.column === "Id" ? Math.round(value.toNumber()) : value.toNumber())} />
            } else if (props.condition.valueType === "decimal") {
                let condition = props.condition;
                return <InputNumber
                    allowNull={false}
                    value={props.condition.value}
                    onChange={value => condition.onChange(new Decimal(value))} />
            }
    }
    throw "";
}

function ConditionValueEditorText(props: { condition: FilterHelpers.ConditionModel }): React.ReactElement {
    switch (props.condition.column) {
        case "Category":
        case "Identifier":
        case "Description":
            break;
        default:
            throw "Invalid column";
    }

    switch (props.condition.operator) {
        case SearchOperator.Equals:
        case SearchOperator.Contains:
            let conditionScalar = props.condition;
            return <InputText value={conditionScalar.value} onChange={e => conditionScalar.onChange(e.target.value)} />;
        case SearchOperator.In:
            let conditionArray = props.condition;
            return <InputTextMultiple value={conditionArray.value} onChange={value => conditionArray.onChange(value)}/>;
    }
}

function ConditionValueEditorAccount(props: { condition: FilterHelpers.ConditionModel }): React.ReactElement {
    type test = (FilterHelpers.ConditionModel & { valueType: "account" })["column"];
    switch (props.condition.column) {
        case "SourceAccountId":
        case "DestinationAccountId":
            break;
        default:
            throw "Invalid column";
    }

    let condition = props.condition;
    switch (props.condition.operator) {
        case SearchOperator.Equals:
            return <InputAccount
                value={condition.value}
                onChange={account => condition.onChange(account)}
                nullSelectedText="No Account"
                disabled={false}
                allowCreateNewAccount={false} 
                allowNull={true} />
    }
}

function ConditionValueEditorDateTime(props: { condition: FilterHelpers.ConditionModel }): React.ReactElement {
    switch (props.condition.column) {
        case "DateTime":
            break;
        default:
            throw "Invalid column";
    }

    let condition = props.condition;
    switch (props.condition.operator) {
        case SearchOperator.Equals:
        case SearchOperator.GreaterThan:
        case SearchOperator.GreaterThanOrEqual:
            return <InputDateTime
                value={condition.value}
                onChange={value => condition.onChange(value)}
                disabled={false}
                fullwidth={false} />
    }
}