import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import Decimal from "decimal.js";
import { DateTime } from "luxon";
import * as React from "react";
import {
    ActionDelete,
    ActionSetAccount,
    ActionSetAmount, ActionSetCategory, ActionSetDescription, ActionSetLines, ActionSetTimestmap, TransactionAction
} from "../../../models/automation/transactionAutomation";
import { TransactionLine } from "../../../models/transaction";
import InputAccount from "../../account/input/InputAccount";
import InputButton from "../../input/InputButton";
import InputCategory from "../../input/InputCategory";
import InputDateTime from "../../input/InputDateTime";
import InputIconButton from "../../input/InputIconButton";
import InputNumber from "../../input/InputNumber";
import InputSelect from "../../input/InputSelect";
import InputText from "../../input/InputText";

const actions: Array<{ key: TransactionAction["key"], value: string }> = [
    { key: "set-timestamp", value: "Set timestamp" },
    { key: "set-description", value: "Set description" },
    { key: "set-amount", value: "Set amount" },
    { key: "set-lines", value: "Set lines" },
    { key: "set-account", value: "Set account" },
    { key: "set-category", value: "Set category" },
    { key: "delete", value: "Delete" }
];

interface Props<T> {
    action: T
    onChange: (action: TransactionAction) => void
    disabled: boolean
}
export default function TransactionActionEditor (props: Props<TransactionAction>): React.ReactElement {
    switch (props.action.key) {
        case "set-description":
            return <SetDescriptionEditor {...props} action={props.action} onChange={onChange} />;
        case "set-timestamp":
            return <SetTimestampEditor {...props} action={props.action} onChange={onChange} />;
        case "set-amount":
            return <SetAmountEditor {...props} action={props.action} onChange={onChange} />;
        case "set-lines":
            return <SetLinesEditor {...props} action={props.action} onChange={onChange} />;
        case "set-account":
            return <SetAccountEditor {...props} action={props.action} onChange={onChange} />;
        case "set-category":
            return <SetCategoryEditor {...props} action={props.action} onChange={onChange} />;
        case "delete":
            return <DeleteEditor {...props} action={props.action} onChange={onChange} />;
    }

    function onChange (newAction: TransactionAction): void {
        if (newAction.key !== props.action.key) {
            let action: TransactionAction;
            switch (newAction.key) {
                case "delete":
                    action = { key: "delete" };
                    break;
                case "set-amount":
                    action = { key: "set-amount", value: new Decimal(0) };
                    break;
                case "set-description":
                case "set-category":
                    action = { key: newAction.key, value: "" };
                    break;
                case "set-account":
                    action = { key: newAction.key, value: null, account: "source" };
                    break;
                case "set-timestamp":
                    action = { key: "set-timestamp", value: DateTime.now() };
                    break;
                case "set-lines":
                    action = { key: "set-lines", value: [] };
                    break;
            }
            props.onChange(action);
            return;
        }
        props.onChange(newAction);
    }
}

function DefaultEditorLayout (props: { children?: React.ReactNode, helpText?: string } & Props<TransactionAction>): React.ReactElement {
    return <div className="columns">
        <div className="column">
            <InputSelect
                disabled={props.disabled}
                label="Action"
                items={[...actions]}
                value={props.action.key}
                onChange={value => props.onChange({ ...props.action, key: value } as any as TransactionAction)} />
            {props.helpText !== undefined && <div className="help">{props.helpText}</div>}
        </div>
        <div className="column">{props.children}</div>
    </div>;
}

function SetDescriptionEditor (props: Props<ActionSetDescription>): React.ReactElement {
    return <DefaultEditorLayout {...props}>
        <InputText label="Enter description"
            disabled={props.disabled}
            value={props.action.value}
            onChange={e => props.onChange({ ...props.action, value: e.target.value })} />
    </DefaultEditorLayout>;
}

function SetTimestampEditor (props: Props<ActionSetTimestmap>): React.ReactElement {
    return <DefaultEditorLayout {...props}>
        <InputDateTime label="Select timestamp"
            disabled={props.disabled}
            fullwidth={false}
            value={props.action.value}
            onChange={value => props.onChange({ ...props.action, value })} />
    </DefaultEditorLayout>;
}

