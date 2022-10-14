import Decimal from "decimal.js";
import { DateTime } from "luxon";
import { Account } from "../account";
import { SearchGroup, serializeTransactionQuery } from "../search";
import { TransactionLine } from "../transaction";

export interface TransactionAutomation {
    triggers: TransactionAutomationTrigger
    query: SearchGroup
    actions: TransactionAction[]
}

export function serializeTransactionAutomation (value: TransactionAutomation): TransactionAutomation {
    return {
        ...value,
        query: serializeTransactionQuery(value.query),
        actions: value.actions.map(action => serializeTransactionAction(action))
    };
}

export enum TransactionAutomationTrigger {
    None,
    Create = 1 << 1,
    Modify = 1 << 2,
}

export type TransactionAction = ActionSetTimestmap | ActionSetDescription | ActionSetAmount | ActionSetLines
| ActionSetSource | ActionSetDestination | ActionSetCategory | ActionDelete;

export interface ActionSetTimestmap {
    key: "set-timestamp"
    value: DateTime
}

export interface ActionSetDescription {
    key: "set-description"
    value: string
}

export interface ActionSetAmount {
    key: "set-amount"
    value: Decimal
}

export interface ActionSetLines {
    key: "set-lines"
    value: TransactionLine[]
}

export interface ActionSetSource {
    key: "set-source"
    value: Account | null
}

export interface ActionSetDestination {
    key: "set-destination"
    value: Account | null
}

export interface ActionSetCategory {
    key: "set-category"
    value: string
}

export interface ActionDelete {
    key: "delete"
}

export function serializeTransactionAction (action: TransactionAction): TransactionAction {
    switch (action.key) {
        case "set-amount": {
            const { value, ...rest } = action;
            return { ...rest, valueString: value.times(10000).toString() } as any as TransactionAction;
        }
        case "set-source":
        case "set-destination":
            return { ...action, value: action.value === null ? null : action.value.id } as any as TransactionAction;
        case "set-timestamp":
            return { ...action, value: action.value.toISO() } as any as TransactionAction;
        default:
            return action;
    }
}
