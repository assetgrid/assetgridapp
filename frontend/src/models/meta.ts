import Decimal from "decimal.js";
import { Account } from "./account";
import { Transaction } from "./transaction";

export interface MetaField {
    id: number
    name: string
    description: string
    type: 0
    valueType: FieldValueType
    permissions: FieldPermissions
}

export interface MetaFieldValue {
    metaId: number
    metaName: string
    type: FieldValueType
    value: string | Decimal | boolean | Account | Transaction | null
}
export function deserializeMetaField<T extends MetaFieldValue | SetMetaFieldValue> (field: T): T {
    if ("type" in field && field.type === FieldValueType.Number && field.value !== null) {
        field.value = new Decimal(field.value as string).div(new Decimal(10000));
    }
    return field;
}

export interface SetMetaFieldValue {
    metaId: number
    type: FieldValueType
    value: string | Decimal | boolean | Account | Transaction | null
}
export function serializeSetMetaFieldValue (field: SetMetaFieldValue): SetMetaFieldValue {
    if (field.value !== null) {
        switch (field.type) {
            case FieldValueType.Number:
                field.value = (field.value as Decimal).mul(new Decimal(10000)).round().toString();
                break;
            case FieldValueType.Account:
                field.value = (field.value as Account).id as any;
                break;
        }
    }
    return field;
}

export interface CreateMetaField {
    name: string
    description: string
    type: 0
    valueType: FieldValueType
}

export enum FieldValueType {
    TextLine,
    TextLong,
    Transaction,
    Account,
    Attachment,
    Boolean,
    Number
}

export enum FieldPermissions {
    User,
    Owner
}