function SetAmountEditor (props: Props<ActionSetAmount>): React.ReactElement {
    return <DefaultEditorLayout {...props} helpText="Will not affect split transactions">
        <InputNumber label="Enter amount"
            value={props.action.value}
            onChange={value => props.onChange({ ...props.action, value })}
            disabled={props.disabled}
            allowNull={false} />
    </DefaultEditorLayout>;
}

function SetCategoryEditor (props: Props<ActionSetCategory>): React.ReactElement {
    return <DefaultEditorLayout {...props}>
        <InputCategory label="Enter category"
            value={props.action.value}
            onChange={value => props.onChange({ ...props.action, value })}
            disabled={props.disabled} />
    </DefaultEditorLayout>;
}

function SetAccountEditor (props: Props<ActionSetAccount>): React.ReactElement {
    const accountTypes = [{ key: "source", value: "Source" }, { key: "destination", value: "Destination" }];
    return <DefaultEditorLayout {...props}>
        <InputSelect
            items={accountTypes}
            value={props.action.account}
            isFullwidth={true}
            label="Source or destination"
            onChange={value => props.onChange({ ...props.action, account: value as "source" | "destination" })} />
        <InputAccount label="Select account"
            value={props.action.value}
            onChange={value => props.onChange({ ...props.action, value })}
            disabled={props.disabled}
            allowNull={true}
            allowCreateNewAccount={true} />
    </DefaultEditorLayout>;
}

function DeleteEditor (props: Props<ActionDelete>): React.ReactElement {
    return <DefaultEditorLayout {...props} />;
}

function SetLinesEditor (props: Props<ActionSetLines>): React.ReactElement {
    const actionSelect = <InputSelect
        disabled={props.disabled}
        label="Action"
        items={[...actions]}
        value={props.action.key}
        onChange={value => props.onChange({ ...props.action, key: value } as any as TransactionAction)} />;

    if (props.action.value.length === 0) {
        return <div>
            {actionSelect}
            <p>No lines have been added. This will turn split transactions into non-split transactions with same total and the category of the first line.</p>
            <p>To set the total, you can use the &ldquo;Set amount&rdquo; action on the same transactions after removing the lines.</p>
            <div className="buttons mb-3 mt-1">
                <InputButton onClick={() => onChange([{ description: "Transaction line", amount: new Decimal(0), category: "" }])}>
                    Add lines
                </InputButton>
            </div>
        </div>;
    }

    return <>
        {actionSelect}
        <table className="table is-fullwidth">
            <thead>
                <tr>
                    <th>Description</th>
                    <th className="has-text-right">Amount</th>
                    <th>Category</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {props.action.value.map((line, i) => <tr key={i}>
                    <td>
                        <InputText value={line.description}
                            onChange={e => onChange([
                                ...props.action.value.slice(0, i),
                                { ...line, description: e.target.value },
                                ...props.action.value.slice(i + 1)])}
                            disabled={props.disabled}
                        />
                    </td>
                    <td className="has-text-right">
                        <InputNumber value={line.amount}
                            onChange={value => onChange([
                                ...props.action.value.slice(0, i),
                                { ...line, amount: value },
                                ...props.action.value.slice(i + 1)])}
                            allowNull={false}
                            disabled={props.disabled}
                        />
                    </td>
                    <td>
                        <InputCategory value={line.category}
                            onChange={value => onChange([
                                ...props.action.value.slice(0, i),
                                { ...line, category: value },
                                ...props.action.value.slice(i + 1)])}
                            disabled={props.disabled}
                        />
                    </td>
                    <td style={{ verticalAlign: "middle" }}>
                        <InputIconButton icon={faTrashCan} onClick={() => onChange(props.action.value.filter((_, index) => index !== i))} />
                    </td>
                </tr>)}
            </tbody>
        </table>
        <div className="buttons">
            <InputButton disabled={props.disabled}
                onClick={() => onChange([
                    ...props.action.value,
                    {
                        description: "Transaction line",
                        amount: new Decimal(0),
                        category: ""
                    }
                ])}>
                Add line
            </InputButton>
        </div>
    </>;

    function onChange (lines: TransactionLine[]): void {
        props.onChange({
            ...props.action,
            value: lines
        });
    }
}
