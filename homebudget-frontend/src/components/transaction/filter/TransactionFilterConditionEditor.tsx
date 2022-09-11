import Decimal from "decimal.js";
import { DateTime } from "luxon";
import React = require("react");
import { Account } from "../../../models/account";
import { SearchOperator, SearchQuery } from "../../../models/search";
import InputAccount from "../../form/account/InputAccount";
import InputButton from "../../form/InputButton";
import InputNumber from "../../form/InputNumber";
import InputSelect from "../../form/InputSelect";
import InputText from "../../form/InputText";

const numericOperators = ["equals", "not-equals", "in", "not-in", "greater-than", "greater-than-or-equal", "less-than", "less-than-or-equal"] as const;
const accountOperators = ["equals", "not-equals", "in", "not-in"] as const;
const dateTimeOperators = ["equals", "not-equals", "greater-than", "greater-than-or-equal", "less-than", "less-than-or-equal"] as const;
const stringOperators = ["equals", "not-equals", "in", "not-in", "contains", "not-contains"] as const;

type ConditionModel = {
    column: "Id";
    operator: typeof numericOperators[number];
    valueType: "number";
    value: number;
    onChange: (value: number) => void;
} | {
    column: "Total";
    operator: typeof numericOperators[number];
    valueType: "decimal";
    value: Decimal;
    onChange: (value: Decimal) => void;
} | {
    column: "SourceAccountId" | "DestinationAccountId";
    operator: typeof accountOperators[number];
    valueType: "account";
    value: number;
    onChange: (value: Account) => void;
} | {
    column: "DateTime";
    operator: typeof dateTimeOperators[number];
    valueType: "datetime";
    value: DateTime;
    onChange: (value: DateTime) => void;
} | {
    column: "Identifier" | "Category" | "Description";
    operator: typeof stringOperators[number];
    valueType: "string";
    value: string;
    onChange: (value: string) => void;
};

interface ConditionProps {
    query: SearchQuery;
    setQuery: (query: SearchQuery | null) => void;
}

