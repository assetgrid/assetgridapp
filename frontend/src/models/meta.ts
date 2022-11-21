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
    value: string | Decimal | boolean | Account | Transaction | null | { name: string, file?: File }
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
    value: MetaFieldValue["value"]
}
export function serializeSetMetaFieldValue (field: SetMetaFieldValue): SetMetaFieldValue {
    field = { ...field };
    if (field.value !== null) {
        switch (field.type) {
            case FieldValueType.Number:
                field.value = (field.value as Decimal).mul(new Decimal(10000)).round().toString();
                break;
            case FieldValueType.Account:
                field.value = (field.value as Account).id as any;
                break;
            case FieldValueType.Transaction:
                field.value = (field.value as Transaction).id as any;
                break;
            case FieldValueType.Attachment:
                // Attachments are uploaded using a separate call, so non-null values are simply set to truee
                if (field.value !== null) {
                    field.value = true;
                }
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
