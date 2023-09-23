import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import Decimal from "decimal.js";
import { DateTime } from "luxon";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { TransactionAction } from "../../../models/automation/transactionAutomation";
import InputIconButton from "../../input/InputIconButton";
import InputSelect from "../../input/InputSelect";
import { TFunction } from "i18next";
import { SetMetaValueEditor } from "./SetMetaValueEditor";
import { SetDescriptionEditor } from "./SetDescriptionEditor";
import { SetTimestampEditor } from "./SetTimestampEditor";
import { SetAmountEditor } from "./SetAmountEditor";
import { SetCategoryEditor } from "./SetCategoryEditor";
import { DeleteEditor } from "./DeleteEditor";
import { SetAccountEditor } from "./SetAccountEditor";
import { SetLinesEditor } from "./SetLinesEditor";

export interface TransactionActionEditorProps<T> {
    action: T
    onChange: (action: TransactionAction) => void
    disabled: boolean
    delete?: () => void
}

export default function TransactionActionEditor (props: TransactionActionEditorProps<TransactionAction>): React.ReactElement {
    switch (props.action.key) {
        case "set-description":
            return <SetDescriptionEditor {...props} action={props.action} onChange={props.onChange} />;
        case "set-timestamp":
            return <SetTimestampEditor {...props} action={props.action} onChange={props.onChange} />;
        case "set-amount":
            return <SetAmountEditor {...props} action={props.action} onChange={props.onChange} />;
        case "set-lines":
            return <SetLinesEditor {...props} action={props.action} onChange={props.onChange} />;
        case "set-account":
            return <SetAccountEditor {...props} action={props.action} onChange={props.onChange} />;
        case "set-category":
            return <SetCategoryEditor {...props} action={props.action} onChange={props.onChange} />;
        case "set-meta-value":
            return <SetMetaValueEditor {...props} action={props.action} onChange={props.onChange} />;
        case "delete":
            return <DeleteEditor {...props} action={props.action} onChange={props.onChange} />;
    }
}

/**
 * Returns a list of all actions types, their keys and their translated descriptions
 * @param t A translation function
 */
export function GetActions (t: TFunction<"translation", undefined>): Array<{ key: TransactionAction["key"], value: string }> {
    return [
        { key: "set-timestamp", value: t("transaction.set_timestamp") },
        { key: "set-description", value: t("transaction.set_description") },
        { key: "set-amount", value: t("transaction.set_total") },
        { key: "set-lines", value: t("transaction.set_lines") },
        { key: "set-account", value: t("transaction.set_account") },
        { key: "set-category", value: t("transaction.set_category") },
        { key: "set-meta-value", value: t("transaction.set_meta_value") },
        { key: "delete", value: t("common.delete") }
    ];
}

/**
 * Returns a default transaction for the specified transaction key
 */
export function GetDefaultAction (key: ReturnType<typeof GetActions>[number]["key"]): TransactionAction {
    switch (key) {
        case "delete":
            return { key: "delete" };
        case "set-amount":
            return { key: "set-amount", value: new Decimal(0) };
        case "set-description":
        case "set-category":
            return { key, value: "" };
        case "set-account":
            return { key, value: null, account: "source" };
        case "set-timestamp":
            return { key: "set-timestamp", value: DateTime.now() };
        case "set-lines":
            return { key: "set-lines", value: [] };
        case "set-meta-value":
            return { key: "set-meta-value", fieldId: null, value: null };
    }
}

export function DefaultTransactionEditorLayout (
    props: { children?: React.ReactNode, description: string } & TransactionActionEditorProps<TransactionAction>
): React.ReactElement {
    const { t } = useTranslation();
    const actions = GetActions(t);

    return <div className="filter-group">
        <div className="filter-group--header">
            <InputSelect
                isSmall={true}
                disabled={props.disabled}
                items={[...actions]}
                value={props.action.key}
                onChange={onChange} />
            {props.description}
            {props.delete !== undefined && <InputIconButton className="btn-delete" icon={faTrashCan} onClick={() => props.delete!()} />}
        </div>

        <div className="filter-group--children">
            {props.children}
        </div>
    </div>;

    function onChange (newKey: typeof actions[number]["key"]): void {
        if (newKey === props.action.key) return;
        props.onChange(GetDefaultAction(newKey));
    }
}
