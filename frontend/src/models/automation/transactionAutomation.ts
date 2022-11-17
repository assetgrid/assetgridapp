import Decimal from "decimal.js";
import { DateTime } from "luxon";
import { SearchGroup } from "../search";
import { serializeTransactionLine, TransactionLine } from "../transaction";

export interface TransactionAutomation {
    id?: number
    enabled: boolean
    name: string
    description: string
    triggerOnCreate: boolean
    triggerOnModify: boolean
    query: SearchGroup
    actions: TransactionAction[]
    permissions: TransactionAutomationPermissions
}

export interface TransactionAutomationSummary {
    id: number
    enabled: boolean
    name: string
    description: string
    triggerOnCreate: boolean
    triggerOnModify: boolean
    permissions: TransactionAutomationPermissions
}

export enum TransactionAutomationPermissions {
    Read,
    Modify
}

export function serializeTransactionAutomation (value: TransactionAutomation): TransactionAutomation {
    return {
        ...value,
        query: value.query,
        actions: value.actions.map(action => serializeTransactionAction(action))
    };
}

export enum TransactionAutomationTrigger {
    None,
    Create = 1 << 1,
    Modify = 1 << 2,
}

export type TransactionAction = ActionSetTimestmap | ActionSetDescription | ActionSetAmount | ActionSetLines
| ActionSetAccount | ActionSetCategory | ActionDelete;

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

export interface ActionSetAccount {
    key: "set-account"
    value: number | null
    account: "source" | "destination"
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
        case "set-timestamp":
            return { ...action, value: action.value.toISO() } as any as TransactionAction;
        case "set-lines":
            return { ...action, value: action.value.map(serializeTransactionLine) } as any as TransactionAction;
        default:
            return action;
    }
}