export default function Condition(props: ConditionProps) {
    return <div className="filter-condition columns mb-0 mt-0">
        {/* Column */}
        <div className="column">
            <InputSelect items={[
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
                onChange={value => operatorOrColumnChanged(value as ConditionModel['column'], getOperatorString(props.query))} />
        </div>

        {/* Operator */}
        <div className="column">
            <InputSelect items={[
                { key: "equals", value: "Equals" },
                { key: "not-equals", value: "Does not equal" },
                { key: "contains", value: "Contains" },
                { key: "not-contains", value: "Does not contain" },
                { key: "in", value: "In list of values" },
                { key: "not-in", value: "Not in list of values" },
                { key: "greater-than", value: "Greater than" },
                { key: "greater-than-or-equal", value: "Greater than or equal" },
                { key: "less-than", value: "Less than" },
                { key: "less-than-or-equal", value: "Less than or equal" }
            ].filter(item => getPossibleOperators().some(operator => item.key === operator))}
                value={getOperatorString(props.query)}
                onChange={value => operatorOrColumnChanged(props.query.column as ConditionModel['column'], value as ConditionModel['operator'])} />
        </div>
        
        {/* Value */}
        <div className="column">
            <ConditionValueEditor condition={{
                column: props.query.column,
                operator: getOperatorString(props.query),
                value: props.query.value,
                onChange: (value: any) => props.setQuery({ ...props.query, value: value })
            } as ConditionModel} />
        </div>

        <div className="column">
            <InputButton onClick={() => props.setQuery(null)}>Delete</InputButton>
        </div>
    </div>;

    function getPossibleOperators() {
        switch (props.query.column as ConditionModel["column"]) {
            case "Id":
            case "Total":
                return numericOperators;
            case "DateTime":
                return dateTimeOperators;
            case "SourceAccountId":
            case "DestinationAccountId":
                return accountOperators;
            case "Identifier":
            case "Category":
            case "Description":
                return stringOperators;
        }
    }

    function getOperatorString(query: SearchQuery) {
        switch (query.operator) {
            case SearchOperator.In:
                return query.not ? "not-in" : "in";
            case SearchOperator.Contains:
                return query.not ? "not-contains" : "contains";
            case SearchOperator.Equals:
                return query.not ? "not-equals" : "equals";
            case SearchOperator.GreaterThan:
                return query.not ? "less-than-or-equal" : "greater-than";
            case SearchOperator.GreaterThanOrEqual:
                return query.not ? "less-than" : "greater-than-or-equal";
        }
    }

    function getOperator(operatorString: ConditionModel['operator']) {
        switch (operatorString) {
            case "contains":
            case "not-contains":
                return SearchOperator.Contains;
            case "in":
            case "not-in":
                return SearchOperator.In;
            case "equals":
            case "not-equals":
                return SearchOperator.Equals;
            case "less-than-or-equal":
            case "greater-than":
                return SearchOperator.GreaterThan;
            case "less-than":
            case "greater-than-or-equal":
                return SearchOperator.GreaterThanOrEqual;
        }
    }

    function getOperatorNegation(value: ConditionModel['operator']) {
        switch (value) {
            case "not-contains":
            case "not-equals":
            case "less-than-or-equal":
            case "less-than":
            case "not-in":
                return true;
            default:
                return false;
        }
    }

    function operatorOrColumnChanged(newColumn: ConditionModel['column'], newOperator: ConditionModel['operator']) {
        // Check for invalid operators
        switch (newColumn) {
            case "Id":
            case "Total":
                if (numericOperators.indexOf(newOperator as any) === -1) newOperator = "equals";
                break;
            case "SourceAccountId":
            case "DestinationAccountId":
                if (accountOperators.indexOf(newOperator as any) === -1) newOperator = "equals";
                break;
            case "DateTime":
                if (dateTimeOperators.indexOf(newOperator as any) === -1) newOperator = "equals";
                break;
            case "Category":
            case "Identifier":
            case "Description":
                if (stringOperators.indexOf(newOperator as any) === -1) newOperator = "equals";
                break;
        }

        let value = props.query.value;
        if (getValueType(props.query.column as ConditionModel['column'], getOperatorString(props.query)) !== getValueType(newColumn, newOperator)) {
            switch (newColumn) {
                case "Id":
                    value = 0;
                    break;
                case "Total":
                    value = new Decimal(0);
                    break;
                case "Category":
                case "Description":
                case "Identifier":
                    value = "";
                    break;
                case "SourceAccountId":
                case "DestinationAccountId":
                    value = null;
                    break;
                case "DateTime":
                    value = DateTime.now();
                    break;
            }
        }

        props.setQuery({
            ...props.query,
            column: newColumn,
            operator: getOperator(newOperator),
            not: getOperatorNegation(newOperator),
            value: value
        });
    }
}

function getValueType(column: ConditionModel['column'], operator: ConditionModel['operator']): ConditionModel['valueType'] {
    switch (column) {
        case "Id":
            return "number";
        case "Total":
            return "decimal";
        case "Category":
        case "Description":
        case "Identifier":
            return "string";
        case "SourceAccountId":
        case "DestinationAccountId":
            return "account";
        case "DateTime":
            return "datetime";
    }
}

function ConditionValueEditor(props: {condition: ConditionModel}) {
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
                onChange: (account: Account) => (props.condition.onChange as (id: number) => void)(account?.id ?? null)
            }} />;
    }
}

function ConditionValueEditorNumeric(props: { condition: ConditionModel }) {
    switch (props.condition.operator) {
        case "equals":
        case "not-equals":
        case "greater-than":
        case "greater-than-or-equal":
        case "less-than":
        case "less-than-or-equal":
            if (props.condition.column === "Id") {
                let condition = props.condition;
                return <InputNumber
                    value={new Decimal(props.condition.value)}
                    onChange={e => condition.onChange(e.target.valueAsNumber)} />
            } else if (props.condition.column === "Total") {
                let condition = props.condition;
                return <InputNumber
                    value={props.condition.value}
                    onChange={e => condition.onChange(new Decimal(e.target.valueAsNumber))} />
            }
    }
}

function ConditionValueEditorText(props: { condition: ConditionModel }) {
    switch (props.condition.column) {
        case "Category":
        case "Identifier":
        case "Description":
            break;
        default:
            throw "Invalid column";
    }

    let condition = props.condition;
    switch (props.condition.operator) {
        case "equals":
        case "not-equals":
        case "in":
        case "not-in":
        case "contains":
        case "not-contains":
            return <InputText value={condition.value} onChange={e => condition.onChange(e.target.value)} />
    }
}

function ConditionValueEditorAccount(props: { condition: ConditionModel }) {
    switch (props.condition.column) {
        case "SourceAccountId":
        case "DestinationAccountId":
            break;
        default:
            throw "Invalid column";
    }

    let condition = props.condition;
    switch (props.condition.operator) {
        case "equals":
        case "not-equals":
        case "in":
        case "not-in":
            return <InputAccount
                value={condition.value}
                onChange={account => condition.onChange(account)}
                nullSelectedText="No Account"
                disabled={false}
                allowNull={true} />
    }
}